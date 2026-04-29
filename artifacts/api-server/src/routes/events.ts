import { Router, type IRouter } from "express";
import { db, eventsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { recordTombstone } from "../lib/tombstones.js";

const router: IRouter = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * For a recurring event, project its date to the nearest upcoming occurrence.
 * Uses the month and day from the stored date; year is computed relative to today.
 * Returns { date, end_date } with the projected year.
 */
function projectRecurring(date: string, end_date: string | null): { date: string; end_date: string | null } {
  const today = new Date().toISOString().slice(0, 10);
  const [, startMM, startDD] = date.split("-").map(Number);
  const endParts = end_date ? end_date.split("-").map(Number) : null;

  let year = new Date().getFullYear();

  // Duration in days (for multi-day events)
  const durationDays = endParts
    ? Math.round((new Date(end_date! + "T12:00:00").getTime() - new Date(date + "T12:00:00").getTime()) / 86_400_000)
    : 0;

  // Check if this year's occurrence has already passed (using end_date or start_date)
  const effectiveEndThisYear = endParts
    ? `${year}-${String(endParts[1]).padStart(2, "0")}-${String(endParts[2]).padStart(2, "0")}`
    : `${year}-${String(startMM).padStart(2, "0")}-${String(startDD).padStart(2, "0")}`;

  if (effectiveEndThisYear < today) year += 1;

  const projectedStart = `${year}-${String(startMM).padStart(2, "0")}-${String(startDD).padStart(2, "0")}`;

  let projectedEnd: string | null = null;
  if (endParts && durationDays > 0) {
    const d = new Date(projectedStart + "T12:00:00");
    d.setDate(d.getDate() + durationDays);
    projectedEnd = d.toISOString().slice(0, 10);
  } else if (end_date) {
    projectedEnd = `${year}-${String(endParts![1]).padStart(2, "0")}-${String(endParts![2]).padStart(2, "0")}`;
  }

  return { date: projectedStart, end_date: projectedEnd };
}

// ─── GET /api/events ──────────────────────────────────────────────────────────
// Optional ?year=YYYY — if provided, recurring events are projected to that year.
// Without it, recurring events are projected to their next upcoming occurrence.
router.get("/events", async (req, res): Promise<void> => {
  try {
    const requestedYear = req.query.year ? parseInt(req.query.year as string, 10) : null;
    const rows = await db
      .select()
      .from(eventsTable)
      .where(eq(eventsTable.brand_id, req.brandId))
      .orderBy(eventsTable.date);

    const events = rows.map(e => {
      if (!e.recurring) return e;

      if (requestedYear) {
        // Project month/day to the requested year
        const [, mm, dd] = e.date.split("-");
        const projDate = `${requestedYear}-${mm}-${dd}`;
        let projEnd: string | null = null;
        if (e.end_date) {
          const [, emm, edd] = e.end_date.split("-");
          projEnd = `${requestedYear}-${emm}-${edd}`;
        }
        return { ...e, date: projDate, end_date: projEnd };
      }

      // Default: project to next upcoming occurrence
      const projected = projectRecurring(e.date, e.end_date);
      return { ...e, date: projected.date, end_date: projected.end_date };
    });

    // Re-sort after projection
    events.sort((a, b) => a.date.localeCompare(b.date));

    res.json(events);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

// ─── POST /api/events ─────────────────────────────────────────────────────────
router.post("/events", async (req, res): Promise<void> => {
  const { title, date, end_date, market, type, notes, recurring } = req.body as {
    title: string; date: string; end_date?: string;
    market: string; type: string; notes?: string; recurring?: boolean;
  };

  if (!title || !date) {
    res.status(400).json({ error: "title and date are required" });
    return;
  }

  try {
    const [row] = await db.insert(eventsTable).values({
      brand_id: req.brandId,
      title: title.trim(),
      date,
      end_date: end_date || null,
      market: market || "both",
      type: type || "seasonal",
      notes: notes?.trim() || null,
      recurring: recurring ?? false,
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

  const { title, date, end_date, market, type, notes, recurring } = req.body as {
    title?: string; date?: string; end_date?: string;
    market?: string; type?: string; notes?: string; recurring?: boolean;
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
        ...(recurring !== undefined && { recurring }),
      })
      .where(and(eq(eventsTable.id, id), eq(eventsTable.brand_id, req.brandId)))
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
    const deleted = await db.delete(eventsTable).where(and(eq(eventsTable.id, id), eq(eventsTable.brand_id, req.brandId))).returning();
    if (deleted.length > 0) await recordTombstone("events", id);
    if (deleted.length === 0) { res.status(404).json({ error: "Event not found" }); return; }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete event" });
  }
});

export default router;
