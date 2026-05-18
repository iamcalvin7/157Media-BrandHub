import { Router, type IRouter } from "express";
import { randomBytes } from "node:crypto";
import { eq, inArray, and, sql } from "drizzle-orm";
import {
  db,
  sharedCollectionsTable,
  contentPostsTable,
  brandsTable,
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
 * Returns sanitised post data (only fields safe to show clients).
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

  // Strip internal fields before returning to clients
  const safePosts = ids
    .map((id) => posts.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => p != null)
    .map((p) => ({
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
      link_url: p.link_url,
      drive_url: p.drive_url,
      // Visual reference (e.g. inspiration FB/IG share URL the creative team
      // attached) and the live posted URLs were previously stripped — adding
      // them so the client-facing share page can preview the visual and link
      // out to live posts when the team chooses to surface them.
      visual_reference_url: p.visual_reference_url,
      posted_url: p.posted_url,
      posted_url_ig: p.posted_url_ig,
      cross_post: p.cross_post,
      scheduled_date: p.scheduled_date,
      scheduled_time: p.scheduled_time,
    }));

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

export default router;
