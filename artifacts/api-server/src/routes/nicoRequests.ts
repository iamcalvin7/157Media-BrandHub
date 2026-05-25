import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, nicoRequestsTable } from "@workspace/db";

const router: IRouter = Router();

const VALID_STATUSES = ["pending", "in_progress", "done"] as const;
const VALID_KINDS = ["video", "photo", "audio", "other"] as const;

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

router.get("/nico-requests", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(nicoRequestsTable)
    .orderBy(desc(nicoRequestsTable.createdAt));
  res.json(rows);
});

router.post("/nico-requests", async (req, res): Promise<void> => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const title = cleanString(body.title);
  if (!title) {
    res.status(400).json({ error: "Title is required" });
    return;
  }
  const kind = (VALID_KINDS as readonly string[]).includes(cleanString(body.kind) ?? "")
    ? (cleanString(body.kind) as string)
    : "other";
  const [created] = await db
    .insert(nicoRequestsTable)
    .values({
      title,
      kind,
      description: cleanString(body.description),
      visual_direction: cleanString(body.visual_direction),
      visual_ref_url: cleanString(body.visual_ref_url),
      format: cleanString(body.format),
      due_date: cleanDate(body.due_date),
      status: "pending",
      notes: cleanString(body.notes),
      drive_url: cleanString(body.drive_url),
    })
    .returning();
  res.status(201).json(created);
});

router.patch("/nico-requests/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const body = (req.body ?? {}) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};

  if ("title" in body) {
    const t = cleanString(body.title);
    if (t) patch.title = t;
  }
  if ("kind" in body) {
    const k = cleanString(body.kind);
    if (k && (VALID_KINDS as readonly string[]).includes(k)) patch.kind = k;
  }
  if ("description" in body) patch.description = cleanString(body.description);
  if ("visual_direction" in body) patch.visual_direction = cleanString(body.visual_direction);
  if ("visual_ref_url" in body) patch.visual_ref_url = cleanString(body.visual_ref_url);
  if ("format" in body) patch.format = cleanString(body.format);
  if ("due_date" in body) patch.due_date = cleanDate(body.due_date);
  if ("status" in body) {
    const s = cleanString(body.status);
    if (s && (VALID_STATUSES as readonly string[]).includes(s)) patch.status = s;
  }
  if ("notes" in body) patch.notes = cleanString(body.notes);
  if ("drive_url" in body) patch.drive_url = cleanString(body.drive_url);

  if (Object.keys(patch).length === 0) {
    res.status(400).json({ error: "Nothing to update" });
    return;
  }

  const [updated] = await db
    .update(nicoRequestsTable)
    .set(patch)
    .where(eq(nicoRequestsTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(updated);
});

router.delete("/nico-requests/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [deleted] = await db
    .delete(nicoRequestsTable)
    .where(eq(nicoRequestsTable.id, id))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
