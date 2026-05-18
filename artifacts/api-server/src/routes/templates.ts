import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, brandTemplatesTable } from "@workspace/db";

const router: IRouter = Router();

const ALLOWED_KINDS = new Set(["image", "video"]);

function cleanString(v: unknown, maxLen = 2000): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t) return null;
  return t.slice(0, maxLen);
}

function detectKind(media_url: string): "image" | "video" {
  if (/\.(mp4|webm|mov|m4v)(\?|$)/i.test(media_url)) return "video";
  return "image";
}

// Only allow safe schemes for user-supplied links — blocks `javascript:`,
// `data:`, `vbscript:`, etc. from being rendered into <a href>.
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

// media_url is either an object-storage path (`/objects/...`) or an http(s) URL.
function safeMediaUrl(v: string | null): string | null {
  if (!v) return null;
  if (v.startsWith("/objects/") || v.startsWith("/api/storage/")) return v;
  return safeExternalUrl(v);
}

router.get("/templates", async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(brandTemplatesTable)
    .where(eq(brandTemplatesTable.brand_id, req.brandId))
    .orderBy(desc(brandTemplatesTable.created_at));
  res.json(rows);
});

router.post("/templates", async (req, res): Promise<void> => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const title = cleanString(body.title, 200);
  const media_url = safeMediaUrl(cleanString(body.media_url, 1000));
  if (!title || !media_url) {
    res.status(400).json({ error: "title and a valid media_url are required" });
    return;
  }
  const description = cleanString(body.description, 2000);
  const rawTemplate = cleanString(body.template_url, 1000);
  if (rawTemplate && !safeExternalUrl(rawTemplate)) {
    res.status(400).json({ error: "template_url must be a http(s) URL" });
    return;
  }
  const template_url = safeExternalUrl(rawTemplate);
  let media_kind = typeof body.media_kind === "string" ? body.media_kind : detectKind(media_url);
  if (!ALLOWED_KINDS.has(media_kind)) media_kind = detectKind(media_url);

  const [created] = await db
    .insert(brandTemplatesTable)
    .values({ brand_id: req.brandId, title, description, media_url, media_kind, template_url })
    .returning();
  res.status(201).json(created);
});

router.patch("/templates/:id", async (req, res): Promise<void> => {
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
  if ("template_url" in body) {
    const raw = cleanString(body.template_url, 1000);
    if (raw && !safeExternalUrl(raw)) {
      res.status(400).json({ error: "template_url must be a http(s) URL" });
      return;
    }
    patch.template_url = safeExternalUrl(raw);
  }
  if ("media_url" in body) {
    const v = safeMediaUrl(cleanString(body.media_url, 1000));
    if (!v) {
      res.status(400).json({ error: "media_url must be a valid object path or http(s) URL" });
      return;
    }
    patch.media_url = v;
    patch.media_kind = detectKind(v);
  }

  const [updated] = await db
    .update(brandTemplatesTable)
    .set(patch)
    .where(and(eq(brandTemplatesTable.id, id), eq(brandTemplatesTable.brand_id, req.brandId)))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(updated);
});

router.delete("/templates/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db
    .delete(brandTemplatesTable)
    .where(and(eq(brandTemplatesTable.id, id), eq(brandTemplatesTable.brand_id, req.brandId)));
  res.status(204).end();
});

export default router;
