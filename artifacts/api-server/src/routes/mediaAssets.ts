import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, mediaAssetsTable } from "@workspace/db";

const router: IRouter = Router();

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
