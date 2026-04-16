import { Router, type IRouter } from "express";
import { db, eventsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

// ─── GET /api/events ──────────────────────────────────────────────────────────
router.get("/events", async (_req, res): Promise<void> => {
  try {
    const events = await db.select().from(eventsTable).orderBy(eventsTable.date);
    res.json(events);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

// ─── POST /api/events ─────────────────────────────────────────────────────────
router.post("/events", async (req, res): Promise<void> => {
  const { title, date, end_date, market, type, notes } = req.body as {
    title: string; date: string; end_date?: string;
    market: string; type: string; notes?: string;
  };

  if (!title || !date) {
    res.status(400).json({ error: "title and date are required" });
    return;
  }

  try {
    const [row] = await db.insert(eventsTable).values({
      title: title.trim(),
      date,
      end_date: end_date || null,
      market: market || "both",
      type: type || "seasonal",
      notes: notes?.trim() || null,
    }).returning();
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create event" });
  }
});

// ─── PUT /api/events/:id ──────────────────────────────────────────────────────
router.put("/events/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { title, date, end_date, market, type, notes } = req.body as {
    title?: string; date?: string; end_date?: string;
    market?: string; type?: string; notes?: string;
  };

  try {
    const [row] = await db.update(eventsTable)
      .set({
        ...(title !== undefined && { title: title.trim() }),
        ...(date !== undefined && { date }),
        ...(end_date !== undefined && { end_date: end_date || null }),
        ...(market !== undefined && { market }),
        ...(type !== undefined && { type }),
        ...(notes !== undefined && { notes: notes.trim() || null }),
      })
      .where(eq(eventsTable.id, id))
      .returning();

    if (!row) { res.status(404).json({ error: "Event not found" }); return; }
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update event" });
  }
});

// ─── DELETE /api/events/:id ───────────────────────────────────────────────────
router.delete("/events/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  try {
    const deleted = await db.delete(eventsTable).where(eq(eventsTable.id, id)).returning();
    if (deleted.length === 0) { res.status(404).json({ error: "Event not found" }); return; }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete event" });
  }
});

export default router;
