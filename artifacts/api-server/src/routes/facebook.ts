/**
 * facebook.ts — Facebook OAuth + publishing routes.
 *
 * OAuth flow:
 *   GET  /api/facebook/auth-url       — returns FB OAuth dialog URL (admin only)
 *   GET  /api/facebook/callback       — FB redirects here after user authorises
 *
 * Page management:
 *   GET    /api/facebook/pages        — list connected pages for current brand
 *   DELETE /api/facebook/pages/:id    — disconnect a page
 *
 * Publishing:
 *   POST /api/facebook/publish/:postId — publish a content post to the connected FB page
 */

import { Router, type Request, type Response } from "express";
import { createHmac, timingSafeEqual } from "crypto";
import { db, facebookPageTokensTable, contentPostsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireBrandAccess } from "../middlewares/requireBrandAccess.js";
import { logger } from "../lib/logger.js";

const router = Router();

const APP_ID = process.env["FB_APP_ID"] ?? "";
const APP_SECRET = process.env["FB_APP_SECRET"] ?? "";
const SCOPE = "pages_show_list,pages_manage_posts,business_management";
const FB_API = "https://graph.facebook.com/v19.0";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Absolute URL of this callback endpoint, derived from Replit's env. */
function callbackUrl(): string {
  const domain = process.env["REPLIT_DOMAINS"]?.split(",")[0]?.trim();
  return domain
    ? `https://${domain}/api/facebook/callback`
    : `http://localhost:${process.env["PORT"] ?? 8080}/api/facebook/callback`;
}

/** The frontend base URL — used for post-OAuth redirects back to the app. */
function frontendBase(): string {
  const domain = process.env["REPLIT_DOMAINS"]?.split(",")[0]?.trim();
  return domain ? `https://${domain}` : "http://localhost:5173";
}

/**
 * Sign a state object with the app secret so we can verify it on callback
 * and prevent CSRF. Format: base64url(json).hmac-sha256
 */
function signState(data: object): string {
  const b64 = Buffer.from(JSON.stringify(data)).toString("base64url");
  const sig = createHmac("sha256", APP_SECRET).update(b64).digest("base64url");
  return `${b64}.${sig}`;
}

function verifyState(state: string): { brand_id: number; ts: number } | null {
  const dot = state.lastIndexOf(".");
  if (dot < 0) return null;
  const b64 = state.slice(0, dot);
  const sig = state.slice(dot + 1);
  const expected = createHmac("sha256", APP_SECRET).update(b64).digest("base64url");
  try {
    if (!timingSafeEqual(Buffer.from(sig, "ascii"), Buffer.from(expected, "ascii"))) return null;
  } catch { return null; }
  const parsed = JSON.parse(Buffer.from(b64, "base64url").toString("utf8")) as {
    brand_id: number;
    ts: number;
  };
  if (Date.now() - parsed.ts > 15 * 60 * 1000) return null; // 15-min window
  return parsed;
}

// ---------------------------------------------------------------------------
// GET /api/facebook/auth-url
// Returns the Facebook OAuth dialog URL for the current brand.
// ---------------------------------------------------------------------------
router.get("/facebook/auth-url", requireBrandAccess("admin"), (req: Request, res: Response): void => {
  if (!APP_ID) {
    res.status(500).json({ error: "FB_APP_ID is not configured" });
    return;
  }
  const state = signState({ brand_id: req.brandId, ts: Date.now() });
  const url = new URL("https://www.facebook.com/v19.0/dialog/oauth");
  url.searchParams.set("client_id", APP_ID);
  url.searchParams.set("redirect_uri", callbackUrl());
  url.searchParams.set("scope", SCOPE);
  url.searchParams.set("state", state);
  url.searchParams.set("response_type", "code");
  res.json({ url: url.toString(), callback_url: callbackUrl() });
});

// ---------------------------------------------------------------------------
// GET /api/facebook/callback  (public — Facebook redirects the browser here)
// ---------------------------------------------------------------------------
router.get("/facebook/callback", async (req: Request, res: Response): Promise<void> => {
  const { code, state, error } = req.query as Record<string, string>;

  if (error) {
    res.redirect(`${frontendBase()}/settings?fb_error=${encodeURIComponent(error)}`);
    return;
  }

  const stateData = state ? verifyState(state) : null;
  if (!stateData) {
    res.redirect(`${frontendBase()}/settings?fb_error=invalid_state`);
    return;
  }

  try {
    // 1. Exchange code for a short-lived user token
    const tokenParams = new URLSearchParams({
      client_id: APP_ID,
      redirect_uri: callbackUrl(),
      client_secret: APP_SECRET,
      code,
    });
    const tokenRes = await fetch(`${FB_API}/oauth/access_token?${tokenParams}`);
    const tokenData = (await tokenRes.json()) as { access_token?: string; error?: { message: string } };
    if (!tokenData.access_token) {
      logger.error({ tokenData }, "Facebook token exchange failed");
      res.redirect(`${frontendBase()}/settings?fb_error=token_exchange_failed`);
      return;
    }

    type FbPage = { id: string; name: string; access_token: string };

    // 2a. Fetch personal pages the user manages
    const pagesRes = await fetch(
      `${FB_API}/me/accounts?fields=id,name,access_token&access_token=${tokenData.access_token}`,
    );
    const pagesData = (await pagesRes.json()) as {
      data?: FbPage[];
      error?: { message: string; code?: number };
    };
    logger.info({ pagesCount: pagesData.data?.length ?? 0, hasError: !!pagesData.error, errorMsg: pagesData.error?.message }, "Facebook /me/accounts response");

    const allPages: Map<string, FbPage> = new Map();
    for (const p of pagesData.data ?? []) allPages.set(p.id, p);

    // 2b. Fetch business-owned pages (covers pages managed via Meta Business Manager)
    const bizRes = await fetch(
      `${FB_API}/me/businesses?fields=id,name&access_token=${tokenData.access_token}`,
    );
    const bizData = (await bizRes.json()) as {
      data?: Array<{ id: string; name: string }>;
      error?: { message: string };
    };
    logger.info({ bizCount: bizData.data?.length ?? 0, hasError: !!bizData.error }, "Facebook /me/businesses response");

    if (bizData.data?.length) {
      for (const biz of bizData.data) {
        const bizPagesRes = await fetch(
          `${FB_API}/${biz.id}/owned_pages?fields=id,name,access_token&access_token=${tokenData.access_token}`,
        );
        const bizPages = (await bizPagesRes.json()) as {
          data?: FbPage[];
          error?: { message: string };
        };
        logger.info({ bizId: biz.id, bizName: biz.name, pageCount: bizPages.data?.length ?? 0, hasError: !!bizPages.error }, "Facebook business owned_pages response");
        for (const p of bizPages.data ?? []) allPages.set(p.id, p);
      }
    }

    if (allPages.size === 0) {
      res.redirect(`${frontendBase()}/settings?fb_error=no_pages`);
      return;
    }

    logger.info({ totalPages: allPages.size, pageNames: [...allPages.values()].map(p => p.name) }, "Facebook pages to save");

    // 3. Upsert each page token for this brand
    for (const page of allPages.values()) {
      await db
        .insert(facebookPageTokensTable)
        .values({
          brand_id: stateData.brand_id,
          page_id: page.id,
          page_name: page.name,
          page_access_token: page.access_token,
        })
        .onConflictDoUpdate({
          target: [facebookPageTokensTable.brand_id, facebookPageTokensTable.page_id],
          set: {
            page_name: page.name,
            page_access_token: page.access_token,
            updated_at: new Date(),
          },
        });
    }

    res.redirect(`${frontendBase()}/settings?fb_connected=1`);
  } catch (err) {
    logger.error({ err }, "Facebook OAuth callback error");
    res.redirect(`${frontendBase()}/settings?fb_error=server_error`);
  }
});

// ---------------------------------------------------------------------------
// GET /api/facebook/pages — list connected pages for the current brand
// ---------------------------------------------------------------------------
router.get("/facebook/pages", requireBrandAccess("viewer"), async (req: Request, res: Response): Promise<void> => {
  try {
    const pages = await db
      .select({
        id: facebookPageTokensTable.id,
        page_id: facebookPageTokensTable.page_id,
        page_name: facebookPageTokensTable.page_name,
        market_hint: facebookPageTokensTable.market_hint,
        created_at: facebookPageTokensTable.created_at,
      })
      .from(facebookPageTokensTable)
      .where(eq(facebookPageTokensTable.brand_id, req.brandId));
    res.json(pages);
  } catch (err) {
    res.status(500).json({ error: "Failed to load connected pages", detail: String(err) });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/facebook/pages/:pageId — update market_hint for a page
// ---------------------------------------------------------------------------
router.patch("/facebook/pages/:pageId", requireBrandAccess("admin"), async (req: Request, res: Response): Promise<void> => {
  try {
    const { market_hint } = req.body as { market_hint?: string | null };
    await db
      .update(facebookPageTokensTable)
      .set({ market_hint: market_hint ?? null })
      .where(
        and(
          eq(facebookPageTokensTable.brand_id, req.brandId),
          eq(facebookPageTokensTable.page_id, req.params.pageId),
        ),
      );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update page", detail: String(err) });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/facebook/pages/:pageId — disconnect a page
// ---------------------------------------------------------------------------
router.delete("/facebook/pages/:pageId", requireBrandAccess("admin"), async (req: Request, res: Response): Promise<void> => {
  try {
    await db
      .delete(facebookPageTokensTable)
      .where(
        and(
          eq(facebookPageTokensTable.brand_id, req.brandId),
          eq(facebookPageTokensTable.page_id, req.params.pageId),
        ),
      );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to disconnect page", detail: String(err) });
  }
});

// ---------------------------------------------------------------------------
// POST /api/facebook/publish/:postId — publish a content post to FB
// ---------------------------------------------------------------------------
router.post("/facebook/publish/:postId", requireBrandAccess("editor"), async (req: Request, res: Response): Promise<void> => {
  const postId = Number(req.params.postId);
  if (isNaN(postId)) {
    res.status(400).json({ error: "Invalid post ID" });
    return;
  }

  try {
    // 1. Load the post
    const [post] = await db
      .select({
        id: contentPostsTable.id,
        brand_id: contentPostsTable.brand_id,
        caption: contentPostsTable.caption,
        media_urls: contentPostsTable.media_urls,
        media_url: contentPostsTable.media_url,
      })
      .from(contentPostsTable)
      .where(and(eq(contentPostsTable.id, postId), eq(contentPostsTable.brand_id, req.brandId)));

    if (!post) {
      res.status(404).json({ error: "Post not found" });
      return;
    }

    // 2. Find a connected page for this brand (caller may specify a page_id)
    const reqBody = req.body as Record<string, unknown>;
    const requestedPageId = reqBody?.page_id as string | undefined;
    const testMode = reqBody?.test_mode === true;
    const pageWhere = requestedPageId
      ? and(eq(facebookPageTokensTable.brand_id, req.brandId), eq(facebookPageTokensTable.page_id, requestedPageId))
      : eq(facebookPageTokensTable.brand_id, req.brandId);

    const [pageToken] = await db
      .select()
      .from(facebookPageTokensTable)
      .where(pageWhere)
      .limit(1);

    if (!pageToken) {
      res.status(400).json({ error: "No Facebook page connected for this brand. Connect a page in Settings first." });
      return;
    }

    const caption = post.caption ?? "";

    // 3. Resolve internal /objects/ paths to public HTTPS URLs
    const domain = process.env["REPLIT_DOMAINS"]?.split(",")[0]?.trim();
    const apiBase = domain ? `https://${domain}` : `http://localhost:${process.env["PORT"] ?? 8080}`;
    const allMedia: string[] = Array.isArray(post.media_urls) && post.media_urls.length > 0
      ? post.media_urls
      : post.media_url ? [post.media_url] : [];

    const resolvedMedia = allMedia.map((u) =>
      u.startsWith("/objects/") ? `${apiBase}/api/storage${u}` : u,
    );

    // Helper — detect video by file extension
    const isVideoUrl = (url: string) =>
      /\.(mp4|mov|webm|m4v|avi|mkv)(\?|#|$)/i.test(url);

    const videoUrls = resolvedMedia.filter(isVideoUrl);
    const imageUrls = resolvedMedia.filter((u) => !isVideoUrl(u));

    let fbPostId: string;

    if (videoUrls.length > 0) {
      // Video / Reel post — use first video; Facebook determines Reel vs feed video
      // by aspect ratio (9:16 vertical = Reel) and duration (<90 s).
      // `file_url` tells Facebook to fetch the video from the public URL.
      const body = new URLSearchParams({
        file_url: videoUrls[0]!,
        description: caption,
        access_token: pageToken.page_access_token,
      });
      if (testMode) body.set("published", "false");
      const r = await fetch(`${FB_API}/${pageToken.page_id}/videos`, { method: "POST", body });
      const data = (await r.json()) as { id?: string; error?: { message: string } };
      if (!data.id) throw new Error(data.error?.message ?? "Unknown error from Facebook (video)");
      fbPostId = data.id;
    } else if (imageUrls.length === 0) {
      // Text-only post
      const body = new URLSearchParams({
        message: caption,
        access_token: pageToken.page_access_token,
      });
      if (testMode) body.set("published", "false");
      const r = await fetch(`${FB_API}/${pageToken.page_id}/feed`, { method: "POST", body });
      const data = (await r.json()) as { id?: string; error?: { message: string } };
      if (!data.id) throw new Error(data.error?.message ?? "Unknown error from Facebook");
      fbPostId = data.id;
    } else if (imageUrls.length === 1) {
      // Single photo post
      const body = new URLSearchParams({
        url: imageUrls[0]!,
        caption,
        access_token: pageToken.page_access_token,
      });
      if (testMode) body.set("published", "false");
      const r = await fetch(`${FB_API}/${pageToken.page_id}/photos`, { method: "POST", body });
      const data = (await r.json()) as { id?: string; post_id?: string; error?: { message: string } };
      if (!data.id) throw new Error(data.error?.message ?? "Unknown error from Facebook");
      fbPostId = data.post_id ?? data.id;
    } else {
      // Multi-photo post — upload each image as unpublished, then combine into one post
      const photoIds: string[] = [];
      for (const url of imageUrls) {
        const body = new URLSearchParams({
          url,
          published: "false",
          access_token: pageToken.page_access_token,
        });
        const r = await fetch(`${FB_API}/${pageToken.page_id}/photos`, { method: "POST", body });
        const data = (await r.json()) as { id?: string; error?: { message: string } };
        if (!data.id) throw new Error(data.error?.message ?? "Failed to upload photo to Facebook");
        photoIds.push(data.id);
      }

      const feedBody = new URLSearchParams({ message: caption, access_token: pageToken.page_access_token });
      if (testMode) feedBody.set("published", "false");
      photoIds.forEach((id) => feedBody.append("attached_media[]", JSON.stringify({ media_fbid: id })));
      const r = await fetch(`${FB_API}/${pageToken.page_id}/feed`, { method: "POST", body: feedBody });
      const data = (await r.json()) as { id?: string; error?: { message: string } };
      if (!data.id) throw new Error(data.error?.message ?? "Unknown error from Facebook");
      fbPostId = data.id;
    }

    logger.info({ postId, fbPostId, page_id: pageToken.page_id, testMode }, "Published to Facebook");
    res.json({ ok: true, fb_post_id: fbPostId, page_name: pageToken.page_name, test_mode: testMode });
  } catch (err) {
    logger.error({ err, postId }, "Facebook publish error");
    res.status(500).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

export default router;
