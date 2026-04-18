import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, mediaAssetsTable } from "@workspace/db";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import sharp from "sharp";
import { promises as fs } from "node:fs";
import path from "node:path";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage.js";

const router: IRouter = Router();
const objectStorage = new ObjectStorageService();

const ALLOWED_KINDS = new Set(["image", "video", "document", "other"]);

function cleanString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}

function detectKind(mime: string | null | undefined): string {
  if (!mime) return "other";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "other";
  if (mime === "application/pdf") return "document";
  if (mime.startsWith("text/")) return "document";
  return "other";
}

router.get("/media-assets", async (req, res): Promise<void> => {
  const kind = typeof req.query.kind === "string" ? req.query.kind : undefined;
  const rows = kind
    ? await db.select().from(mediaAssetsTable).where(eq(mediaAssetsTable.kind, kind)).orderBy(desc(mediaAssetsTable.createdAt))
    : await db.select().from(mediaAssetsTable).orderBy(desc(mediaAssetsTable.createdAt));
  res.json(rows);
});

router.post("/media-assets", async (req, res): Promise<void> => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const name = cleanString(body.name);
  const objectPath = cleanString(body.objectPath);
  if (!name || !objectPath) {
    res.status(400).json({ error: "name and objectPath are required" });
    return;
  }
  const mimeType = cleanString(body.mimeType);
  let kind = typeof body.kind === "string" ? body.kind : detectKind(mimeType);
  if (!ALLOWED_KINDS.has(kind)) kind = "other";
  const description = cleanString(body.description);
  const sizeBytes = typeof body.sizeBytes === "number" ? Math.round(body.sizeBytes) : null;
  const tags = Array.isArray(body.tags)
    ? body.tags.filter((t): t is string => typeof t === "string" && t.trim().length > 0).map(t => t.trim())
    : [];

  const [created] = await db
    .insert(mediaAssetsTable)
    .values({ name, description, kind, objectPath, mimeType, sizeBytes, tags })
    .returning();
  res.status(201).json(created);
});

router.patch("/media-assets/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const body = (req.body ?? {}) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  if ("name" in body) {
    const v = cleanString(body.name);
    if (!v) {
      res.status(400).json({ error: "name cannot be empty" });
      return;
    }
    patch.name = v;
  }
  if ("description" in body) patch.description = cleanString(body.description);
  if ("kind" in body && typeof body.kind === "string" && ALLOWED_KINDS.has(body.kind)) patch.kind = body.kind;
  if ("tags" in body && Array.isArray(body.tags)) {
    patch.tags = body.tags.filter((t): t is string => typeof t === "string" && t.trim().length > 0).map(t => t.trim());
  }

  const [updated] = await db
    .update(mediaAssetsTable)
    .set(patch)
    .where(eq(mediaAssetsTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(updated);
});

// Load image bytes for an asset, regardless of where it lives.
async function loadImageBytes(objectPath: string): Promise<{ buffer: Buffer; mime: string }> {
  // Object-storage uploaded files
  if (objectPath.startsWith("/objects/")) {
    const file = await objectStorage.getObjectEntityFile(objectPath);
    const [meta] = await file.getMetadata();
    const [buf] = await file.download();
    return { buffer: buf, mime: (meta.contentType as string) || "image/jpeg" };
  }
  // Static media bundled with the frontend (e.g. seeded /media/...)
  if (objectPath.startsWith("/")) {
    const rel = objectPath.replace(/^\/+/, "");
    const fsPath = path.resolve(process.cwd(), "../virtu-ferries-brand-hub/public", rel);
    const buf = await fs.readFile(fsPath);
    const ext = path.extname(fsPath).slice(1).toLowerCase();
    const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg"
      : ext === "png" ? "image/png"
      : ext === "webp" ? "image/webp"
      : ext === "gif" ? "image/gif"
      : "application/octet-stream";
    return { buffer: buf, mime };
  }
  throw new Error("Unsupported objectPath");
}

const ENRICH_SYSTEM = `You are a media librarian for Virtu Ferries — a premium high-speed catamaran ferry between Malta and Sicily.

Look at the image and return 4-8 concise lowercase tags that would help a marketing team find this asset later. Mix categories where relevant:
- subject (e.g. "ship", "deck", "passenger", "harbour", "sunset", "logo")
- vessel name if visible/identifiable ("saint-john-paul-ii", "jean-de-la-valette")
- location ("malta", "sicily", "valletta", "pozzallo", "grand-harbour", "at-sea")
- mood/usage ("hero", "lifestyle", "editorial", "candid", "wide-shot", "close-up")
- season/time ("summer", "golden-hour", "blue-hour")

Rules:
- Lowercase, kebab-case (use hyphens, not spaces).
- No generic filler like "image", "photo", "background".
- Do not invent a vessel name you cannot clearly read.
- Return ONLY a JSON array of strings. No prose.`;

router.post("/media-assets/:id/enrich-tags", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [asset] = await db.select().from(mediaAssetsTable).where(eq(mediaAssetsTable.id, id));
  if (!asset) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (asset.kind !== "image") {
    res.status(400).json({ error: "Tag enrichment is only supported for images right now." });
    return;
  }

  try {
    const { buffer } = await loadImageBytes(asset.objectPath);

    // Downscale + re-encode to keep the vision payload small and predictable.
    const compact = await sharp(buffer)
      .rotate()
      .resize({ width: 1024, withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 400,
      system: ENRICH_SYSTEM,
      messages: [{
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: "image/jpeg", data: compact.toString("base64") },
          },
          {
            type: "text",
            text: `Asset name: ${asset.name}\n${asset.description ? `Description: ${asset.description}\n` : ""}Existing tags: ${asset.tags.join(", ") || "(none)"}\n\nReturn a JSON array of suggested tags.`,
          },
        ],
      }],
    });

    const text = response.content
      .filter((b): b is { type: "text"; text: string } => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    // Be forgiving — pull the first JSON array out of the response.
    const match = text.match(/\[[\s\S]*?\]/);
    let suggested: string[] = [];
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed)) {
          suggested = parsed
            .filter((t): t is string => typeof t === "string")
            .map((t) => t.trim().toLowerCase().replace(/\s+/g, "-"))
            .filter((t) => t.length > 0 && t.length <= 40);
        }
      } catch { /* fall through */ }
    }

    if (suggested.length === 0) {
      res.status(502).json({ error: "Could not parse suggestions from the model." });
      return;
    }

    // Merge into existing tags (dedupe, preserve order).
    const seen = new Set<string>();
    const merged: string[] = [];
    for (const t of [...asset.tags, ...suggested]) {
      if (seen.has(t)) continue;
      seen.add(t);
      merged.push(t);
    }
    const added = merged.filter((t) => !asset.tags.includes(t));

    const [updated] = await db
      .update(mediaAssetsTable)
      .set({ tags: merged })
      .where(eq(mediaAssetsTable.id, id))
      .returning();

    res.json({ asset: updated, suggested, added });
  } catch (err) {
    if (err instanceof ObjectNotFoundError) {
      res.status(404).json({ error: "Underlying file not found" });
      return;
    }
    console.error("enrich-tags failed", err);
    res.status(500).json({ error: "Tag enrichment failed" });
  }
});

router.delete("/media-assets/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [deleted] = await db.delete(mediaAssetsTable).where(eq(mediaAssetsTable.id, id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
