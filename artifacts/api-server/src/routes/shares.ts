import { Router, type IRouter } from "express";
import { randomBytes } from "node:crypto";
import { eq, inArray, and, sql, asc } from "drizzle-orm";
import {
  db,
  sharedCollectionsTable,
  contentPostsTable,
  brandsTable,
  sharePostFeedbackTable,
} from "@workspace/db";

const router: IRouter = Router();

function newToken(): string {
  // 16 random bytes → 22 chars base64url, URL-safe and unguessable
  return randomBytes(16).toString("base64url");
}

/**
 * Create a new shareable collection of posts.
 * Body: { title?: string; postIds: number[] }
 */
router.post("/shares", async (req, res): Promise<void> => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const rawIds = Array.isArray(body.postIds) ? body.postIds : [];
  const postIds = Array.from(
    new Set(
      rawIds
        .map((v) => Number(v))
        .filter((n) => Number.isFinite(n) && n > 0),
    ),
  );
  if (postIds.length === 0) {
    res.status(400).json({ error: "Select at least one post." });
    return;
  }

  const title =
    typeof body.title === "string" && body.title.trim().length > 0
      ? body.title.trim().slice(0, 200)
      : null;

  // Verify all posts belong to the active brand to avoid leaking across brands
  const owned = await db
    .select({ id: contentPostsTable.id })
    .from(contentPostsTable)
    .where(
      and(
        eq(contentPostsTable.brand_id, req.brandId),
        inArray(contentPostsTable.id, postIds),
      ),
    );
  const ownedIds = new Set(owned.map((p) => p.id));
  const safeIds = postIds.filter((id) => ownedIds.has(id));
  if (safeIds.length === 0) {
    res.status(400).json({ error: "None of the selected posts belong to this brand." });
    return;
  }

  // Retry up to 3 times on the rare token collision
  let token = newToken();
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const [created] = await db
        .insert(sharedCollectionsTable)
        .values({
          token,
          brand_id: req.brandId,
          title,
          post_ids: safeIds,
        })
        .returning();
      res.status(201).json({ token: created.token, title: created.title, count: safeIds.length });
      return;
    } catch (err) {
      if (attempt === 2) throw err;
      token = newToken();
    }
  }
});

/**
 * Public read of a shared collection. No brand header required.
 * Returns sanitised post data (only fields safe to show clients) and any
 * client feedback submitted on the posts in this collection.
 */
router.get("/shares/:token", async (req, res): Promise<void> => {
  const token = req.params.token;
  if (!token || token.length > 64) {
    res.status(400).json({ error: "Invalid token" });
    return;
  }

  const [share] = await db
    .select()
    .from(sharedCollectionsTable)
    .where(eq(sharedCollectionsTable.token, token));
  if (!share) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const ids = Array.isArray(share.post_ids) ? share.post_ids : [];
  const posts =
    ids.length > 0
      ? await db.select().from(contentPostsTable).where(inArray(contentPostsTable.id, ids))
      : [];
  const [brand] = await db
    .select()
    .from(brandsTable)
    .where(eq(brandsTable.id, share.brand_id));

  // Fetch every feedback entry submitted against this share token, oldest
  // first so the share page can render a chronological timeline per post.
  const feedback =
    ids.length > 0
      ? await db
          .select()
          .from(sharePostFeedbackTable)
          .where(eq(sharePostFeedbackTable.share_token, token))
          .orderBy(asc(sharePostFeedbackTable.created_at))
      : [];
  const feedbackByPost: Record<number, Array<{
    id: number;
    decision: string | null;
    comment: string | null;
    client_name: string | null;
    created_at: string;
  }>> = {};
  for (const f of feedback) {
    (feedbackByPost[f.post_id] ??= []).push({
      id: f.id,
      decision: f.decision,
      comment: f.comment,
      client_name: f.client_name,
      created_at: f.created_at.toISOString(),
    });
  }

  // Strip internal fields before returning to clients.
  // `visual_reference_url` is intentionally omitted from the share payload —
  // it's an internal inspiration link the team uses while briefing creative,
  // not something the client should see.
  const safePosts = ids
    .map((id) => posts.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => p != null)
    .map((p) => {
      // Combine the legacy single media_url with the new media_urls array.
      // De-dupe in case both point at the same object.
      const combined = Array.isArray(p.media_urls) ? [...p.media_urls] : [];
      if (p.media_url && !combined.includes(p.media_url)) combined.unshift(p.media_url);
      return {
        id: p.id,
        market: p.market,
        platform: p.platform,
        pillar: p.pillar,
        title: p.title,
        format: p.format,
        caption: p.caption,
        visual_direction: p.visual_direction,
        cta: p.cta,
        media_url: p.media_url,
        media_urls: combined,
        link_url: p.link_url,
        drive_url: p.drive_url,
        posted_url: p.posted_url,
        posted_url_ig: p.posted_url_ig,
        cross_post: p.cross_post,
        scheduled_date: p.scheduled_date,
        scheduled_time: p.scheduled_time,
        feedback: feedbackByPost[p.id] ?? [],
      };
    });

  // Best-effort view count increment (don't block response)
  db.update(sharedCollectionsTable)
    .set({ view_count: sql`${sharedCollectionsTable.view_count} + 1` })
    .where(eq(sharedCollectionsTable.token, token))
    .catch((err) => req.log?.warn?.({ err }, "Failed to bump view_count"));

  res.json({
    token: share.token,
    title: share.title,
    created_at: share.created_at,
    brand: brand
      ? {
          id: brand.id,
          slug: brand.slug,
          name: brand.name,
          shortName: brand.shortName,
          tagline: brand.tagline,
          primaryColor: brand.primaryColor,
          accentColor: brand.accentColor,
        }
      : null,
    posts: safePosts,
  });
});

/**
 * POST /api/shares/:token/feedback
 *
 * Public endpoint — anyone with the share link can submit feedback.
 * Validates the postId is part of the collection so the link can't be used
 * to leave feedback on arbitrary posts.
 *
 * Body: { postId: number; decision?: 'approved' | 'changes_requested';
 *         comment?: string; clientName?: string }
 *
 * At least one of `decision` or `comment` must be present.
 */
router.post("/shares/:token/feedback", async (req, res): Promise<void> => {
  const token = req.params.token;
  if (!token || token.length > 64) {
    res.status(400).json({ error: "Invalid token" });
    return;
  }
  const body = (req.body ?? {}) as Record<string, unknown>;
  const postId = Number(body.postId);
  if (!Number.isFinite(postId) || postId <= 0) {
    res.status(400).json({ error: "postId is required" });
    return;
  }
  const decisionRaw = typeof body.decision === "string" ? body.decision.trim() : "";
  const decision =
    decisionRaw === "approved" || decisionRaw === "changes_requested"
      ? decisionRaw
      : null;
  const comment =
    typeof body.comment === "string" && body.comment.trim().length > 0
      ? body.comment.trim().slice(0, 2000)
      : null;
  const clientName =
    typeof body.clientName === "string" && body.clientName.trim().length > 0
      ? body.clientName.trim().slice(0, 100)
      : null;
  if (!decision && !comment) {
    res.status(400).json({ error: "Add a comment or pick a decision." });
    return;
  }

  const [share] = await db
    .select()
    .from(sharedCollectionsTable)
    .where(eq(sharedCollectionsTable.token, token));
  if (!share) {
    res.status(404).json({ error: "Share link not found." });
    return;
  }
  const ids = Array.isArray(share.post_ids) ? share.post_ids : [];
  if (!ids.includes(postId)) {
    res.status(400).json({ error: "This post is not part of the shared collection." });
    return;
  }

  const [inserted] = await db
    .insert(sharePostFeedbackTable)
    .values({
      share_token: token,
      brand_id: share.brand_id,
      post_id: postId,
      decision,
      comment,
      client_name: clientName,
    })
    .returning();

  res.status(201).json({
    id: inserted.id,
    decision: inserted.decision,
    comment: inserted.comment,
    client_name: inserted.client_name,
    created_at: inserted.created_at.toISOString(),
  });
});

export default router;
