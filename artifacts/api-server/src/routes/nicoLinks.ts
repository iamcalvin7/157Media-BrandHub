import { Router, type IRouter } from "express";
import { requireSession } from "../middlewares/requireBrandAccess.js";
import { eq, desc, sql, ilike, and, ne } from "drizzle-orm";
import { db, nicoLinksTable, contentPostsTable, brandsTable, marketingRequestsTable } from "@workspace/db";
import { ObjectStorageService } from "../lib/objectStorage.js";

const router: IRouter = Router();

// Open-ended on purpose — Nico can drop anything; the dropdown in the UI is
// the canonical list but we don't reject unknown kinds in case he types one.
const COMMON_KINDS = ["video", "voiceover", "image", "audio", "other"] as const;

// Nico's drop-zone is hub-level (lives outside any single brand on the welcome
// page), so reads/writes are intentionally NOT brand-scoped. The brand_id
// column on the row is kept for legacy data; new inserts default to 1.
function cleanString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}

function cleanDate(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
  return t;
}

router.get("/nico-links", requireSession, async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(nicoLinksTable)
    .orderBy(desc(nicoLinksTable.date), desc(nicoLinksTable.createdAt));
  res.json(rows);
});

router.post("/nico-links", requireSession, async (req, res): Promise<void> => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const kind = cleanString(body.kind) ?? "video";
  const url = cleanString(body.url);
  if (!url) {
    res.status(400).json({ error: "URL is required" });
    return;
  }
  const [created] = await db
    .insert(nicoLinksTable)
    .values({
      brand_id: 1,
      kind,
      name: cleanString(body.name),
      url,
      date: cleanDate(body.date),
      notes: cleanString(body.notes),
    })
    .returning();
  res.status(201).json(created);
});

router.patch("/nico-links/:id", requireSession, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const body = (req.body ?? {}) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  if ("kind" in body) {
    const k = cleanString(body.kind);
    if (k) patch.kind = k;
  }
  if ("url" in body) {
    const u = cleanString(body.url);
    if (u) patch.url = u;
  }
  if ("name" in body) patch.name = cleanString(body.name);
  if ("date" in body) patch.date = cleanDate(body.date);
  if ("notes" in body) patch.notes = cleanString(body.notes);

  if (Object.keys(patch).length === 0) {
    res.status(400).json({ error: "Nothing to update" });
    return;
  }

  const [updated] = await db
    .update(nicoLinksTable)
    .set(patch)
    .where(eq(nicoLinksTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(updated);
});

router.delete("/nico-links/:id", requireSession, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [deleted] = await db
    .delete(nicoLinksTable)
    .where(eq(nicoLinksTable.id, id))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.sendStatus(204);
});

// Cross-brand list of every content post assigned to Nico Bazan. Lightweight
// shape — just what the Nico page needs to show a small card per post.
router.get("/nico-posts", requireSession, async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: contentPostsTable.id,
      brand_id: contentPostsTable.brand_id,
      brand_name: brandsTable.name,
      brand_slug: brandsTable.slug,
      brand_primary_color: brandsTable.primaryColor,
      title: contentPostsTable.title,
      caption: contentPostsTable.caption,
      visual_direction: contentPostsTable.visual_direction,
      platform: contentPostsTable.platform,
      pillar: contentPostsTable.pillar,
      format: contentPostsTable.format,
      market: contentPostsTable.market,
      status: contentPostsTable.status,
      creative_status: contentPostsTable.creative_status,
      scheduled_date: contentPostsTable.scheduled_date,
      scheduled_time: contentPostsTable.scheduled_time,
      assigned_to: contentPostsTable.assigned_to,
      notes: contentPostsTable.notes,
      drive_url: contentPostsTable.drive_url,
      media_url: contentPostsTable.media_url,
      link_url: contentPostsTable.link_url,
      visual_reference_url: contentPostsTable.visual_reference_url,
      ig_format: contentPostsTable.ig_format,
      cross_post: contentPostsTable.cross_post,
      deliverable_urls: contentPostsTable.deliverable_urls,
    })
    .from(contentPostsTable)
    .leftJoin(brandsTable, eq(brandsTable.id, contentPostsTable.brand_id))
    .where(and(
      ilike(contentPostsTable.assigned_to, "Nico Bazan"),
      ne(contentPostsTable.creative_status, "Delivered"),
    ))
    .orderBy(sql`${contentPostsTable.scheduled_date} ASC NULLS LAST`, desc(contentPostsTable.id));
  res.json(rows);
});

// Hub-level presigned upload URL for Nico's deliverable uploads.
// Uses requireSession (not brand-scoped) so Nico can upload from his hub page.
router.post("/nico-posts/upload-url", requireSession, async (req, res): Promise<void> => {
  const { name, size, contentType } = req.body as { name?: string; size?: number; contentType?: string };
  if (!name || !contentType) {
    res.status(400).json({ error: "name and contentType are required" });
    return;
  }
  const MAX_BYTES = 200 * 1024 * 1024; // 200 MB cap
  if (typeof size === "number" && Number.isFinite(size) && size > 0 && size > MAX_BYTES) {
    res.status(413).json({ error: "File too large — max 200 MB." });
    return;
  }
  try {
    const svc = new ObjectStorageService();
    const uploadURL = await svc.getObjectEntityUploadURL(name);
    const objectPath = svc.normalizeObjectEntityPath(uploadURL);
    res.json({ uploadURL, objectPath, metadata: { name, size, contentType } });
  } catch (err) {
    console.error("nico upload-url error", err);
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

// Append delivered file paths to a post's deliverable_urls array.
router.patch("/nico-posts/:id/deliverables", requireSession, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { deliverable_urls } = req.body as { deliverable_urls?: string[] };
  if (!Array.isArray(deliverable_urls) || !deliverable_urls.every((v) => typeof v === "string")) {
    res.status(400).json({ error: "deliverable_urls must be an array of strings" });
    return;
  }
  const [updated] = await db
    .update(contentPostsTable)
    .set({ deliverable_urls: deliverable_urls.filter(Boolean) })
    .where(eq(contentPostsTable.id, id))
    .returning({ id: contentPostsTable.id, deliverable_urls: contentPostsTable.deliverable_urls });
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

// Mark a content post as Delivered — removes it from Nico's list on next load.
router.patch("/nico-posts/:id/mark-delivered", requireSession, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [updated] = await db
    .update(contentPostsTable)
    .set({ creative_status: "Delivered" })
    .where(eq(contentPostsTable.id, id))
    .returning({ id: contentPostsTable.id });
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

// Cross-brand list of every marketing request assigned to Nico Bazan.
router.get("/nico-marketing-requests", requireSession, async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: marketingRequestsTable.id,
      brand_id: marketingRequestsTable.brand_id,
      brand_name: brandsTable.name,
      brand_slug: brandsTable.slug,
      name: marketingRequestsTable.name,
      request_type: marketingRequestsTable.request_type,
      sizes: marketingRequestsTable.sizes,
      designer: marketingRequestsTable.designer,
      deadline: marketingRequestsTable.deadline,
      market: marketingRequestsTable.market,
      status: marketingRequestsTable.status,
      notes: marketingRequestsTable.notes,
      drive_url: marketingRequestsTable.drive_url,
      created_at: marketingRequestsTable.created_at,
    })
    .from(marketingRequestsTable)
    .leftJoin(brandsTable, eq(brandsTable.id, marketingRequestsTable.brand_id))
    .where(ilike(marketingRequestsTable.designer, "Nico Bazan"))
    .orderBy(sql`${marketingRequestsTable.deadline} ASC NULLS LAST`, desc(marketingRequestsTable.id));
  res.json(rows);
});

export { COMMON_KINDS };
export default router;
