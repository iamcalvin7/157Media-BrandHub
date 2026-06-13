/**
 * auth.ts — Auth routes (Clerk-based).
 *
 * Public endpoints (no session required):
 *   GET  /auth/user      — Current user or null (always 200)
 *   GET  /auth/health    — Auth state probe (always 200, safe for monitoring)
 *
 * Requires valid Clerk session JWT (Authorization: Bearer):
 *   GET  /auth/access    — User + accessible brands + roles (401 if not signed in)
 *   POST /auth/provision — First-login provisioning: create/update users + user_identities
 *
 * Removed (Clerk handles client-side):
 *   GET /login, GET /callback, GET /logout
 *
 * RULE: The final platform admin must never be removed from user_brand_access.
 */

import { Router, type IRouter, type Request, type Response } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { eq } from "drizzle-orm";
import { db, brandsTable, userBrandAccessTable } from "@workspace/db";
import { provisionClerkUser } from "../lib/auth.js";
import { logAuthEvent } from "../lib/authAuditLog.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

// ---------------------------------------------------------------------------
// GET /auth/user
// Always returns 200. Returns the current user object or null.
// ---------------------------------------------------------------------------

router.get("/auth/user", (req: Request, res: Response): void => {
  res.json({ user: req.isAuthenticated() ? req.user : null });
});

// ---------------------------------------------------------------------------
// GET /auth/health
// Always returns 200. Safe for unauthenticated polling (monitoring, load-time probe).
// ---------------------------------------------------------------------------

router.get("/auth/health", (req: Request, res: Response): void => {
  const authenticated = req.isAuthenticated();
  res.json({
    authenticated,
    session_valid: authenticated,
    user_id: authenticated ? req.user.id : null,
  });
});

// ---------------------------------------------------------------------------
// GET /auth/access
// Returns user + accessible brands with roles. 401 if not signed in.
// ---------------------------------------------------------------------------

router.get(
  "/auth/access",
  async (req: Request, res: Response): Promise<void> => {
    if (!req.isAuthenticated()) {
      logAuthEvent({
        user_id: null,
        method: req.method,
        route: "/auth/access",
        result: "DENY",
        reason: "NO_SESSION",
      });
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const rows = await db
      .select({
        brand_id: userBrandAccessTable.brand_id,
        role: userBrandAccessTable.role,
        slug: brandsTable.slug,
        name: brandsTable.name,
        shortName: brandsTable.shortName,
      })
      .from(userBrandAccessTable)
      .innerJoin(
        brandsTable,
        eq(userBrandAccessTable.brand_id, brandsTable.id),
      )
      .where(eq(userBrandAccessTable.user_id, req.user.id))
      .orderBy(brandsTable.id);

    const brands = rows.map((r) => ({
      id: r.brand_id,
      slug: r.slug,
      name: r.name,
      shortName: r.shortName ?? null,
      role: r.role,
    }));

    logAuthEvent({
      user_id: req.user.id,
      method: req.method,
      route: "/auth/access",
      result: "ALLOW",
      reason: "OK",
    });

    res.json({
      user: req.user,
      brands,
      defaultBrand: brands[0] ?? null,
    });
  },
);

// ---------------------------------------------------------------------------
// POST /auth/provision
// Called by the frontend after every Clerk sign-in. Idempotent.
//
// Security: the Clerk session JWT is verified by clerkMiddleware() before this
// handler runs. The user's email is fetched from Clerk's backend API (not from
// the request body) to prevent email spoofing within a valid Clerk session.
//
// Flow:
//   1. Get Clerk userId from the verified JWT (getAuth).
//   2. Fetch authoritative email from Clerk backend (clerkClient.users.getUser).
//   3. Call provisionClerkUser — gates on allowed_emails, upserts users +
//      user_identities, bootstraps admin access if applicable.
//   4. Return the internal AuthUser.
// ---------------------------------------------------------------------------

router.post(
  "/auth/provision",
  async (req: Request, res: Response): Promise<void> => {
    const { userId } = getAuth(req);

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // Fetch authoritative profile from Clerk — never trust the request body for email.
    let clerkUser: Awaited<ReturnType<typeof clerkClient.users.getUser>>;
    try {
      clerkUser = await clerkClient.users.getUser(userId);
    } catch (err) {
      logger.error({ err, userId }, "auth/provision: failed to fetch Clerk user");
      res.status(502).json({ error: "Failed to retrieve account details" });
      return;
    }

    const primaryEmail =
      clerkUser.emailAddresses.find(
        (e) => e.id === clerkUser.primaryEmailAddressId,
      )?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress;

    if (!primaryEmail) {
      res.status(400).json({ error: "No email address on Clerk account" });
      return;
    }

    // Accept non-sensitive profile fields from the body as a hint, but the
    // authoritative email always comes from Clerk.
    const body = req.body as {
      firstName?: unknown;
      lastName?: unknown;
      profileImageUrl?: unknown;
    };

    try {
      const dbUser = await provisionClerkUser({
        clerkUserId: userId,
        email: primaryEmail,
        firstName:
          typeof body.firstName === "string" ? body.firstName
          : clerkUser.firstName ?? null,
        lastName:
          typeof body.lastName === "string" ? body.lastName
          : clerkUser.lastName ?? null,
        profileImageUrl:
          typeof body.profileImageUrl === "string" ? body.profileImageUrl
          : clerkUser.imageUrl ?? null,
      });

      req.user = dbUser;

      logAuthEvent({
        user_id: dbUser.id,
        method: req.method,
        route: "/auth/provision",
        result: "ALLOW",
        reason: "PROVISION_SUCCESS",
      });

      res.json({ user: dbUser });
    } catch (err: unknown) {
      const e = err as Error & { statusCode?: number };
      if (e.statusCode === 403) {
        logAuthEvent({
          user_id: null,
          method: req.method,
          route: "/auth/provision",
          result: "DENY",
          reason: "EMAIL_NOT_ALLOWED",
        });
        res.status(403).json({ error: "Access denied: your account is not on the access list" });
        return;
      }
      throw err;
    }
  },
);

export default router;
