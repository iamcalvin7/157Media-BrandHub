import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, savedItemsTable } from "@workspace/db";

const router: IRouter = Router();

const ALLOWED_KINDS = new Set(["link", "video", "design", "other"]);

function cleanString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}

router.get("/saved-items", async (req, res): Promise<void> => {
  const kind = typeof req.query.kind === "string" ? req.query.kind : undefined;
  const where = kind
    ? and(eq(savedItemsTable.brand_id, req.brandId), eq(savedItemsTable.kind, kind))
    : eq(savedItemsTable.brand_id, req.brandId);
  const rows = await db.select().from(savedItemsTable).where(where).orderBy(desc(savedItemsTable.createdAt));
  res.json(rows);
});

router.post("/saved-items", async (req, res): Promise<void> => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const kind = typeof body.kind === "string" ? body.kind : "link";
  if (!ALLOWED_KINDS.has(kind)) {
    res.status(400).json({ error: "Invalid kind" });
    return;
  }
  const url = cleanString(body.url);
  const title = cleanString(body.title);
  const notes = cleanString(body.notes);
  const thumbnailUrl = cleanString(body.thumbnailUrl);
  if (!url && !title && !notes) {
    res.status(400).json({ error: "Provide at least a URL, title, or notes." });
    return;
  }
  const [created] = await db
    .insert(savedItemsTable)
    .values({ brand_id: req.brandId, kind, url, title, notes, thumbnailUrl })
    .returning();
  res.status(201).json(created);
});

router.patch("/saved-items/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const body = (req.body ?? {}) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  if (typeof body.kind === "string") {
    if (!ALLOWED_KINDS.has(body.kind)) {
      res.status(400).json({ error: "Invalid kind" });
      return;
    }
    patch.kind = body.kind;
  }
  if ("url" in body) patch.url = cleanString(body.url);
  if ("title" in body) patch.title = cleanString(body.title);
  if ("notes" in body) patch.notes = cleanString(body.notes);
  if ("thumbnailUrl" in body) patch.thumbnailUrl = cleanString(body.thumbnailUrl);

  const [updated] = await db
    .update(savedItemsTable)
    .set(patch)
    .where(and(eq(savedItemsTable.id, id), eq(savedItemsTable.brand_id, req.brandId)))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(updated);
});

router.delete("/saved-items/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [deleted] = await db.delete(savedItemsTable).where(and(eq(savedItemsTable.id, id), eq(savedItemsTable.brand_id, req.brandId))).returning();
  if (!deleted) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
