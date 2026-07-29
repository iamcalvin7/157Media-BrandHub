import { Router, type IRouter } from "express";
import { requireBrandAccess } from "../middlewares/requireBrandAccess.js";
import { eq, and, desc } from "drizzle-orm";
import { db, evergreenContentTable } from "@workspace/db";

const router: IRouter = Router();

// ─── GET /api/evergreen-content ───────────────────────────────────────────────
router.get("/evergreen-content", requireBrandAccess("viewer"), async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(evergreenContentTable)
    .where(eq(evergreenContentTable.brand_id, req.brandId))
    .orderBy(desc(evergreenContentTable.created_at));
  res.json(rows);
});

// ─── POST /api/evergreen-content ──────────────────────────────────────────────
router.post("/evergreen-content", requireBrandAccess("editor"), async (req, res): Promise<void> => {
  const { title, link, thumbnail_url, media_type, notes } = req.body as Record<string, unknown>;
  if (!title || typeof title !== "string" || !title.trim()) {
    res.status(400).json({ error: "title is required" });
    return;
  }
  const clean = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const [created] = await db
    .insert(evergreenContentTable)
    .values({
      brand_id: req.brandId,
      title: title.trim(),
      link: clean(link),
      thumbnail_url: clean(thumbnail_url),
      media_type: (typeof media_type === "string" && ["image", "video"].includes(media_type)) ? media_type : "image",
      notes: clean(notes),
    })
    .returning();
  res.status(201).json(created);
});

// ─── PATCH /api/evergreen-content/:id ────────────────────────────────────────
router.patch("/evergreen-content/:id", requireBrandAccess("editor"), async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { title, link, thumbnail_url, media_type, notes, last_used_at } = req.body as Record<string, unknown>;
  const clean = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const patch: Record<string, unknown> = {};

  if (title !== undefined) {
    if (typeof title !== "string" || !title.trim()) { res.status(400).json({ error: "title cannot be empty" }); return; }
    patch.title = title.trim();
  }
  if (link !== undefined) patch.link = clean(link);
  if (thumbnail_url !== undefined) patch.thumbnail_url = clean(thumbnail_url);
  if (notes !== undefined) patch.notes = clean(notes);
  if (media_type !== undefined && typeof media_type === "string" && ["image", "video"].includes(media_type)) {
    patch.media_type = media_type;
  }
  if (last_used_at !== undefined) {
    patch.last_used_at = last_used_at === null ? null : new Date(last_used_at as string);
  }

  if (Object.keys(patch).length === 0) { res.status(400).json({ error: "Nothing to update" }); return; }

  const [updated] = await db
    .update(evergreenContentTable)
    .set(patch)
    .where(and(eq(evergreenContentTable.id, id), eq(evergreenContentTable.brand_id, req.brandId)))
    .returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

// ─── DELETE /api/evergreen-content/:id ───────────────────────────────────────
router.delete("/evergreen-content/:id", requireBrandAccess("editor"), async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [deleted] = await db
    .delete(evergreenContentTable)
    .where(and(eq(evergreenContentTable.id, id), eq(evergreenContentTable.brand_id, req.brandId)))
    .returning({ id: evergreenContentTable.id });
  if (!deleted) { res.status(404).json({ error: "Not found" }); return; }
  res.sendStatus(204);
});

export default router;
