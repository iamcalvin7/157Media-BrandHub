import { Router, type IRouter } from "express";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { db, contentPostsTable, approvalDecisionsTable, changelogEntriesTable, eventsTable, pastPostsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { brandGuidelinesSystemPrompt } from "../lib/brandGuidelines.js";

const router: IRouter = Router();

// ─── POST /api/content/posts ───────────────────────────────────────────────────
router.post("/content/posts", async (req, res): Promise<void> => {
  const posts = req.body as {
    market: string;
    platform: string;
    pillar: string;
    tone_register: string;
    format: string;
    caption: string;
    visual_direction: string;
    cta?: string;
    media_url?: string;
    link_url?: string;
    cross_post?: boolean;
    month: string;
    scheduled_date?: string;
    status?: string;
  }[];

  if (!Array.isArray(posts) || posts.length === 0) {
    res.status(400).json({ error: "posts must be a non-empty array" });
    return;
  }

  try {
    const rows = await db
      .insert(contentPostsTable)
      .values(posts.map((p) => ({ ...p, status: p.status ?? "pending" })))
      .returning();
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to insert posts" });
  }
});

// ─── GET /api/content/posts?month=YYYY-MM ─────────────────────────────────────
// Returns all posts for a given month (all statuses) with approval decisions
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
      .where(eq(contentPostsTable.month, month));

    const decisions = await db
      .select()
      .from(approvalDecisionsTable)
      .innerJoin(contentPostsTable, eq(approvalDecisionsTable.post_id, contentPostsTable.id))
      .where(eq(contentPostsTable.month, month));

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
    await db.delete(approvalDecisionsTable).where(eq(approvalDecisionsTable.post_id, id));
    const deleted = await db.delete(contentPostsTable).where(eq(contentPostsTable.id, id)).returning();
    if (deleted.length === 0) {
      res.status(404).json({ error: "Post not found" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete post" });
  }
});

// ─── GET /api/content/history ─────────────────────────────────────────────────
// Returns all posts ever — used by plan generator for context loading
router.get("/content/history", async (_req, res): Promise<void> => {
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
      .from(contentPostsTable);
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
      .where(eq(contentPostsTable.id, post_id))
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
      .where(eq(contentPostsTable.id, post_id))
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
router.get("/content/preferences", async (_req, res): Promise<void> => {
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
      .innerJoin(contentPostsTable, eq(approvalDecisionsTable.post_id, contentPostsTable.id));

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
router.get("/content/pending", async (_req, res): Promise<void> => {
  try {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const posts = await db
      .select()
      .from(contentPostsTable)
      .where(and(eq(contentPostsTable.status, "pending"), eq(contentPostsTable.month, currentMonth)));
    res.json(posts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch pending posts" });
  }
});

// ─── POST /api/content/generate-ideas ────────────────────────────────────────
// Phase 1 of 2: generate concept ideas (no captions) for user review
router.post("/content/generate-ideas", async (req, res): Promise<void> => {
  const { month, market, offers, events, campaigns, other, user_ideas } = req.body as {
    month: string; market: string; offers?: string; events?: string;
    campaigns?: string; other?: string; user_ideas?: string[];
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
      }).from(contentPostsTable),
      db.select({
        decision: approvalDecisionsTable.decision,
        pillar: contentPostsTable.pillar, tone_register: contentPostsTable.tone_register,
        format: contentPostsTable.format, market: contentPostsTable.market,
      }).from(approvalDecisionsTable)
        .innerJoin(contentPostsTable, eq(approvalDecisionsTable.post_id, contentPostsTable.id)),
      db.select().from(eventsTable).orderBy(eventsTable.date),
      db.select().from(pastPostsTable).orderBy(desc(pastPostsTable.date)).limit(40),
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
BRAND MANAGER'S OWN IDEAS — REQUIRED:
The brand manager has requested that these specific concepts appear in the plan.
You MUST include one idea for each entry below. Choose a suitable date within ${monthName}, pick the right pillar, format, and tone — but the core concept must be respected.
Mark each of these ideas with "pinned": true in the JSON output.
${user_ideas.map((idea, i) => `${i + 1}. ${idea}`).join("\n")}

These count toward the 25-post total and reduce the number of free slots you need to fill.
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
   - visual_direction: one-line visual brief (location/subject to shoot or source — must match the destination being sold)
   - hook: one punchy line describing the creative concept — NOT a caption, just the idea
   - cross_post: true or false
   - market: "${market} Market"
   - pinned: true ONLY for the brand manager's own ideas listed above; false (or omit) for all AI-generated ideas

5. Vary pillars across the non-Saturday posts. No pillar (other than Why VF) in more than 8 of the 25 posts. Avoid repeating recent patterns.

Return ONLY valid JSON:
{
  "missed_windows": [],
  "ideas": [ /* all ideas: FB + IG if English market; FB only if Italian */ ]
}`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 6000,
      system: brandGuidelinesSystemPrompt,
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
      system: brandGuidelinesSystemPrompt,
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

// ─── POST /api/content/generate-plan ─────────────────────────────────────────
// Loads context, runs briefing, generates English + Italian plans via AI
router.post("/content/generate-plan", async (req, res): Promise<void> => {
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
      .from(contentPostsTable);

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
      .innerJoin(contentPostsTable, eq(approvalDecisionsTable.post_id, contentPostsTable.id));

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
   - visual_direction: one-line visual brief
   - cta: call to action string or null
   - cross_post: true or false
   - market: "${isItalian ? "Italian Market" : "English Market"}"

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
          system: brandGuidelinesSystemPrompt,
          messages: [{ role: "user", content: buildPrompt("English Market", false) }],
        }),
        anthropic.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 8192,
          system: brandGuidelinesSystemPrompt,
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
        system: brandGuidelinesSystemPrompt,
        messages: [{ role: "user", content: buildPrompt("English Market", false) }],
      });
      const parsed = parseAndClean(res.content[0]?.type === "text" ? res.content[0].text : "{}");
      missed_windows = (parsed.missed_windows as string[]) ?? [];
      english_plan = (parsed.english_plan as PlanPost) ?? [];

    } else if (includeItalian) {
      const res = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 8192,
        system: brandGuidelinesSystemPrompt,
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
      .where(and(eq(contentPostsTable.month, month), eq(contentPostsTable.status, "pending")))
      .returning();

    const all = await db
      .select()
      .from(contentPostsTable)
      .where(eq(contentPostsTable.month, month));

    const approvedCount = all.filter((p) => p.status === "approved").length;
    const rejectedCount = all.filter((p) => p.status === "rejected").length;
    const archivedCount = archived.length;

    const summary = `Month ${month} closed. ${approvedCount} posts approved, ${rejectedCount} rejected, ${archivedCount} archived without decision.`;

    const sortKey = `${month}-close`;
    const [entry] = await db
      .insert(changelogEntriesTable)
      .values({
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
router.get("/content/past-posts", async (_req, res): Promise<void> => {
  try {
    const rows = await db
      .select()
      .from(pastPostsTable)
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
    await db.delete(pastPostsTable).where(eq(pastPostsTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete past post" });
  }
});

export default router;
