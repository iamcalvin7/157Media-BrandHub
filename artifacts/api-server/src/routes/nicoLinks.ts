import { Router, type IRouter } from "express";
import { eq, desc, sql, ilike } from "drizzle-orm";
import { db, nicoLinksTable, contentPostsTable, brandsTable } from "@workspace/db";

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

router.get("/nico-links", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(nicoLinksTable)
    .orderBy(desc(nicoLinksTable.date), desc(nicoLinksTable.createdAt));
  res.json(rows);
});

router.post("/nico-links", async (req, res): Promise<void> => {
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

router.patch("/nico-links/:id", async (req, res): Promise<void> => {
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

router.delete("/nico-links/:id", async (req, res): Promise<void> => {
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
router.get("/nico-posts", async (_req, res): Promise<void> => {
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
    })
    .from(contentPostsTable)
    .leftJoin(brandsTable, eq(brandsTable.id, contentPostsTable.brand_id))
    .where(ilike(contentPostsTable.assigned_to, "Nico Bazan"))
    .orderBy(sql`${contentPostsTable.scheduled_date} ASC NULLS LAST`, desc(contentPostsTable.id));
  res.json(rows);
});

export { COMMON_KINDS };
export default router;
