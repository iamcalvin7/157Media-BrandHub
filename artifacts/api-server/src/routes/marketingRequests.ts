import { Router, type IRouter } from "express";
import { requireBrandAccess } from "../middlewares/requireBrandAccess.js";
import { db, marketingRequestsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { createDriveFolderForMarketingRequest } from "../lib/googleDrive.js";

const router: IRouter = Router();

router.get("/marketing-requests", requireBrandAccess("viewer"), async (req, res): Promise<void> => {
  try {
    const rows = await db
      .select()
      .from(marketingRequestsTable)
      .where(eq(marketingRequestsTable.brand_id, req.brandId))
      .orderBy(desc(marketingRequestsTable.created_at));
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch marketing requests");
    res.status(500).json({ error: "Failed to fetch marketing requests" });
  }
});

router.post("/marketing-requests", requireBrandAccess("editor"), async (req, res): Promise<void> => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, 300) : null;
  if (!name) { res.status(400).json({ error: "Name is required" }); return; }

  const request_type = typeof body.request_type === "string" ? body.request_type.trim().slice(0, 100) || null : null;
  const sizes = Array.isArray(body.sizes) ? (body.sizes as unknown[]).filter((s): s is string => typeof s === "string") : null;
  const designer = typeof body.designer === "string" && body.designer.trim() ? body.designer.trim().slice(0, 100) : null;
  const deadline = typeof body.deadline === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.deadline) ? body.deadline : null;
  const market = typeof body.market === "string" && body.market.trim() ? body.market.trim() : null;
  const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 2000) || null : null;

  try {
    const [inserted] = await db
      .insert(marketingRequestsTable)
      .values({ brand_id: req.brandId, name, request_type, sizes, designer, deadline, market, notes, status: "pending" })
      .returning();

    createDriveFolderForMarketingRequest({
      requestId: inserted.id,
      brandSlug: req.brandSlug,
      market,
      name,
    }).catch((err) => req.log?.warn?.({ err }, "marketing-requests: drive folder creation failed"));

    res.status(201).json(inserted);
  } catch (err) {
    req.log.error({ err }, "Failed to create marketing request");
    res.status(500).json({ error: "Failed to create marketing request" });
  }
});

router.patch("/marketing-requests/:id", requireBrandAccess("editor"), async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const body = (req.body ?? {}) as Record<string, unknown>;
  const patch: Partial<typeof marketingRequestsTable.$inferInsert> = {};
  if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim().slice(0, 300);
  if (typeof body.request_type === "string") patch.request_type = body.request_type.trim().slice(0, 100) || null;
  if (Array.isArray(body.sizes)) patch.sizes = (body.sizes as unknown[]).filter((s): s is string => typeof s === "string");
  if (typeof body.designer === "string") patch.designer = body.designer.trim().slice(0, 100) || null;
  if (typeof body.deadline === "string") patch.deadline = /^\d{4}-\d{2}-\d{2}$/.test(body.deadline) ? body.deadline : null;
  if (typeof body.status === "string") patch.status = body.status;
  if (typeof body.notes === "string") patch.notes = body.notes.trim().slice(0, 2000) || null;
  if (Object.keys(patch).length === 0) { res.status(400).json({ error: "Nothing to update" }); return; }
  try {
    const [updated] = await db
      .update(marketingRequestsTable)
      .set(patch)
      .where(and(eq(marketingRequestsTable.id, id), eq(marketingRequestsTable.brand_id, req.brandId)))
      .returning();
    if (!updated) { res.status(404).json({ error: "Not found" }); return; }
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to update marketing request");
    res.status(500).json({ error: "Failed to update marketing request" });
  }
});

router.delete("/marketing-requests/:id", requireBrandAccess("editor"), async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    await db
      .delete(marketingRequestsTable)
      .where(and(eq(marketingRequestsTable.id, id), eq(marketingRequestsTable.brand_id, req.brandId)));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete marketing request");
    res.status(500).json({ error: "Failed to delete marketing request" });
  }
});

export default router;
