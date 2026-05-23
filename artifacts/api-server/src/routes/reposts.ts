import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, repostsTable } from "@workspace/db";

const router: IRouter = Router();

// GET /api/reposts
router.get("/reposts", async (req, res): Promise<void> => {
  try {
    const rows = await db
      .select()
      .from(repostsTable)
      .where(eq(repostsTable.brand_id, req.brandId))
      .orderBy(desc(repostsTable.created_at));
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch reposts" });
  }
});

// POST /api/reposts
router.post("/reposts", async (req, res): Promise<void> => {
  const b = (req.body ?? {}) as Record<string, unknown>;
  const clean = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  try {
    const [created] = await db
      .insert(repostsTable)
      .values({
        brand_id: req.brandId,
        platform: (clean(b.platform) ?? "Instagram") as string,
        author_handle: clean(b.author_handle),
        author_name: clean(b.author_name),
        source_url: clean(b.source_url),
        caption: clean(b.caption),
        notes: clean(b.notes),
        market: clean(b.market),
      })
      .returning();
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create repost" });
  }
});

// PATCH /api/reposts/:id
router.patch("/reposts/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const b = (req.body ?? {}) as Record<string, unknown>;
  const clean = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

  const patch: Partial<typeof repostsTable.$inferInsert> = {};
  if (b.platform !== undefined) patch.platform = (clean(b.platform) ?? "Instagram") as string;
  if (b.author_handle !== undefined) patch.author_handle = clean(b.author_handle);
  if (b.author_name !== undefined) patch.author_name = clean(b.author_name);
  if (b.source_url !== undefined) patch.source_url = clean(b.source_url);
  if (b.caption !== undefined) patch.caption = clean(b.caption);
  if (b.notes !== undefined) patch.notes = clean(b.notes);
  if (b.market !== undefined) patch.market = clean(b.market);
  if (b.reposted_on !== undefined) patch.reposted_on = clean(b.reposted_on);
  if (typeof b.permission_granted === "boolean" || b.permission_granted === null) {
    patch.permission_granted = typeof b.permission_granted === "boolean" ? b.permission_granted : null;
  }
  if (typeof b.reposted === "boolean") {
    patch.reposted = b.reposted;
    patch.reposted_at = b.reposted ? new Date() : null;
    if (!b.reposted) patch.reposted_on = null;
  }

  try {
    const [updated] = await db
      .update(repostsTable)
      .set(patch)
      .where(and(eq(repostsTable.id, id), eq(repostsTable.brand_id, req.brandId)))
      .returning();
    if (!updated) { res.status(404).json({ error: "Not found" }); return; }
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update repost" });
  }
});

// DELETE /api/reposts/:id
router.delete("/reposts/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    await db
      .delete(repostsTable)
      .where(and(eq(repostsTable.id, id), eq(repostsTable.brand_id, req.brandId)));
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete repost" });
  }
});

export default router;
