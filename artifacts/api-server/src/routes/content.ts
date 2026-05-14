import { Router, type IRouter } from "express";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { distillVoiceNote, distillVoiceNoteFromCaption } from "../lib/distillVoice.js";
import { brandVoiceNotesTable } from "@workspace/db";
import { db, contentPostsTable, approvalDecisionsTable, changelogEntriesTable, eventsTable, pastPostsTable, copywriterFeedbackTable, copywriterRulesTable, pillarsTable, voiceProfilesTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { getBrandGuidelinesPrompt } from "../lib/brandGuidelines.js";
import { isAiContentGenerationConfigured, aiNotConfiguredResponse } from "../lib/brandAiConfig.js";
import { recordTombstone } from "../lib/tombstones.js";

const router: IRouter = Router();

// ─── POST /api/content/posts ───────────────────────────────────────────────────
router.post("/content/posts", async (req, res): Promise<void> => {
  const posts = req.body as {
    market: string;
    platform: string;
    pillar: string;
    title?: string;
    tone_register?: string;
    format: string;
    caption: string;
    visual_direction: string;
    resources?: string;
    visual_reference_url?: string;
    cta?: string;
    media_url?: string;
    link_url?: string;
    drive_url?: string;
    cross_post?: boolean;
    month: string;
    scheduled_date?: string;
    scheduled_time?: string;
    status?: string;
    assigned_to?: string;
  }[];

  if (!Array.isArray(posts) || posts.length === 0) {
    res.status(400).json({ error: "posts must be a non-empty array" });
    return;
  }

  try {
    const rows = await db
      .insert(contentPostsTable)
      .values(posts.map((p) => ({ ...p, brand_id: req.brandId, status: p.status ?? "pending" })))
      .returning();
    // Fire-and-forget: distill voice notes for any approved posts with captions
    for (const row of rows) {
      if (row.status === "approved" && row.caption?.trim()) {
        void distillVoiceNote(row.id);
      }
    }
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to insert posts" });
  }
});

// ─── GET /api/content/posts/skipped ───────────────────────────────────────────
// All "skipped" posts for the active brand, across every month. Powers the
// /skipped-posts archive page so the team can audit what was put aside.
// Note: declared BEFORE /content/posts so Express doesn't treat "skipped" as :id.
router.get("/content/posts/skipped", async (req, res): Promise<void> => {
  try {
    const rows = await db
      .select()
      .from(contentPostsTable)
      .where(and(eq(contentPostsTable.brand_id, req.brandId), eq(contentPostsTable.status, "skipped")))
      .orderBy(desc(contentPostsTable.scheduled_date), desc(contentPostsTable.id));
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch skipped posts");
    res.status(500).json({ error: "Failed to fetch skipped posts" });
  }
});

router.get("/content/posts", async (req, res): Promise<void> => {
  const { month } = req.query as { month?: string };
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    res.status(400).json({ error: "month query param required (YYYY-MM)" });
    return;
  }

  try {
    const posts = await db
      .select()
      .from(contentPostsTable)
      .where(and(eq(contentPostsTable.brand_id, req.brandId), eq(contentPostsTable.month, month)));

    const decisions = await db
      .select()
      .from(approvalDecisionsTable)
      .innerJoin(contentPostsTable, eq(approvalDecisionsTable.post_id, contentPostsTable.id))
      .where(and(eq(contentPostsTable.brand_id, req.brandId), eq(contentPostsTable.month, month)));

    const decisionsByPostId: Record<number, { decision: string; rejection_reason: string | null }> = {};
    for (const d of decisions) {
      decisionsByPostId[d.approval_decisions.post_id!] = {
        decision: d.approval_decisions.decision,
        rejection_reason: d.approval_decisions.rejection_reason ?? null,
      };
    }

    const result = posts.map((p) => ({
      ...p,
      approval: decisionsByPostId[p.id] ?? null,
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

// ─── DELETE /api/content/posts/:id ────────────────────────────────────────────
router.delete("/content/posts/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid post id" });
    return;
  }
  try {
    // Verify the post belongs to the active brand BEFORE touching any related rows,
    // so we never mutate another brand's data when an ID is supplied incorrectly.
    const [owned] = await db
      .select({ id: contentPostsTable.id })
      .from(contentPostsTable)
      .where(and(eq(contentPostsTable.id, id), eq(contentPostsTable.brand_id, req.brandId)));
    if (!owned) {
      res.status(404).json({ error: "Post not found" });
      return;
    }
    await db.delete(approvalDecisionsTable).where(eq(approvalDecisionsTable.post_id, id));
    await db
      .delete(contentPostsTable)
      .where(and(eq(contentPostsTable.id, id), eq(contentPostsTable.brand_id, req.brandId)));
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete post" });
  }
});

// ─── PATCH /api/content/posts/:id ─────────────────────────────────────────────
router.patch("/content/posts/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid post id" }); return; }
  try {
    const {
      entry_type,
      market, platform, pillar, title, format, tone_register,
      caption, visual_direction, resources, visual_reference_url, cta, cross_post,
      scheduled_date, scheduled_time, status, creative_status, link_url, media_url, drive_url, posted_url, posted_url_ig, recurring, notes, assigned_to,
    } = req.body;
    const [updated] = await db.update(contentPostsTable).set({
      ...(entry_type !== undefined && { entry_type }),
      ...(market !== undefined && { market }),
      ...(platform !== undefined && { platform }),
      ...(pillar !== undefined && { pillar }),
      ...(title !== undefined && { title }),
      ...(format !== undefined && { format }),
      ...(tone_register !== undefined && { tone_register }),
      ...(caption !== undefined && { caption }),
      ...(visual_direction !== undefined && { visual_direction }),
      ...(resources !== undefined && { resources: resources || null }),
      ...(visual_reference_url !== undefined && { visual_reference_url: visual_reference_url || null }),
      ...(cta !== undefined && { cta }),
      ...(cross_post !== undefined && { cross_post }),
      ...(scheduled_date !== undefined && { scheduled_date: scheduled_date || null }),
      ...(scheduled_time !== undefined && { scheduled_time: scheduled_time || null }),
      ...(status !== undefined && { status }),
      ...(creative_status !== undefined && { creative_status }),
      ...(link_url !== undefined && { link_url: link_url || null }),
      ...(media_url !== undefined && { media_url: media_url || null }),
      ...(drive_url !== undefined && { drive_url: drive_url || null }),
      ...(posted_url !== undefined && { posted_url: posted_url || null }),
      ...(posted_url_ig !== undefined && { posted_url_ig: posted_url_ig || null }),
      ...(recurring !== undefined && { recurring }),
      ...(notes !== undefined && { notes: notes || null }),
      ...(assigned_to !== undefined && { assigned_to: assigned_to || null }),
    }).where(and(eq(contentPostsTable.id, id), eq(contentPostsTable.brand_id, req.brandId))).returning();
    if (!updated) { res.status(404).json({ error: "Post not found" }); return; }
    // Fire-and-forget: distill voice notes when a post is approved with a caption
    if (updated.status === "approved" && updated.caption?.trim()) {
      void distillVoiceNote(updated.id);
    }
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update post" });
  }
});

// ─── GET /api/content/pillars ──────────────────────────────────────────────────
const DEFAULT_PILLARS = [
  { name: "Why VF", market: "both", sort_order: 0 },
  { name: "Why Sicily", market: "english", sort_order: 1 },
  { name: "Why Malta", market: "italian", sort_order: 2 },
  { name: "VF Experience", market: "both", sort_order: 3 },
  { name: "VF Recommends", market: "both", sort_order: 4 },
  { name: "For the Feed", market: "both", sort_order: 5 },
];

// ─── Brand voice / KB notes (manual entries) ─────────────────────────────────

router.get("/brand-voice-notes", async (req, res): Promise<void> => {
  const rows = await db
    .select({
      id: brandVoiceNotesTable.id,
      note: brandVoiceNotesTable.note,
      createdAt: brandVoiceNotesTable.created_at,
      sourcePostId: brandVoiceNotesTable.source_post_id,
    })
    .from(brandVoiceNotesTable)
    .where(eq(brandVoiceNotesTable.brand_id, req.brandId))
    .orderBy(desc(brandVoiceNotesTable.created_at));

  // Surface only manual KB notes (auto-distilled notes have a source_post_id
  // and are background voice signal, not user-curated guidelines).
  const manual = rows
    .filter((r) => r.sourcePostId === null)
    .map((r) => ({ id: r.id, note: r.note, createdAt: r.createdAt }));

  res.json(manual);
});

router.post("/brand-voice-notes", async (req, res): Promise<void> => {
  const note = typeof req.body?.note === "string" ? req.body.note.trim() : "";
  if (!note) {
    res.status(400).json({ error: "note required" });
    return;
  }
  const [created] = await db
    .insert(brandVoiceNotesTable)
    .values({ brand_id: req.brandId, note })
    .returning({
      id: brandVoiceNotesTable.id,
      note: brandVoiceNotesTable.note,
      createdAt: brandVoiceNotesTable.created_at,
    });
  res.status(201).json(created);
});

router.delete("/brand-voice-notes/:id", async (req, res): Promise<void> => {
  const id = Number(req.params["id"]);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "invalid id" });
    return;
  }
  const deleted = await db
    .delete(brandVoiceNotesTable)
    .where(and(eq(brandVoiceNotesTable.id, id), eq(brandVoiceNotesTable.brand_id, req.brandId)))
    .returning({ id: brandVoiceNotesTable.id });
  if (deleted.length === 0) {
    res.status(404).json({ error: "note not found" });
    return;
  }
  await recordTombstone("brand_voice_notes", id);
  res.status(204).end();
});

router.post("/content/backfill-voice-notes", async (req, res): Promise<void> => {
  const { month } = req.body ?? {};
  if (!month || typeof month !== "string") {
    res.status(400).json({ error: "month required (e.g. 2026-05)" });
    return;
  }
  const posts = await db.select().from(contentPostsTable).where(and(eq(contentPostsTable.brand_id, req.brandId), eq(contentPostsTable.month, month)));
  const eligible = posts.filter(p => p.caption && p.caption.trim().length > 20);
  let totalNotes = 0;
  let processed = 0;
  for (const p of eligible) {
    const inserted = await distillVoiceNoteFromCaption({
      postId: p.id,
      caption: p.caption!,
      market: p.market,
      platform: p.platform,
      pillar: p.pillar,
      format: p.format,
    });
    totalNotes += inserted;
    processed++;
  }
  res.json({ month, postsConsidered: eligible.length, processed, notesInserted: totalNotes });
});

router.get("/content/pillars", async (req, res): Promise<void> => {
  try {
    let rows = await db.select().from(pillarsTable)
      .where(eq(pillarsTable.brand_id, req.brandId))
      .orderBy(pillarsTable.sort_order);
    if (rows.length === 0 && req.brandId === 1) {
      // Only seed Virtu Ferries with the default pillars; other brands start empty.
      await db.insert(pillarsTable).values(DEFAULT_PILLARS.map(p => ({ ...p, brand_id: req.brandId })));
      rows = await db.select().from(pillarsTable)
        .where(eq(pillarsTable.brand_id, req.brandId))
        .orderBy(pillarsTable.sort_order);
    }
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch pillars" });
  }
});

// ─── PUT /api/content/pillars ──────────────────────────────────────────────────
router.put("/content/pillars", async (req, res): Promise<void> => {
  const pillars = req.body as { name: string; market: string; sort_order: number; active: boolean }[];
  if (!Array.isArray(pillars)) { res.status(400).json({ error: "Expected array" }); return; }
  try {
    // Scope the wipe-and-replace to the current brand only — never blow away another brand's pillars.
    const removed = await db
      .delete(pillarsTable)
      .where(eq(pillarsTable.brand_id, req.brandId))
      .returning({ id: pillarsTable.id });
    // Tombstone every removed pillar so the next snapshot bootstrap doesn't revive
    // them from the dev snapshot.
    for (const r of removed) {
      await recordTombstone("pillars", r.id);
    }
    if (pillars.length > 0) {
      await db.insert(pillarsTable).values(pillars.map(p => ({ ...p, brand_id: req.brandId })));
    }
    const rows = await db.select().from(pillarsTable)
      .where(eq(pillarsTable.brand_id, req.brandId))
      .orderBy(pillarsTable.sort_order);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save pillars" });
  }
});

// ─── GET /api/content/history ─────────────────────────────────────────────────
// Returns all posts ever — used by plan generator for context loading
router.get("/content/history", async (req, res): Promise<void> => {
  try {
    const posts = await db
      .select({
        id: contentPostsTable.id,
        market: contentPostsTable.market,
        platform: contentPostsTable.platform,
        pillar: contentPostsTable.pillar,
        tone_register: contentPostsTable.tone_register,
        format: contentPostsTable.format,
        caption: contentPostsTable.caption,
        visual_direction: contentPostsTable.visual_direction,
        cta: contentPostsTable.cta,
        cross_post: contentPostsTable.cross_post,
        month: contentPostsTable.month,
        scheduled_date: contentPostsTable.scheduled_date,
        status: contentPostsTable.status,
      })
      .from(contentPostsTable)
      .where(eq(contentPostsTable.brand_id, req.brandId));
    res.json(posts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

// ─── POST /api/content/approve ────────────────────────────────────────────────
router.post("/content/approve", async (req, res): Promise<void> => {
  const { post_id } = req.body as { post_id: number };
  if (!post_id) {
    res.status(400).json({ error: "post_id is required" });
    return;
  }

  try {
    const [updated] = await db
      .update(contentPostsTable)
      .set({ status: "approved" })
      .where(and(eq(contentPostsTable.id, post_id), eq(contentPostsTable.brand_id, req.brandId)))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Post not found" });
      return;
    }

    await db.insert(approvalDecisionsTable).values({
      post_id,
      decision: "approved",
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to approve post" });
  }
});

// ─── POST /api/content/reject ─────────────────────────────────────────────────
router.post("/content/reject", async (req, res): Promise<void> => {
  const { post_id, rejection_reason } = req.body as {
    post_id: number;
    rejection_reason: string;
  };

  if (!post_id) {
    res.status(400).json({ error: "post_id is required" });
    return;
  }
  if (!rejection_reason || !rejection_reason.trim()) {
    res.status(400).json({ error: "rejection_reason is required" });
    return;
  }

  try {
    const [updated] = await db
      .update(contentPostsTable)
      .set({ status: "rejected" })
      .where(and(eq(contentPostsTable.id, post_id), eq(contentPostsTable.brand_id, req.brandId)))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Post not found" });
      return;
    }

    await db.insert(approvalDecisionsTable).values({
      post_id,
      decision: "rejected",
      rejection_reason: rejection_reason.trim(),
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to reject post" });
  }
});

// ─── GET /api/content/preferences ─────────────────────────────────────────────
router.get("/content/preferences", async (req, res): Promise<void> => {
  try {
    const decisions = await db
      .select({
        decision: approvalDecisionsTable.decision,
        rejection_reason: approvalDecisionsTable.rejection_reason,
        pillar: contentPostsTable.pillar,
        tone_register: contentPostsTable.tone_register,
        format: contentPostsTable.format,
        market: contentPostsTable.market,
        month: contentPostsTable.month,
      })
      .from(approvalDecisionsTable)
      .innerJoin(contentPostsTable, eq(approvalDecisionsTable.post_id, contentPostsTable.id))
      .where(eq(contentPostsTable.brand_id, req.brandId));

    const months = new Set(decisions.map((d) => d.month));
    const months_analysed = months.size;

    type Pattern = { pillar: string; tone_register: string; format: string; market: string; count: number };

    const approvedMap: Record<string, Pattern> = {};
    const rejectedMap: Record<string, { pattern: Pattern; reasons: string[] }> = {};

    for (const d of decisions) {
      const key = `${d.pillar}|${d.tone_register}|${d.format}|${d.market}`;
      if (d.decision === "approved") {
        if (!approvedMap[key]) {
          approvedMap[key] = { pillar: d.pillar, tone_register: d.tone_register, format: d.format, market: d.market, count: 0 };
        }
        approvedMap[key].count += 1;
      } else {
        if (!rejectedMap[key]) {
          rejectedMap[key] = {
            pattern: { pillar: d.pillar, tone_register: d.tone_register, format: d.format, market: d.market, count: 0 },
            reasons: [],
          };
        }
        rejectedMap[key].pattern.count += 1;
        if (d.rejection_reason) rejectedMap[key].reasons.push(d.rejection_reason);
      }
    }

    const approved_patterns = Object.values(approvedMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const rejected_patterns = Object.values(rejectedMap)
      .sort((a, b) => b.pattern.count - a.pattern.count)
      .slice(0, 10)
      .map(({ pattern, reasons }) => ({
        ...pattern,
        reasons: [...new Set(reasons)],
      }));

    const reasonCounts: Record<string, number> = {};
    for (const d of decisions) {
      if (d.decision === "rejected" && d.rejection_reason) {
        reasonCounts[d.rejection_reason] = (reasonCounts[d.rejection_reason] ?? 0) + 1;
      }
    }
    const active_constraints = Object.entries(reasonCounts)
      .filter(([, count]) => count >= 3)
      .map(([reason]) => reason);

    res.json({ approved_patterns, rejected_patterns, active_constraints, months_analysed });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch preferences" });
  }
});

// ─── GET /api/content/pending ─────────────────────────────────────────────────
router.get("/content/pending", async (req, res): Promise<void> => {
  try {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const posts = await db
      .select()
      .from(contentPostsTable)
      .where(and(
        eq(contentPostsTable.brand_id, req.brandId),
        eq(contentPostsTable.status, "pending"),
        eq(contentPostsTable.month, currentMonth),
      ));
    res.json(posts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch pending posts" });
  }
});

// ─── POST /api/content/generate-ideas ────────────────────────────────────────
// Phase 1 of 2: generate concept ideas (no captions) for user review
router.post("/content/generate-ideas", async (req, res): Promise<void> => {
  if (!isAiContentGenerationConfigured(req.brandSlug)) {
    res.status(400).json(aiNotConfiguredResponse(req.brandSlug));
    return;
  }
  const { month, market, offers, events, campaigns, other, trending_format, user_ideas } = req.body as {
    month: string; market: string; offers?: string; events?: string;
    campaigns?: string; other?: string; trending_format?: string;
    user_ideas?: { text: string; platform: "Facebook" | "Instagram" | "Both" }[];
  };

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    res.status(400).json({ error: "month required (YYYY-MM)" });
    return;
  }

  try {
    const [allPosts, decisions, dbEvents, pastPosts] = await Promise.all([
      db.select({
        market: contentPostsTable.market, platform: contentPostsTable.platform,
        pillar: contentPostsTable.pillar, tone_register: contentPostsTable.tone_register,
        format: contentPostsTable.format, month: contentPostsTable.month,
      }).from(contentPostsTable).where(eq(contentPostsTable.brand_id, req.brandId)),
      db.select({
        decision: approvalDecisionsTable.decision,
        pillar: contentPostsTable.pillar, tone_register: contentPostsTable.tone_register,
        format: contentPostsTable.format, market: contentPostsTable.market,
      }).from(approvalDecisionsTable)
        .innerJoin(contentPostsTable, eq(approvalDecisionsTable.post_id, contentPostsTable.id))
        .where(eq(contentPostsTable.brand_id, req.brandId)),
      db.select().from(eventsTable).where(eq(eventsTable.brand_id, req.brandId)).orderBy(eventsTable.date),
      db.select().from(pastPostsTable).where(eq(pastPostsTable.brand_id, req.brandId)).orderBy(desc(pastPostsTable.date)).limit(40),
    ]);

    const approvedSummary = decisions.filter(d => d.decision === "approved").slice(0, 15)
      .map(d => `${d.pillar}/${d.tone_register}/${d.format} (${d.market})`).join(", ");
    const rejectedSummary = decisions.filter(d => d.decision === "rejected").slice(0, 10)
      .map(d => `${d.pillar}/${d.tone_register}`).join(", ");
    const historySnippet = allPosts.slice(-20)
      .map(p => `[${p.month}] ${p.market} | ${p.platform} | ${p.pillar} | ${p.format}`).join("\n");
    const pastPostsSnippet = pastPosts.length > 0
      ? pastPosts.map(p => {
          const head = `[${p.date}${p.time ? " " + p.time : ""}] ${p.platform}${p.market ? " (" + p.market + ")" : ""}`;
          const dir = p.direction ? ` | Direction: ${p.direction}` : "";
          const cap = ` | "${p.caption.slice(0, 100)}${p.caption.length > 100 ? "…" : ""}"`;
          return head + dir + cap;
        }).join("\n")
      : "No uploaded history yet.";

    const [year, mon] = month.split("-").map(Number);

    // Filter DB events relevant to this month (±2 weeks window)
    // Window: from month start (no look-back — past events are irrelevant)
    // to 14 days after month end (to flag upcoming events needing early lead-time)
    const windowStartStr = `${year}-${String(mon).padStart(2, "0")}-01`;
    const windowEnd = new Date(year, mon, 0);
    windowEnd.setDate(windowEnd.getDate() + 14);
    const windowEndStr = windowEnd.toISOString().slice(0, 10);

    // Project recurring events to the planning year before filtering
    const projectedEvents = dbEvents.map(e => {
      if (!e.recurring) return e;
      // Extract MM-DD from stored date and rebuild with planning year
      const [, mm, dd] = e.date.split("-");
      const projDate = `${year}-${mm}-${dd}`;
      let projEnd: string | null = null;
      if (e.end_date) {
        const [, emm, edd] = e.end_date.split("-");
        projEnd = `${year}-${emm}-${edd}`;
        // If end_date is before start (e.g. Dec 31 → Jan 2 wraps year), keep as-is
      }
      return { ...e, date: projDate, end_date: projEnd };
    });

    const relevantEvents = projectedEvents.filter(e => {
      const eventEnd = e.end_date ?? e.date;
      return eventEnd >= windowStartStr && e.date <= windowEndStr &&
        (e.market === "both" || e.market === market);
    });

    const dbEventsBlock = relevantEvents.length > 0
      ? relevantEvents.map(e => {
          const range = e.end_date && e.end_date !== e.date ? `${e.date} to ${e.end_date}` : e.date;
          const recLabel = e.recurring ? " [annual]" : "";
          return `• ${e.title}${recLabel} [${range}] — Type: ${e.type}${e.notes ? ` — ${e.notes}` : ""}`;
        }).join("\n")
      : "None from the events library.";
    const monthName = new Date(year, mon - 1, 1).toLocaleString("en-GB", { month: "long", year: "numeric" });
    const daysInMonth = new Date(year, mon, 0).getDate();
    const isEnglish = market === "English";

    // Compute every Saturday in the month
    const saturdays: string[] = [];
    const cursor = new Date(year, mon - 1, 1);
    while (cursor.getMonth() === mon - 1) {
      if (cursor.getDay() === 6) {
        saturdays.push(cursor.toISOString().slice(0, 10));
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    const saturdayList = saturdays.map(d => {
      const dt = new Date(d + "T12:00:00");
      return `${d} (${dt.toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short" })})`;
    }).join(", ");

    const prompt = `Generate a monthly content idea plan for Virtu Ferries — ${market} Market — for ${monthName}.

BRIEFING:
- Month: ${monthName} (${daysInMonth} days)
- Active offers: ${offers || "None specified"}
- Events from the brand library (holidays, festivals, key moments):
${dbEventsBlock}
- Additional events/context from the planner: ${events || "None"}
- Campaigns/partnerships: ${campaigns || "None specified"}
- Notes: ${other || "None"}

CONTENT HISTORY — PLANNED POSTS (recent months):
${historySnippet || "No previous posts yet."}

APPROVED PATTERNS: ${approvedSummary || "None yet"}
REJECTED PATTERNS: ${rejectedSummary || "None yet"}

PAST PUBLISHED CONTENT — UPLOADED HISTORY (real posts already live on social media):
${pastPostsSnippet}
Study these carefully: understand the tone, themes, hooks, and angles already used. Do NOT repeat the same hooks or caption structures. Build on what worked, avoid what felt repetitive.

MARKET FRAME — READ CAREFULLY:
${isEnglish ? `
English market — you are selling SICILY to MALTESE people and international travellers.
Malta is home base. Sicily is the exciting neighbour they should discover via VF.
Content pillars for English market:
  1. Why VF — make the crossing feel obvious and easy
  2. Why Sicily — sell Sicily as a destination worth visiting
  3. VF Recommends — curated Sicily tips, places, food, events (insider guide)
  4. Virtu Ferries Experience — on-board, UGC, real passengers, real crossings
  5. Sicily Experience — immersive, sensory Sicily content. No hard sell.
` : `
Italian market — you are selling MALTA to SICILIAN/ITALIAN travellers.
Sicily is home for your audience. Malta is the discovery they didn't know they needed.
DO NOT produce any content about Sicily or Sicilian destinations (your audience already lives there).
All destination content must be about Malta — Valletta, Mdina, Gozo, Maltese food, beaches, culture, history.

Content pillars for Italian market:
  1. Why VF — make the crossing from Pozzallo/Sicily to Malta feel obvious and easy
  2. Why Malta — sell Malta as a destination Sicilians should discover (Valletta, Gozo, beaches, history, events in Malta)
  3. VF Recommends Malta — curated Malta tips: restaurants, beaches, towns, activities — for a Sicilian visitor
  4. Virtu Ferries Experience — on-board, UGC, real Sicilian/Italian passengers crossing to Malta
  5. Malta Experience — immersive, sensory Malta content: Valletta colours, Maltese food, sea, light. No hard sell.

NEVER suggest Sicilian places (Noto, Siracusa, Palermo, Etna, Agrigento, Modica, etc.) — your audience is already in Sicily.
`}

HARD RULE — NON-NEGOTIABLE:
Every Saturday must have a "Weekly Schedule" post on Facebook. These are fixed, unmovable slots.
Saturdays in ${monthName}: ${saturdayList}
For EACH of these dates, you MUST include exactly one Facebook idea with:
  - pillar: "Why VF"
  - tone_register: "Operational"
  - format: "Single Image"
  - hook: "Weekly schedule post — publishing next week's sailing timetable"
  - visual_direction: "Schedule graphic showing next week's departures (Mon–Sun)"
  - cross_post: false (Facebook only — never cross-post the schedule)
These Saturday posts count toward the 25-post total. Do not place any other post on a Saturday without also including the schedule post.
${user_ideas && user_ideas.length > 0 ? `
BRAND MANAGER'S OWN IDEAS — ADD THESE DIRECTLY TO THE PLAN:
The brand manager has pre-decided these concepts. Add one idea for each entry below exactly as intended.
Choose a suitable date within ${monthName}, assign the right pillar, format, and tone — but the concept itself is fixed and must not be changed or merged with other posts.
Do NOT try to theme or orient the rest of the plan around these — just add them as individual entries, then fill the remaining free slots independently as you normally would.
Mark each of these ideas with "pinned": true in the JSON output.
Platform guidance: "Facebook" = Facebook only (cross_post: false); "Instagram" = Instagram only; "Both" = cross_post: true on Facebook + Instagram.
${user_ideas.map((idea, i) => `${i + 1}. [${idea.platform}] ${idea.text}`).join("\n")}

These count toward the 25-post total.
` : ""}${trending_format ? `
TRENDING FORMAT TO ADAPT THIS MONTH:
The brand manager has spotted this format working on social media and wants one post to use it, adapted to Virtu Ferries brand and audience:
"${trending_format}"
Include exactly one idea that uses this format — adapted on-brand, not copied verbatim. Add it as a regular (non-pinned) idea. It counts toward the 25-post total.
` : ""}
INSTRUCTIONS:
1. List notable cultural/seasonal moments that fall WITHIN ${monthName} (or in the first 2 weeks of the following month, for early lead-time planning). Return these as a "missed_windows" array of short plain strings — one per moment. Do NOT include any events from before ${monthName} starts, even if they were recently past. If an event date has already passed relative to the plan start, it is irrelevant — omit it entirely.

2. Generate exactly 25 Facebook ideas for the ${market} Market, spread across ${monthName}.
   ${saturdays.length} of the 25 slots are already fixed (the Saturday schedule posts above).
   ${user_ideas && user_ideas.length > 0 ? `${user_ideas.length} additional slot(s) are taken by the brand manager's own ideas listed above.` : ""}
   Fill the remaining ${25 - saturdays.length}${user_ideas && user_ideas.length > 0 ? ` (minus ${user_ideas.length} pinned)` : ""} slots with regular content ideas on non-Saturday dates (or additional Saturday slots if needed).
${isEnglish ? `
3. English market also runs Instagram (English, Maltese audience). The Saturday schedule posts cross-post to Instagram (cross_post: true). For all other Facebook ideas, set cross_post: true if the content works on Instagram as-is. If cross_post: false, add a SEPARATE Instagram idea for the same date and pillar (IG-native format, Maltese audience angle). Total Instagram ideas (cross-posted + IG-specific) must equal 25.` : `
3. Italian market is Facebook only. cross_post: always false. Do NOT generate any Instagram ideas.`}

4. Each idea must have:
   - scheduled_date: YYYY-MM-DD (within ${month})
   - platform: "Facebook" or "Instagram"
   - pillar: one of the 5 pillars for this market (listed above)
   - format: "Single Image", "Carousel", "Reel", or "Video"
   - tone_register: e.g. "Destination Spotlight", "Offer / Promotion", "Journey Moment", "Community & Culture", "Operational"
   - visual_direction: one-line visual brief describing the image/video to use — write as a sourcing direction, NOT a shoot instruction. The team uses stock libraries and footage found on social channels (no original filming). E.g. "Stock: aerial view of Valletta harbour at golden hour" or "Social-source: UGC clip of passengers on deck arriving in Sicily". Must match the destination or subject being featured.
   - hook: one punchy line describing the creative concept — NOT a caption, just the idea
   - cross_post: true or false
   - market: "${market} Market"
   - pinned: true ONLY for the brand manager's own ideas listed above; false (or omit) for all AI-generated ideas

5. POSTING STRUCTURE — follow this formula for the non-Saturday free slots (approximately ${25 - saturdays.length} posts, adjusted for pinned ideas):

   PILLAR TARGETS (non-Saturday slots):
   - Why VF: exactly 3 posts — ALL 3 must be offer/promotion posts (tone_register: "Offer / Promotion"). The Saturday schedule posts already handle the brand-building side of Why VF, so these 3 slots are purely commercial.
   - Why Sicily / Why Malta: ~5 posts (core destination selling — highest volume)
   - VF Recommends: ~5 posts (tips, guides, itineraries — drives saves)
   - VF Experience: ~4 posts (on-board, crew, UGC, social proof)
   - Sicily / Malta Experience: ~4 posts (immersive, sensory, no hard sell)

   FORMAT TARGETS (non-Saturday slots):
   - Single Image: ~10 posts
   - Carousel: ~6 posts (guides, lists, multi-shot series)
   - Reel: ~4 posts (experience, destination, movement)
   - Video: ~1 post (one quality long-form per month)

   These are targets, not rigid constraints — adjust slightly around pinned ideas and trending format posts. Stay within ±1 of each target.

Return ONLY valid JSON:
{
  "missed_windows": [],
  "ideas": [ /* all ideas: FB + IG if English market; FB only if Italian */ ]
}`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 6000,
      system: getBrandGuidelinesPrompt(req.brandId),
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.content[0]?.type === "text" ? response.content[0].text : "{}";
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
    let parsed: { missed_windows?: string[]; ideas?: unknown[] };
    try { parsed = JSON.parse(cleaned); }
    catch { res.status(500).json({ error: "AI returned invalid JSON" }); return; }

    res.json({ month, market, missed_windows: parsed.missed_windows ?? [], ideas: parsed.ideas ?? [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate ideas" });
  }
});

// ─── POST /api/content/generate-copy ─────────────────────────────────────────
// Phase 2 of 2: write captions for approved ideas
router.post("/content/generate-copy", async (req, res): Promise<void> => {
  if (!isAiContentGenerationConfigured(req.brandSlug)) {
    res.status(400).json(aiNotConfiguredResponse(req.brandSlug));
    return;
  }
  const { ideas } = req.body as {
    ideas: Array<{
      scheduled_date: string; platform: string; pillar: string; format: string;
      tone_register: string; visual_direction: string; hook: string;
      cross_post: boolean; market: string; user_note?: string;
    }>;
  };

  if (!ideas || !Array.isArray(ideas) || ideas.length === 0) {
    res.status(400).json({ error: "ideas array required" });
    return;
  }

  try {
    const ideasText = ideas.map((idea, i) =>
      `[${i + 1}] ${idea.platform} | ${idea.market} | ${idea.scheduled_date}
  Pillar: ${idea.pillar} | Format: ${idea.format} | Tone: ${idea.tone_register}
  Visual: ${idea.visual_direction}
  Concept hook: ${idea.hook}${idea.user_note ? `\n  Creator note: ${idea.user_note}` : ""}`
    ).join("\n\n");

    const prompt = `Write captions for the following ${ideas.length} approved content ideas for Virtu Ferries.

MARKET FRAME — CRITICAL:
- English market: selling SICILY to Maltese/international travellers. English language on both FB and Instagram.
- Italian market: selling MALTA to Sicilian/Italian travellers. Italian language on Facebook.
  Italian captions must be about Malta (Valletta, Gozo, Mdina, Maltese food, culture, etc.).
  NEVER mention Sicilian places in Italian market copy — the audience is already in Sicily.
- Instagram: ALWAYS English, targeting the Maltese audience.

${ideasText}

INSTRUCTIONS:
- Write a full, platform-native, on-brand caption for each idea.
- Facebook captions can be longer (2–4 sentences + hashtags if relevant).
- Instagram captions should be tighter, more visual, often shorter — always in English.
- Italian Facebook captions must be written in Italian and must sell Malta, not Sicily.
- Honour the tone register, pillar, and creative concept hook exactly.
- Also provide a cta (call to action string or null).

Return ONLY valid JSON — an array of ${ideas.length} objects in the same order as the input:
[
  {
    "index": 1,
    "caption": "...",
    "cta": "..."
  },
  ...
]`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: getBrandGuidelinesPrompt(req.brandId),
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.content[0]?.type === "text" ? response.content[0].text : "[]";
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
    let parsed: Array<{ index: number; caption: string; cta: string | null }>;
    try { parsed = JSON.parse(cleaned); }
    catch { res.status(500).json({ error: "AI returned invalid JSON" }); return; }

    // Merge captions back into ideas
    const result = ideas.map((idea, i) => {
      const copy = parsed.find(p => p.index === i + 1) ?? parsed[i];
      return { ...idea, caption: copy?.caption ?? "", cta: copy?.cta ?? null };
    });

    res.json({ posts: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate copy" });
  }
});

// ─── POST /api/content/rewrite-note ──────────────────────────────────────────
// Rewrite a rough internal note into a clear, concise content brief
router.post("/content/rewrite-note", async (req, res): Promise<void> => {
  if (!isAiContentGenerationConfigured(req.brandSlug)) {
    res.status(400).json(aiNotConfiguredResponse(req.brandSlug));
    return;
  }
  const { note, platform, market, pillar, format, tone_register } = req.body as {
    note: string;
    platform?: string;
    market?: string;
    pillar?: string;
    format?: string;
    tone_register?: string;
  };

  if (!note?.trim()) { res.status(400).json({ error: "note is required" }); return; }

  const context = [
    platform && `Platform: ${platform}`,
    market && `Market: ${market}`,
    pillar && `Content pillar: ${pillar}`,
    format && `Format: ${format}`,
    tone_register && `Tone: ${tone_register}`,
  ].filter(Boolean).join("\n");

  const prompt = `You are a senior social media strategist for Virtu Ferries (high-speed catamaran Malta ↔ Sicily).

Rewrite the rough internal note below into a clear, concise brief that a copywriter or designer can act on immediately. 

STRICT RULES:
- Only rewrite what is in the note. Do NOT add information from the post context.
- Do NOT mention platform, market, pillar, format, or tone — those are captured separately in the post fields.
- Preserve every fact, instruction, link, and intent from the original note exactly.
- Fix grammar, remove filler, improve clarity and structure only.
- Keep it short: 1–4 sentences maximum.
${context ? `\nPOST CONTEXT (for understanding only — do NOT echo back into the note):\n${context}\n` : ""}
ROUGH NOTE:
${note.trim()}

Return ONLY valid JSON:
{ "note": "..." }`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });
    const raw = response.content[0]?.type === "text" ? response.content[0].text : "{}";
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
    let parsed: { note: string };
    try { parsed = JSON.parse(cleaned); }
    catch { res.status(500).json({ error: "AI returned invalid JSON" }); return; }
    res.json({ note: parsed.note ?? "" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to rewrite note" });
  }
});

// ─── POST /api/content/quick-copy ────────────────────────────────────────────
// ─── Situation playbooks ──────────────────────────────────────────────────────
// Each post type triggers a distinct register. These override generic guidance.
const SITUATION_PLAYBOOKS: Record<string, string> = {
  "Weekly Schedule": `GOAL: Tell the audience which days the boat is crossing this week. Frequency and flexibility ARE the message.

REGISTER: Informative, useful, human. Not editorial. Not aspirational. Calm.
This is the post that earns trust by being clear. Beauty is not the job here. Clarity is.

STRUCTURE (in this order, no exceptions):
1. Open with a calendar emoji (📅) immediately followed by a short orienting line — what week, what's running, no preamble.
2. Either list the days inline (Mon, Wed, Fri, Sat) OR a one-line frame ("Five crossings this week. Pick your day.").
3. End with the timetable link as the last beat — virtuferries.com.

LENGTH: 2 short paragraphs maximum. Tight. Scannable.

OPENERS THAT WORK: "📅 This week's crossings.", "📅 Five sailings this week."
OPENERS BANNED: "The schedule is live", "Just dropped", "Now available", "We're excited to share", any launch framing.

CLOSER: A direct line that ends with the link. Never "Book now!". Closer to: "Full timetable at virtuferries.com."

NEVER:
- Frame this as news or a launch.
- Use atmospheric writing ("the sea is calling…").
- Add a CTA like "Book now". The link is the CTA.
- Use more than one emoji.`,

  "Offer / Promotion": `GOAL: Make someone feel the value, then deliver the price. Conversion-focused but never shouty.

REGISTER: Confident, low-pressure, premium. Like a friend telling you about a good deal — not a discount-bin advert.

STRUCTURE (in this order, no exceptions):
1. Lead line = the human benefit, not the number. ("Out Saturday night, home Sunday morning." "Two islands, one day.")
2. The price drops in the SECOND beat — never the headline. Frame it as a fact, not a sales pitch.
3. Soft close that nudges to virtuferries.com. Woven into the body, not a standalone line.

LENGTH: 2–3 short paragraphs. Build to the price; do not lead with it.

OPENERS BANNED: "Don't miss out", "Limited time only", "Hurry", "Last chance", "Book now and save", anything with an exclamation mark in the first line.
WORDS BANNED HERE: "deal", "discount", "save", "promotion", "exclusive offer".

NEVER:
- Open with the price (€63.60 is not a headline).
- Use urgency theatre. The offer is good — the writing should reflect that, not beg.
- Stack adjectives in the lead line.
- Use more than one emoji.`,

  "Event": `GOAL: Make the event feel worth the trip. The ferry is the means; the event is the reason.

REGISTER: Knowledgeable, evocative, present-tense. You are the friend who already booked.

STRUCTURE:
1. Lead with the event itself — a sensory or specific detail (sound, smell, scene), not the date.
2. Anchor the practical detail (when, where) in a tight middle beat.
3. Close with the implicit case for getting there: "1h 45 by sea." or "Leave Malta in the morning, back for dinner."

LENGTH: 2–3 short paragraphs.

NEVER:
- Treat it like an event listing ("Date: 15 May. Location: Catania. Tickets: €20.").
- Frame the ferry as the headline — the event is.
- Use "Don't miss out" or "save the date".
- Use more than one emoji.`,

  "Destination Spotlight": `GOAL: Make people want to go to a specific place. Earn the save.

REGISTER: Editorial. Specific. Confident. The friend who has been everywhere in Sicily and knows where to go.

STRUCTURE:
1. Lead with the place by name AND a specific, image-forward detail. Not "the charming town of X" — a fact, a moment, a single sense.
2. Middle beat = one more reason that isn't obvious (a dish, a side street, a time of day, a viewpoint).
3. Close with implicit invitation, never explicit. The place sells itself once you've named it well.

LENGTH: 2–3 short paragraphs. Carousel-friendly first line if Instagram.

NEVER:
- Use "discover", "hidden gem", "must-see", "off the beaten path", "instagrammable".
- Sound like a tourism board or a TripAdvisor entry.
- Stack adjectives. One specific noun beats three vague modifiers.
- Mention the ferry directly. The audience knows how they get there.
- Use more than one emoji.`,

  "Seasonal / Cultural": `GOAL: Tap into a season, holiday, or cultural moment without feeling forced.

REGISTER: Warm, knowing, low-effort. Like something a local would say, not a brand.

STRUCTURE:
1. Lead with the seasonal hook — but specific, not generic. ("The first Saturday it's warm enough to sit outside in shorts.")
2. Tie it to Sicily/Malta in the lightest possible way — implication, not declaration.
3. Close with rhythm, not a CTA. Earn the like, not the click.

LENGTH: 1–2 short paragraphs. Often shorter is better.

NEVER:
- Use generic seasonal filler ("Summer is just around the corner!").
- Force a calendar peg the audience doesn't care about.
- Add a CTA — this is mood, not conversion.
- Use more than one emoji (often zero is right).`,

  "Behind the Scenes": `GOAL: Trust and warmth. Show the people, the boat, the small unglamorous moments. Earn affection.

REGISTER: Genuine, observational, unhurried. No marketing voice. Documentary, not commercial.

STRUCTURE:
1. Lead with a small, specific moment — a person, a gesture, a routine. Not "Meet our amazing crew!".
2. One short detail or quote that humanises it.
3. Close with a beat that feels like a quiet exhale, not a sell.

LENGTH: 2 short paragraphs. White space matters.

NEVER:
- Use "Meet the team", "behind the scenes magic", "what makes us special".
- Add a booking CTA — this is brand affection, not conversion.
- Frame it as a brag.
- Use more than one emoji.`,

  "General": `GOAL: A clean, on-brand caption when no specific situation applies.

REGISTER: Default brand voice — short, confident, specific. Lead with the feeling. End on a statement.

STRUCTURE: 1–3 short paragraphs. The shorter the stronger.
CTA: Only if the brief calls for it, woven into the body.`,
};

// Standalone copywriter: write a single caption from a free-form brief
router.post("/content/quick-copy", async (req, res): Promise<void> => {
  if (!isAiContentGenerationConfigured(req.brandSlug)) {
    res.status(400).json(aiNotConfiguredResponse(req.brandSlug));
    return;
  }
  const { platform, market, brief, pillar, format, post_type, tone_notes, reference_url, feedback, example_copies } = req.body as {
    platform?: "Facebook" | "Instagram";
    market?: "English" | "Italian";
    brief: string;
    pillar?: string;
    format?: string;
    post_type?: string;
    tone_notes?: string;
    reference_url?: string;
    feedback?: string;
    example_copies?: string[];
  };

  // ─── GHS path: voice-profile driven, minimal prompt ──────────────────────
  // Gozo Highspeed uses one unified voice. The form only collects post type +
  // brief; the AI gets just the matching voice profile + brief + brand
  // guidelines + a small "never reproduce" library guardrail. No past-posts
  // dump, no playbook, no style examples soup.
  if (req.brandSlug === "gozo-highspeed") {
    if (!post_type) { res.status(400).json({ error: "post_type is required" }); return; }
    if (!brief?.trim()) { res.status(400).json({ error: "brief is required" }); return; }
    try {
      const [profileRow] = await db.select().from(voiceProfilesTable)
        .where(and(eq(voiceProfilesTable.brand_id, req.brandId), eq(voiceProfilesTable.post_type, post_type)))
        .limit(1);
      if (!profileRow) {
        res.status(400).json({ error: `No voice profile defined for "${post_type}". Set one up in the Knowledge Base.` });
        return;
      }
      const [rulesRows, libraryRows] = await Promise.all([
        db.select().from(copywriterRulesTable)
          .where(eq(copywriterRulesTable.brand_id, req.brandId)).limit(1),
        db.select().from(copywriterFeedbackTable)
          .where(and(eq(copywriterFeedbackTable.brand_id, req.brandId), eq(copywriterFeedbackTable.type, "approved")))
          .orderBy(desc(copywriterFeedbackTable.created_at)).limit(40),
      ]);
      const customRules = rulesRows[0]?.content ?? DEFAULT_COPYWRITER_RULES;
      const neverRepeat = libraryRows.length > 0
        ? `\nALREADY-USED CAPTIONS (do not reproduce or closely paraphrase):\n${libraryRows.map((f, i) => `[${i + 1}] ${f.caption?.trim() ?? ""}`).join("\n\n")}`
        : "";
      const feedbackBlock = feedback?.trim()
        ? `\nFEEDBACK ON PREVIOUS VERSION (fix these specific issues):\n${feedback.trim()}`
        : "";

      const prompt = `Write ONE ready-to-publish social media caption for Gozo Highspeed.

POST TYPE: ${post_type}

VOICE PROFILE — follow this exactly:
- Tone: ${profileRow.tone || "(not set)"}
- Length: ${profileRow.length || "(not set)"}
- Opening: ${profileRow.opening || "(not set)"}
- CTA: ${profileRow.cta || "(not set)"}
- Avoid: ${profileRow.avoid || "(nothing flagged)"}
${profileRow.anchor_example ? `- Anchor caption (style reference only — do NOT reproduce):\n  "${profileRow.anchor_example}"` : ""}

POST BRIEF — what this specific post is about:
${brief.trim()}

BRIEF FIDELITY — this is the most important rule:
- Every fact in the brief is authoritative. Reproduce dates, days of the week, times, route names, prices, fleet names, and reasons EXACTLY as written.
- Do not "correct", round, reformat, or substitute any fact. If the brief says "Friday 12 May", the caption must say "Friday 12 May" — never any other date or day.
- If a fact in the brief looks inconsistent (e.g. wrong day-of-week for the date), keep the brief's wording verbatim. Do not silently fix it.
- Do not invent facts the brief doesn't supply (no times, no fleet names, no prices, no reasons). If something isn't in the brief, leave it out.
${feedbackBlock}
${neverRepeat}

GLOBAL COPYWRITING RULES (non-negotiable):
${customRules}

Return ONLY valid JSON with this exact shape:
{ "caption": "..." }`;

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        system: getBrandGuidelinesPrompt(req.brandId),
        messages: [{ role: "user", content: prompt }],
      });
      const raw = response.content[0]?.type === "text" ? response.content[0].text : "{}";
      const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
      let parsed: { caption: string };
      try { parsed = JSON.parse(cleaned); }
      catch { res.status(500).json({ error: "AI returned invalid JSON" }); return; }
      res.json({ caption: parsed.caption ?? "" });
      return;
    } catch (err) {
      req.log.error({ err }, "Failed to generate GHS copy");
      res.status(500).json({ error: "Failed to generate copy" });
      return;
    }
  }

  // ─── Default (Virtu Ferries) path: legacy multi-context prompt ───────────
  if (!platform || !market) { res.status(400).json({ error: "platform and market are required" }); return; }
  try {
    // Pull a lightweight preference snapshot for context
    const [decisions, pastPosts, cwRejections, rulesRows] = await Promise.all([
      db.select({
        decision: approvalDecisionsTable.decision,
        rejection_reason: approvalDecisionsTable.rejection_reason,
        pillar: contentPostsTable.pillar,
        market: contentPostsTable.market,
      }).from(approvalDecisionsTable)
        .innerJoin(contentPostsTable, eq(approvalDecisionsTable.post_id, contentPostsTable.id))
        .where(eq(contentPostsTable.brand_id, req.brandId))
        .limit(60),
      db.select().from(pastPostsTable)
        .where(eq(pastPostsTable.brand_id, req.brandId))
        .orderBy(desc(pastPostsTable.date)).limit(20),
      db.select().from(copywriterFeedbackTable)
        .where(eq(copywriterFeedbackTable.brand_id, req.brandId))
        .orderBy(desc(copywriterFeedbackTable.created_at))
        .limit(100),
      db.select().from(copywriterRulesTable)
        .where(eq(copywriterRulesTable.brand_id, req.brandId))
        .limit(1),
    ]);

    const customRules = rulesRows[0]?.content ?? DEFAULT_COPYWRITER_RULES;

    const allApproved = cwRejections.filter(f => f.type === "approved" && f.caption);
    const styleExamples = allApproved.slice(0, 5);
    const rejectedNotes = [
      ...new Set([
        ...decisions.filter(d => d.decision === "rejected" && d.rejection_reason).map(d => d.rejection_reason!),
        ...cwRejections.filter(f => f.type === "rejected" && f.note).map(f => f.note!),
      ])
    ].slice(0, 10);

    const pastSnippet = [
      pastPosts.length > 0
        ? `\nRECENT PUBLISHED POSTS (for tone/style reference):\n${pastPosts.slice(0, 10).map(p =>
            `- [${p.direction ? p.direction + " · " : ""}${p.market ?? ""} · ${p.caption.slice(0, 120)}]`
          ).join("\n")}`
        : "",
      styleExamples.length > 0
        ? `\nCOPYWRITER-APPROVED CAPTIONS (match this energy and style, but write something NEW — do not reproduce these):\n${styleExamples.map(f =>
            `- [${f.post_type ?? ""}${f.market ? " · " + f.market : ""}] ${f.caption!.slice(0, 150)}`
          ).join("\n")}`
        : "",
    ].filter(Boolean).join("");

    const avoidBlock = rejectedNotes.length > 0
      ? `\nAVOID (patterns the team has flagged as not working):\n${rejectedNotes.map(r => `- ${r}`).join("\n")}`
      : "";

    const neverRepeatBlock = allApproved.length > 0
      ? `\nAPPROVED LIBRARY — NEVER REPRODUCE THESE (these captions are already saved; producing the same or near-identical copy is useless):\n${allApproved.map((f, i) =>
          `[${i + 1}] ${f.caption!.trim()}`
        ).join("\n\n")}`
      : "";

    const isItalian = market === "Italian";
    const isInstagram = platform === "Instagram";

    const examplesBlock = example_copies && example_copies.length > 0
      ? `\nEXAMPLE CAPTIONS THAT WORKED WELL (match this style and energy):\n${example_copies.map((c, i) => `--- Example ${i + 1} ---\n${c}`).join("\n\n")}\n---`
      : "";

    const feedbackBlock = feedback?.trim()
      ? `\nFEEDBACK ON PREVIOUS VERSION (fix these specific issues in the new version):\n${feedback.trim()}`
      : "";

    const playbook = SITUATION_PLAYBOOKS[post_type ?? ""] ?? "";
    const playbookBlock = playbook
      ? `\n--- SITUATION PLAYBOOK: ${post_type?.toUpperCase()} ---\nThese rules OVERRIDE generic guidance for this specific post type. Treat them as non-negotiable.\n\n${playbook}\n--- END PLAYBOOK ---\n`
      : "";

    const prompt = `Write ONE ready-to-publish social media caption for Virtu Ferries.

PLATFORM: ${platform}
MARKET: ${market} (${isItalian ? "selling MALTA to Sicilian/Italian travellers — write in Italian" : "selling SICILY to Maltese/international travellers — write in English"})
${pillar ? `CONTENT PILLAR: ${pillar}` : ""}
${post_type ? `POST TYPE / TONE: ${post_type}` : ""}
${format ? `FORMAT: ${format}` : ""}
${brief?.trim() ? `POST BRIEF:\n${brief.trim()}` : "POST BRIEF: No specific brief provided — use the platform, market, post type, and past post style to generate a strong on-brand caption."}
${tone_notes ? `\nTONE / EXTRA INSTRUCTIONS:\n${tone_notes}` : ""}
${reference_url ? `\nREFERENCE POST (use for format/style inspiration only): ${reference_url}` : ""}
${playbookBlock}
${examplesBlock}
${feedbackBlock}
${pastSnippet}
${avoidBlock}
${neverRepeatBlock}

COPYWRITING RULES (team-defined, non-negotiable):
${customRules}

ADDITIONAL RULES:
- NEVER reproduce, closely rephrase, or reuse any caption from the APPROVED LIBRARY above.
- ${isItalian ? "Write in Italian. Audience is Sicilian/Italian. Sell Malta. Never mention Sicilian places." : "Write in English. Audience is Maltese. Sell Sicily. Never mention Malta as a destination."}
- ${isInstagram ? "Instagram: tight, visual, punchy. Lead line hooks within 125 characters." : "Facebook: 2–3 short sentences max. Conversational but never chatty."}
- End with a CTA woven naturally into the caption body — never as a separate line.
${feedback ? "- Address all feedback points from the previous version." : ""}

Return ONLY valid JSON with this exact shape:
{
  "caption": "..."
}`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: getBrandGuidelinesPrompt(req.brandId),
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.content[0]?.type === "text" ? response.content[0].text : "{}";
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
    let parsed: { caption: string };
    try { parsed = JSON.parse(cleaned); }
    catch { res.status(500).json({ error: "AI returned invalid JSON" }); return; }

    res.json({ caption: parsed.caption ?? "" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate copy" });
  }
});

// ─── POST /api/content/copywriter-feedback ────────────────────────────────────
// Store thumbs-up / thumbs-down feedback from the Copywriter tool
router.post("/content/copywriter-feedback", async (req, res): Promise<void> => {
  const { type, caption, platform, market, post_type, note } = req.body as {
    type: "approved" | "rejected";
    caption?: string;
    platform?: string;
    market?: string;
    post_type?: string;
    note?: string;
  };
  if (!type || !["approved", "rejected"].includes(type)) {
    res.status(400).json({ error: "type must be 'approved' or 'rejected'" });
    return;
  }
  try {
    const [row] = await db.insert(copywriterFeedbackTable).values({ brand_id: req.brandId, type, caption, platform, market, post_type, note }).returning();
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save feedback" });
  }
});

// ─── GET /api/content/copywriter-library ──────────────────────────────────────
// Return all approved copywriter captions (the library)
router.get("/content/copywriter-library", async (req, res): Promise<void> => {
  try {
    const rows = await db.select().from(copywriterFeedbackTable)
      .where(and(eq(copywriterFeedbackTable.brand_id, req.brandId), eq(copywriterFeedbackTable.type, "approved")))
      .orderBy(desc(copywriterFeedbackTable.created_at));
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch library" });
  }
});

// ─── POST /api/content/copywriter-library ─────────────────────────────────────
router.post("/content/copywriter-library", async (req, res): Promise<void> => {
  const { caption, platform, market, post_type, note } = req.body as {
    caption: string; platform?: string; market?: string; post_type?: string; note?: string;
  };
  if (!caption?.trim()) { res.status(400).json({ error: "caption is required" }); return; }
  try {
    const [row] = await db.insert(copywriterFeedbackTable).values({
      brand_id: req.brandId,
      type: "approved",
      caption: caption.trim(),
      platform: platform?.trim() || null,
      market: market?.trim() || null,
      post_type: post_type?.trim() || null,
      note: note?.trim() || null,
    }).returning();
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save entry" });
  }
});

// ─── DELETE /api/content/copywriter-library/:id ───────────────────────────────
router.delete("/content/copywriter-library/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }
  try {
    const deleted = await db.delete(copywriterFeedbackTable)
      .where(and(eq(copywriterFeedbackTable.id, id), eq(copywriterFeedbackTable.brand_id, req.brandId)))
      .returning();
    if (deleted.length > 0) await recordTombstone("copywriter_feedback", id);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete entry" });
  }
});

// ─── Copywriter rules default content ────────────────────────────────────────
const DEFAULT_COPYWRITER_RULES = `THE VOICE IN ONE LINE
Short. Confident. Specific. Never explains itself.

WHAT THIS VOICE DOES
- One idea per caption. That is enough.
- Ends on a statement, not a question.
- Specific over general. Always.
- Confident without describing. Show, don't enthuse.
- Never tells the audience what to feel.
- Rhythm matters. Read it aloud. If it doesn't land, it isn't done.
- Maximum 3 short paragraphs. Usually fewer.

WHAT TO NEVER DO
- Never write more than 3 short paragraphs.
- Never open with a scene-setting sentence. ("May is one of those months...", "There's something about this time of year..." are banned.)
- Never explain why Sicily or Malta is good. State the fact, let the destination carry it.
- Never use atmospheric filler. Banned: "the light is something else entirely", "the heat is building", "the crowds haven't arrived yet", "the air is different", "something about this season", "there's nowhere quite like".
- Never sound like a tourism board. If it could appear in a travel brochure, rewrite it.
- Never use hashtags. Not one.
- Never use an em dash with spaces (" — " or "— "). Use a comma, line break, or full stop instead.
- Never write "the schedule is live", "just dropped", or "now available" — the timetable is always there.

HARD RULES
- No hashtags ever.
- One exclamation mark maximum per caption, only when earned.
- CTAs only when they add something. Woven into the caption — never as a standalone line.
- Sentence length: vary it. Short punches matter. So does rhythm.

WEEKLY SCHEDULE — SPECIFIC STANDARD
The weekly schedule runs every Saturday. Caption frame: here's what's crossing this week, pick your day.
Tone: informative but human. Flexibility and frequency are the message.
Open with a calendar emoji. End with the timetable link.
Never frame it as an announcement or a launch.

OFFER COPY
Lead with the human benefit, not the price.
"€63.60" is not a headline. Build to the number.
Always direct to virtuferries.com for booking.

NEVER USE THESE WORDS
paradise, breathtaking, unforgettable, hidden gem, postcard-perfect, magical, stunning, incredible, vibrant, bustling`.trim();

// ─── GET /api/content/copywriter-rules ────────────────────────────────────────
router.get("/content/copywriter-rules", async (req, res): Promise<void> => {
  try {
    const [row] = await db.select().from(copywriterRulesTable)
      .where(eq(copywriterRulesTable.brand_id, req.brandId))
      .limit(1);
    if (!row) {
      // Seed Virtu's curated default rules; other brands start with the same neutral baseline so the editor isn't blank.
      const [seeded] = await db.insert(copywriterRulesTable)
        .values({ brand_id: req.brandId, content: DEFAULT_COPYWRITER_RULES })
        .returning();
      res.json({ content: seeded.content, updated_at: seeded.updated_at });
    } else {
      res.json({ content: row.content, updated_at: row.updated_at });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch rules" });
  }
});

// ─── PUT /api/content/copywriter-rules ────────────────────────────────────────
router.put("/content/copywriter-rules", async (req, res): Promise<void> => {
  const { content } = req.body as { content: string };
  if (typeof content !== "string" || !content.trim()) {
    res.status(400).json({ error: "content is required" });
    return;
  }
  try {
    const [existing] = await db.select().from(copywriterRulesTable)
      .where(eq(copywriterRulesTable.brand_id, req.brandId))
      .limit(1);
    if (existing) {
      const [updated] = await db.update(copywriterRulesTable)
        .set({ content: content.trim(), updated_at: new Date() })
        .where(and(eq(copywriterRulesTable.id, existing.id), eq(copywriterRulesTable.brand_id, req.brandId)))
        .returning();
      res.json({ content: updated.content, updated_at: updated.updated_at });
    } else {
      const [created] = await db.insert(copywriterRulesTable)
        .values({ brand_id: req.brandId, content: content.trim() })
        .returning();
      res.json({ content: created.content, updated_at: created.updated_at });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save rules" });
  }
});

// ─── GET /api/content/voice-profiles ──────────────────────────────────────────
// Per-post-type voice profile (currently used by Gozo Highspeed). Returns all
// profiles for the active brand. Caller decides which post types are valid.
router.get("/content/voice-profiles", async (req, res): Promise<void> => {
  try {
    const rows = await db.select().from(voiceProfilesTable)
      .where(eq(voiceProfilesTable.brand_id, req.brandId))
      .orderBy(voiceProfilesTable.post_type);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch voice profiles");
    res.status(500).json({ error: "Failed to fetch voice profiles" });
  }
});

// ─── PUT /api/content/voice-profiles/:postType ────────────────────────────────
// Upsert one voice profile for the active brand + post type combo.
router.put("/content/voice-profiles/:postType", async (req, res): Promise<void> => {
  const postType = decodeURIComponent(req.params.postType ?? "").trim();
  if (!postType) { res.status(400).json({ error: "postType is required" }); return; }
  const { tone, length, opening, cta, avoid, anchor_example } = req.body as {
    tone?: string; length?: string; opening?: string;
    cta?: string; avoid?: string; anchor_example?: string;
  };
  const values = {
    tone: (tone ?? "").trim(),
    length: (length ?? "").trim(),
    opening: (opening ?? "").trim(),
    cta: (cta ?? "").trim(),
    avoid: (avoid ?? "").trim(),
    anchor_example: (anchor_example ?? "").trim(),
  };
  try {
    const [existing] = await db.select().from(voiceProfilesTable)
      .where(and(eq(voiceProfilesTable.brand_id, req.brandId), eq(voiceProfilesTable.post_type, postType)))
      .limit(1);
    if (existing) {
      const [updated] = await db.update(voiceProfilesTable)
        .set({ ...values, updated_at: new Date() })
        .where(eq(voiceProfilesTable.id, existing.id))
        .returning();
      res.json(updated);
    } else {
      const [created] = await db.insert(voiceProfilesTable)
        .values({ brand_id: req.brandId, post_type: postType, ...values })
        .returning();
      res.json(created);
    }
  } catch (err) {
    req.log.error({ err }, "Failed to save voice profile");
    res.status(500).json({ error: "Failed to save voice profile" });
  }
});

// ─── POST /api/content/generate-plan ─────────────────────────────────────────
// Loads context, runs briefing, generates English + Italian plans via AI
router.post("/content/generate-plan", async (req, res): Promise<void> => {
  if (!isAiContentGenerationConfigured(req.brandSlug)) {
    res.status(400).json(aiNotConfiguredResponse(req.brandSlug));
    return;
  }
  const {
    month,
    market,
    offers,
    events,
    campaigns,
    format_priorities,
    other,
  } = req.body as {
    month: string;
    market: string;
    offers?: string;
    events?: string;
    campaigns?: string;
    format_priorities?: string;
    other?: string;
  };

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    res.status(400).json({ error: "month required (YYYY-MM)" });
    return;
  }

  try {
    // Load history
    const allPosts = await db
      .select({
        market: contentPostsTable.market,
        platform: contentPostsTable.platform,
        pillar: contentPostsTable.pillar,
        tone_register: contentPostsTable.tone_register,
        format: contentPostsTable.format,
        caption: contentPostsTable.caption,
        visual_direction: contentPostsTable.visual_direction,
        month: contentPostsTable.month,
        status: contentPostsTable.status,
      })
      .from(contentPostsTable)
      .where(eq(contentPostsTable.brand_id, req.brandId));

    // Load preferences
    const decisions = await db
      .select({
        decision: approvalDecisionsTable.decision,
        rejection_reason: approvalDecisionsTable.rejection_reason,
        pillar: contentPostsTable.pillar,
        tone_register: contentPostsTable.tone_register,
        format: contentPostsTable.format,
        market: contentPostsTable.market,
      })
      .from(approvalDecisionsTable)
      .innerJoin(contentPostsTable, eq(approvalDecisionsTable.post_id, contentPostsTable.id))
      .where(eq(contentPostsTable.brand_id, req.brandId));

    const approvedSummary = decisions.filter(d => d.decision === "approved")
      .slice(0, 15)
      .map(d => `${d.pillar}/${d.tone_register}/${d.format} (${d.market})`)
      .join(", ");

    const rejectedSummary = decisions.filter(d => d.decision === "rejected")
      .slice(0, 10)
      .map(d => `${d.pillar}/${d.tone_register}: ${d.rejection_reason ?? "no reason"}`)
      .join("; ");

    const historySnippet = allPosts.slice(-30).map(p =>
      `[${p.month}] ${p.market} | ${p.platform} | ${p.pillar} | ${p.format} | "${p.caption.slice(0, 60)}..."`
    ).join("\n");

    // Parse month
    const [year, mon] = month.split("-").map(Number);
    const monthName = new Date(year, mon - 1, 1).toLocaleString("en-GB", { month: "long", year: "numeric" });
    const daysInMonth = new Date(year, mon, 0).getDate();

    const [y, m] = month.split("-").map(Number);
    const includeEnglish = market === "English" || market === "Both";
    const includeItalian = market === "Italian" || market === "Both";

    const context = `BRIEFING:
- Month: ${monthName} (${daysInMonth} days)
- Active offers: ${offers || "None specified"}
- Events in Malta or Sicily: ${events || "None specified"}
- Campaigns/partnerships: ${campaigns || "None specified"}
- Format priorities/restrictions: ${format_priorities || "None specified"}
- Additional notes: ${other || "None"}

PREVIOUS CONTENT HISTORY (last 30 posts):
${historySnippet || "No previous posts yet."}

APPROVAL PATTERNS:
- Approved: ${approvedSummary || "No approval data yet"}
- Rejected: ${rejectedSummary || "No rejection data yet"}`;

    function buildPrompt(marketLabel: string, isItalian: boolean, missedWindows?: string[]) {
      return `You are generating a monthly social media content plan for Virtu Ferries — ${marketLabel} — for ${monthName}.

${context}

${missedWindows ? `CULTURAL WINDOWS ALREADY FLAGGED (do not repeat these):
${missedWindows.join("\n")}` : ""}

INSTRUCTIONS:
${!missedWindows ? `1. List any significant Mediterranean cultural moments, Maltese/Sicilian events, or travel calendar moments in ${monthName} the brand risks missing. Return these as "missed_windows" (array of strings). If none, return [].` : `1. missed_windows: return [] (already identified in first call).`}

2. Generate exactly 25 Facebook posts for the ${marketLabel}, spread evenly across ${monthName} (one per day roughly).

${isItalian ? `3. INSTAGRAM (Italian market only):
   For each of the 25 Facebook posts, decide:
     cross_post: true  → same post goes on IG as-is (no extra entry needed)
     cross_post: false → add a SEPARATE Instagram entry for that date, same pillar, IG-native caption and shorter format
   Cross-post when: image/video-led, destination, experiential, sensory, no link needed.
   Platform-specific IG post when: FB post has a booking link, is long-form, or is FB-native.
   Total IG posts (cross-posted + IG-specific) must equal 25.` : `3. cross_post: always false (English market has no Instagram).`}

4. Each post must have:
   - scheduled_date: YYYY-MM-DD (within ${month})
   - platform: "Facebook" or "Instagram"
   - pillar: one of the 5 brand pillars
   - format: "Single Image", "Carousel", "Reel", or "Video"
   - tone_register: e.g. "Destination Spotlight", "Offer / Promotion", "Journey Moment", "Community & Culture"
   - caption: full written caption, platform-native, on-brand
   - visual_direction: one-line sourcing direction (stock library or social-channel find — no original filming)
   - cta: call to action string or null
   - cross_post: true or false
   - market: "${isItalian ? "Italian Market" : "Maltese Market"}"

5. Do NOT repeat angles, copy structures, or ideas from previous plans.
6. Apply all approval learnings. Avoid rejected patterns.
7. Be specific. Use operational facts — route, vessel, ticket classes, seasons, destinations.
8. Vary pillars. No pillar should appear in more than 8 of the 25 posts.

Return ONLY valid JSON:
{
  "missed_windows": [],
  "${isItalian ? "italian_plan" : "english_plan"}": [/* 25 FB posts, plus IG-specific posts if Italian */]
}`;
    }

    type PlanPost = unknown[];
    let missed_windows: string[] = [];
    let english_plan: PlanPost = [];
    let italian_plan: PlanPost = [];

    function parseAndClean(raw: string): Record<string, unknown> {
      const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
      try { return JSON.parse(cleaned); } catch { return {}; }
    }

    if (includeEnglish && includeItalian) {
      // Run both markets in parallel — separate calls, each ~25 posts
      const [engRes, itaRes] = await Promise.all([
        anthropic.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 8192,
          system: getBrandGuidelinesPrompt(req.brandId),
          messages: [{ role: "user", content: buildPrompt("Maltese Market", false) }],
        }),
        anthropic.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 8192,
          system: getBrandGuidelinesPrompt(req.brandId),
          messages: [{ role: "user", content: buildPrompt("Italian Market", true) }],
        }),
      ]);

      const engParsed = parseAndClean(engRes.content[0]?.type === "text" ? engRes.content[0].text : "{}");
      const itaParsed = parseAndClean(itaRes.content[0]?.type === "text" ? itaRes.content[0].text : "{}");

      missed_windows = [
        ...((engParsed.missed_windows as string[]) ?? []),
        ...((itaParsed.missed_windows as string[]) ?? []),
      ].filter((v, i, a) => a.indexOf(v) === i);
      english_plan = (engParsed.english_plan as PlanPost) ?? [];
      italian_plan = (itaParsed.italian_plan as PlanPost) ?? [];

    } else if (includeEnglish) {
      const res = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 8192,
        system: getBrandGuidelinesPrompt(req.brandId),
        messages: [{ role: "user", content: buildPrompt("Maltese Market", false) }],
      });
      const parsed = parseAndClean(res.content[0]?.type === "text" ? res.content[0].text : "{}");
      missed_windows = (parsed.missed_windows as string[]) ?? [];
      english_plan = (parsed.english_plan as PlanPost) ?? [];

    } else if (includeItalian) {
      const res = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 8192,
        system: getBrandGuidelinesPrompt(req.brandId),
        messages: [{ role: "user", content: buildPrompt("Italian Market", true) }],
      });
      const parsed = parseAndClean(res.content[0]?.type === "text" ? res.content[0].text : "{}");
      missed_windows = (parsed.missed_windows as string[]) ?? [];
      italian_plan = (parsed.italian_plan as PlanPost) ?? [];
    }

    res.json({
      month,
      missed_windows,
      english_plan,
      italian_plan,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate plan" });
  }
});

// ─── POST /api/content/close-month ───────────────────────────────────────────
router.post("/content/close-month", async (req, res): Promise<void> => {
  const { month } = req.body as { month: string };
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    res.status(400).json({ error: "month is required in format YYYY-MM" });
    return;
  }

  try {
    const archived = await db
      .update(contentPostsTable)
      .set({ status: "archived" })
      .where(and(
        eq(contentPostsTable.brand_id, req.brandId),
        eq(contentPostsTable.month, month),
        eq(contentPostsTable.status, "pending"),
      ))
      .returning();

    const all = await db
      .select()
      .from(contentPostsTable)
      .where(and(eq(contentPostsTable.brand_id, req.brandId), eq(contentPostsTable.month, month)));

    const approvedCount = all.filter((p) => p.status === "approved").length;
    const rejectedCount = all.filter((p) => p.status === "rejected").length;
    const archivedCount = archived.length;

    const summary = `Month ${month} closed. ${approvedCount} posts approved, ${rejectedCount} rejected, ${archivedCount} archived without decision.`;

    const sortKey = `${month}-close`;
    const [entry] = await db
      .insert(changelogEntriesTable)
      .values({
        brand_id: req.brandId,
        sortKey,
        date: new Date().toISOString().slice(0, 10),
        category: "Month Close",
        summary,
        capabilities: [
          `${approvedCount} posts approved for ${month}`,
          `${rejectedCount} posts rejected for ${month}`,
          `Approval decisions archived and preferences updated`,
        ],
      })
      .onConflictDoNothing()
      .returning();

    res.json({ archived_count: archivedCount, changelog_entry: entry });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to close month" });
  }
});

// ─── POST /api/content/past-posts ─────────────────────────────────────────────
// Import historical posts from CSV upload
router.post("/content/past-posts", async (req, res): Promise<void> => {
  const rows = req.body as {
    date: string;
    time?: string;
    platform: string;
    caption: string;
    direction?: string;
    market?: string;
  }[];

  if (!Array.isArray(rows) || rows.length === 0) {
    res.status(400).json({ error: "rows must be a non-empty array" });
    return;
  }

  try {
    const inserted = await db
      .insert(pastPostsTable)
      .values(rows.map(r => ({
        brand_id: req.brandId,
        date: r.date,
        time: r.time ?? null,
        platform: r.platform,
        caption: r.caption,
        direction: r.direction ?? null,
        market: r.market ?? null,
      })))
      .returning();
    res.json({ imported: inserted.length, rows: inserted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to import past posts" });
  }
});

// ─── GET /api/content/past-posts ──────────────────────────────────────────────
// Return all past posts ordered by date desc
router.get("/content/past-posts", async (req, res): Promise<void> => {
  try {
    const rows = await db
      .select()
      .from(pastPostsTable)
      .where(eq(pastPostsTable.brand_id, req.brandId))
      .orderBy(desc(pastPostsTable.date));
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch past posts" });
  }
});

// ─── DELETE /api/content/past-posts/:id ───────────────────────────────────────
router.delete("/content/past-posts/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }
  try {
    await db.delete(pastPostsTable)
      .where(and(eq(pastPostsTable.id, id), eq(pastPostsTable.brand_id, req.brandId)));
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete past post" });
  }
});

export default router;
