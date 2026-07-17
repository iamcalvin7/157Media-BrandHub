import { Router, type IRouter } from "express";
import { requireBrandAccess } from "../middlewares/requireBrandAccess.js";
import { and, desc, eq } from "drizzle-orm";
import { db, brandPrintsTable } from "@workspace/db";

const router: IRouter = Router();

const ALLOWED_KINDS = new Set(["image", "pdf"]);

function cleanString(v: unknown, maxLen = 2000): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t) return null;
  return t.slice(0, maxLen);
}

function detectKind(media_url: string): "image" | "pdf" {
  if (/\.pdf(\?|$)/i.test(media_url)) return "pdf";
  return "image";
}

function safeExternalUrl(v: string | null): string | null {
  if (!v) return null;
  try {
    const u = new URL(v);
    if (u.protocol === "http:" || u.protocol === "https:") return u.toString();
  } catch {
    /* not a parseable URL */
  }
  return null;
}

function safeMediaUrl(v: string | null): string | null {
  if (!v) return null;
  if (v.startsWith("/objects/") || v.startsWith("/api/storage/")) return v;
  return safeExternalUrl(v);
}

interface PrintFile { url: string; kind: string; label: string }
interface PrintLink { url: string; label: string }

function validateFiles(v: unknown): PrintFile[] | null {
  if (!Array.isArray(v)) return null;
  const result: PrintFile[] = [];
  for (const item of v) {
    if (typeof item !== "object" || item === null) continue;
    const url = safeMediaUrl(cleanString((item as Record<string, unknown>).url, 1000));
    if (!url) continue;
    const rawKind = cleanString((item as Record<string, unknown>).kind, 10) ?? "image";
    const kind = ALLOWED_KINDS.has(rawKind) ? rawKind : detectKind(url);
    const label = cleanString((item as Record<string, unknown>).label, 200) ?? "";
    result.push({ url, kind, label });
  }
  return result;
}

function validateLinks(v: unknown): PrintLink[] | null {
  if (!Array.isArray(v)) return null;
  const result: PrintLink[] = [];
  for (const item of v) {
    if (typeof item !== "object" || item === null) continue;
    const url = safeExternalUrl(cleanString((item as Record<string, unknown>).url, 1000));
    if (!url) continue;
    const label = cleanString((item as Record<string, unknown>).label, 200) ?? "Link";
    result.push({ url, label });
  }
  return result;
}

router.get("/prints", requireBrandAccess('viewer'), async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(brandPrintsTable)
    .where(eq(brandPrintsTable.brand_id, req.brandId))
    .orderBy(desc(brandPrintsTable.created_at));
  res.json(rows);
});

router.post("/prints", requireBrandAccess('editor'), async (req, res): Promise<void> => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const title = cleanString(body.title, 200);
  if (!title) {
    res.status(400).json({ error: "title is required" });
    return;
  }

  // Multi-file support — require at least one file
  const files = "files" in body ? validateFiles(body.files) : null;
  const links = "links" in body ? validateLinks(body.links) : null;

  // Derive legacy media_url / media_kind from first file, or accept explicit value
  let media_url: string | null = files?.[0]?.url ?? safeMediaUrl(cleanString(body.media_url, 1000));
  if (!media_url) {
    res.status(400).json({ error: "At least one file is required" });
    return;
  }
  let media_kind: string = files?.[0]?.kind ?? (typeof body.media_kind === "string" ? body.media_kind : detectKind(media_url));
  if (!ALLOWED_KINDS.has(media_kind)) media_kind = detectKind(media_url);

  const description = cleanString(body.description, 2000);
  // Legacy drive_url: use first link's url if links provided, else accept explicit field
  const rawDrive = cleanString(body.drive_url, 1000);
  const drive_url = links?.[0]?.url ?? (rawDrive ? safeExternalUrl(rawDrive) : null);
  const print_type = cleanString(body.print_type, 100);
  const thumbnail_url = safeMediaUrl(cleanString(body.thumbnail_url, 1000));

  const [created] = await db
    .insert(brandPrintsTable)
    .values({ brand_id: req.brandId, title, description, media_url, media_kind, drive_url, print_type, thumbnail_url, files, links })
    .returning();
  res.status(201).json(created);
});

router.patch("/prints/:id", requireBrandAccess('editor'), async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const body = (req.body ?? {}) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};

  if ("title" in body) {
    const v = cleanString(body.title, 200);
    if (!v) {
      res.status(400).json({ error: "title cannot be empty" });
      return;
    }
    patch.title = v;
  }
  if ("description" in body) patch.description = cleanString(body.description, 2000);
  if ("print_type" in body) patch.print_type = cleanString(body.print_type, 100);
  if ("thumbnail_url" in body) {
    const v = cleanString(body.thumbnail_url, 1000);
    patch.thumbnail_url = v ? (safeMediaUrl(v) ?? null) : null;
  }

  // Multi-file
  if ("files" in body) {
    const files = validateFiles(body.files);
    if (!files || files.length === 0) {
      res.status(400).json({ error: "At least one file is required" });
      return;
    }
    patch.files = files;
    // Keep legacy columns in sync with first file
    patch.media_url = files[0].url;
    patch.media_kind = files[0].kind;
  } else if ("media_url" in body) {
    const v = safeMediaUrl(cleanString(body.media_url, 1000));
    if (!v) {
      res.status(400).json({ error: "media_url must be a valid object path or http(s) URL" });
      return;
    }
    patch.media_url = v;
    patch.media_kind = detectKind(v);
  }

  // Multi-link
  if ("links" in body) {
    const links = validateLinks(body.links);
    patch.links = links && links.length > 0 ? links : null;
    patch.drive_url = links?.[0]?.url ?? null;
  } else if ("drive_url" in body) {
    const raw = cleanString(body.drive_url, 1000);
    if (raw && !safeExternalUrl(raw)) {
      res.status(400).json({ error: "drive_url must be a http(s) URL" });
      return;
    }
    patch.drive_url = safeExternalUrl(raw);
  }

  const [updated] = await db
    .update(brandPrintsTable)
    .set(patch)
    .where(and(eq(brandPrintsTable.id, id), eq(brandPrintsTable.brand_id, req.brandId)))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(updated);
});

router.delete("/prints/:id", requireBrandAccess('editor'), async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db
    .delete(brandPrintsTable)
    .where(and(eq(brandPrintsTable.id, id), eq(brandPrintsTable.brand_id, req.brandId)));
  res.status(204).end();
});

export default router;
