import { Router, type IRouter } from "express";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { db, contentPostsTable, approvalDecisionsTable, changelogEntriesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
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
    cross_post?: boolean;
    month: string;
    scheduled_date?: string;
  }[];

  if (!Array.isArray(posts) || posts.length === 0) {
    res.status(400).json({ error: "posts must be a non-empty array" });
    return;
  }

  try {
    const rows = await db
      .insert(contentPostsTable)
      .values(posts.map((p) => ({ ...p, status: "pending" })))
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

    const prompt = `You are generating a monthly social media content plan for Virtu Ferries for ${monthName}.

BRIEFING:
- Month: ${monthName} (${daysInMonth} days)
- Market(s): ${market}
- Active offers: ${offers || "None specified"}
- Events in Malta or Sicily: ${events || "None specified"}
- Campaigns/partnerships: ${campaigns || "None specified"}
- Format priorities/restrictions: ${format_priorities || "None specified"}
- Additional notes: ${other || "None"}

PREVIOUS CONTENT HISTORY (last 30 posts):
${historySnippet || "No previous posts yet."}

APPROVAL PATTERNS:
- Approved: ${approvedSummary || "No approval data yet"}
- Rejected: ${rejectedSummary || "No rejection data yet"}

INSTRUCTIONS:
1. First check: are there any significant Mediterranean cultural moments, Maltese/Sicilian events, or travel calendar moments within the next 4 weeks from the start of ${monthName} that the brand is at risk of missing? List these as "missed_windows" (array of strings). If none, return empty array.

2. Generate ${includeEnglish ? "an English plan (Facebook only, 25 posts)" : ""}${includeEnglish && includeItalian ? " and " : ""}${includeItalian ? "an Italian plan (Facebook 25 posts + Instagram up to 25 posts)" : ""}.

3. POST COUNT RULES:
   - English market: exactly 25 Facebook posts spread across the month.
   - Italian market Facebook: exactly 25 posts spread across the month.
   - Italian market Instagram: for every Facebook post, decide:
       cross_post: true  → the same post also goes on Instagram (no extra entry needed)
       cross_post: false → include a SEPARATE Instagram entry for that date with the same pillar but IG-native caption and format
     The total number of Instagram posts (cross-posted + IG-specific) must reach 25.
     Reuse Facebook content on Instagram wherever the post is image/video-led, destination, experiential, or sensory and requires no link. Create IG-specific content when the Facebook post is link-heavy, long-form, or relies on Facebook-native features.

4. Assign a specific scheduled_date (YYYY-MM-DD within ${month}) to every post. Space posts evenly — roughly one post per day for each platform.

5. Each post must have:
   - scheduled_date: YYYY-MM-DD
   - platform: "Facebook" or "Instagram"
   - pillar: one of the brand pillars
   - format: e.g. "Single Image", "Carousel", "Reel", "Video"
   - tone_register: e.g. "Destination Spotlight", "Community & Culture", "Offer / Promotion", "Journey Moment"
   - caption: full written caption, platform-native, on-brand
   - visual_direction: one-line visual brief
   - cta: call to action string or null
   - cross_post: true or false (Italian Facebook posts only; always false for IG-specific and English posts)
   - market: "English Market" or "Italian Market"

6. Do NOT repeat angles, copy structures, or ideas from previous plans.
7. Apply all approval learnings. Avoid patterns that were rejected.
8. Be specific. Use operational facts. Draw on what you know about the route, vessel, ticket classes, seasons, destinations.
9. Vary pillars and tone registers across the month. No pillar should dominate more than 8 of the 25 posts.

Return ONLY valid JSON in this exact shape:
{
  "missed_windows": ["..."],
  "english_plan": [...],
  "italian_plan": [...]
}

${!includeEnglish ? 'Set "english_plan" to [].' : ""}
${!includeItalian ? 'Set "italian_plan" to [].' : ""}`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: brandGuidelinesSystemPrompt,
      messages: [{ role: "user", content: prompt }],
    });

    const rawText = response.content[0]?.type === "text" ? response.content[0].text : "{}";
    const cleaned = rawText.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
    let parsed: { missed_windows?: string[]; english_plan?: unknown[]; italian_plan?: unknown[] };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      res.status(500).json({ error: "AI returned invalid JSON" });
      return;
    }

    res.json({
      month,
      missed_windows: parsed.missed_windows ?? [],
      english_plan: parsed.english_plan ?? [],
      italian_plan: parsed.italian_plan ?? [],
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

export default router;
