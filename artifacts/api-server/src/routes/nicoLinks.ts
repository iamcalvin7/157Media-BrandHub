import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, nicoLinksTable } from "@workspace/db";

const router: IRouter = Router();

// Open-ended on purpose — Nico can drop anything; the dropdown in the UI is
// the canonical list but we don't reject unknown kinds in case he types one.
const COMMON_KINDS = ["video", "voiceover", "image", "audio", "other"] as const;

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

router.get("/nico-links", async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(nicoLinksTable)
    .where(eq(nicoLinksTable.brand_id, req.brandId))
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
      brand_id: req.brandId,
      kind,
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
  if ("date" in body) patch.date = cleanDate(body.date);
  if ("notes" in body) patch.notes = cleanString(body.notes);

  if (Object.keys(patch).length === 0) {
    res.status(400).json({ error: "Nothing to update" });
    return;
  }

  const [updated] = await db
    .update(nicoLinksTable)
    .set(patch)
    .where(and(eq(nicoLinksTable.id, id), eq(nicoLinksTable.brand_id, req.brandId)))
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
    .where(and(eq(nicoLinksTable.id, id), eq(nicoLinksTable.brand_id, req.brandId)))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.sendStatus(204);
});

export { COMMON_KINDS };
export default router;
