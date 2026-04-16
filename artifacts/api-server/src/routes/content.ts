import { Router, type IRouter } from "express";
import { db, contentPostsTable, approvalDecisionsTable, changelogEntriesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

// ─── POST /api/content/posts ───────────────────────────────────────────────────
// Insert an array of posts for a given month, all with status "pending"
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

    // Aggregate approved patterns
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

    // Active constraints: rejection reasons appearing 3+ times
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
// Returns all pending posts for the current month
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

// ─── POST /api/content/close-month ───────────────────────────────────────────
router.post("/content/close-month", async (req, res): Promise<void> => {
  const { month } = req.body as { month: string };
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    res.status(400).json({ error: "month is required in format YYYY-MM" });
    return;
  }

  try {
    // Archive all pending for this month
    const archived = await db
      .update(contentPostsTable)
      .set({ status: "archived" })
      .where(and(eq(contentPostsTable.month, month), eq(contentPostsTable.status, "pending")))
      .returning();

    // Count approved/rejected for the summary
    const all = await db
      .select()
      .from(contentPostsTable)
      .where(eq(contentPostsTable.month, month));

    const approvedCount = all.filter((p) => p.status === "approved").length;
    const rejectedCount = all.filter((p) => p.status === "rejected").length;
    const archivedCount = archived.length;

    const summary = `Month ${month} closed. ${approvedCount} posts approved, ${rejectedCount} rejected, ${archivedCount} archived without decision.`;

    // Add changelog entry
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
