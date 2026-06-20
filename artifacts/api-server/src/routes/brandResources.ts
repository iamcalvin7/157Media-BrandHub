import { Router, type IRouter } from "express";
import { requireSession } from "../middlewares/requireBrandAccess.js";
import { eq, asc } from "drizzle-orm";
import { db, brandResourcesTable } from "@workspace/db";

const router: IRouter = Router();

function clean(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}

router.get("/brand-resources", requireSession, async (req, res): Promise<void> => {
  const brandId = Number(req.query.brand_id);
  if (!Number.isFinite(brandId)) {
    res.status(400).json({ error: "brand_id required" });
    return;
  }
  const rows = await db
    .select()
    .from(brandResourcesTable)
    .where(eq(brandResourcesTable.brand_id, brandId))
    .orderBy(asc(brandResourcesTable.sort_order), asc(brandResourcesTable.createdAt));
  res.json(rows);
});

router.post("/brand-resources", requireSession, async (req, res): Promise<void> => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const brandId = Number(body.brand_id);
  if (!Number.isFinite(brandId)) {
    res.status(400).json({ error: "brand_id required" });
    return;
  }
  const name = clean(body.name);
  const url = clean(body.url);
  if (!name || !url) {
    res.status(400).json({ error: "name and url are required" });
    return;
  }
  const [created] = await db
    .insert(brandResourcesTable)
    .values({
      brand_id: brandId,
      name,
      url,
      notes: clean(body.notes),
    })
    .returning();
  res.status(201).json(created);
});

router.patch("/brand-resources/:id", requireSession, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const body = (req.body ?? {}) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  if ("name" in body) { const v = clean(body.name); if (v) patch.name = v; }
  if ("url" in body)  { const v = clean(body.url);  if (v) patch.url  = v; }
  if ("notes" in body) patch.notes = clean(body.notes);
  if (Object.keys(patch).length === 0) { res.status(400).json({ error: "Nothing to update" }); return; }
  const [updated] = await db
    .update(brandResourcesTable)
    .set(patch)
    .where(eq(brandResourcesTable.id, id))
    .returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

router.delete("/brand-resources/:id", requireSession, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [deleted] = await db
    .delete(brandResourcesTable)
    .where(eq(brandResourcesTable.id, id))
    .returning();
  if (!deleted) { res.status(404).json({ error: "Not found" }); return; }
  res.sendStatus(204);
});

export default router;
