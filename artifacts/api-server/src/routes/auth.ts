/**
 * auth.ts — Auth routes.
 *
 * Public endpoints (no session required):
 *   GET /login         — OIDC redirect
 *   GET /callback      — OIDC callback (not validated with Zod; OIDC provider
 *                        may include parameters not in the schema)
 *   GET /logout        — Clear session, redirect to end-session
 *   GET /auth/user     — Current user or null (always 200)
 *   GET /auth/health   — Auth state probe (always 200, safe for monitoring)
 *   GET /auth/access   — User + accessible brands + roles (401 if no session)
 *
 * RULE: The final platform admin must never be removed from user_brand_access.
 * TODO (W2.B): When admin management UI is implemented, enforce that any DELETE
 * or role-downgrade on user_brand_access that would leave zero rows with
 * role='admin' across all brands is rejected with HTTP 409.
 */

import * as oidc from "openid-client";
import { Router, type IRouter, type Request, type Response } from "express";
import { db, brandsTable, userBrandAccessTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  clearSession,
  getOidcConfig,
  getSessionId,
  createSession,
  upsertUser,
  bootstrapAdminIfApplicable,
  SESSION_COOKIE,
  SESSION_TTL,
  ISSUER_URL,
  type SessionData,
} from "../lib/auth.js";
import { logAuthEvent } from "../lib/authAuditLog.js";

const OIDC_COOKIE_TTL = 10 * 60 * 1000; // 10 minutes

const router: IRouter = Router();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getOrigin(req: Request): string {
  const proto = req.headers["x-forwarded-proto"] ?? "https";
  const host =
    req.headers["x-forwarded-host"] ?? req.headers["host"] ?? "localhost";
  return `${proto}://${host}`;
}

function setSessionCookie(res: Response, sid: string): void {
  res.cookie(SESSION_COOKIE, sid, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL,
  });
}

function setOidcCookie(res: Response, name: string, value: string): void {
  res.cookie(name, value, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: OIDC_COOKIE_TTL,
  });
}

function getSafeReturnTo(value: unknown): string {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return "/";
  }
  return value;
}

// ---------------------------------------------------------------------------
// GET /auth/user
// Always returns 200. Returns the current user object or null.
// Safe to call from the frontend before the auth state is known.
// ---------------------------------------------------------------------------

router.get("/auth/user", (req: Request, res: Response): void => {
  res.json({ user: req.isAuthenticated() ? req.user : null });
});

// ---------------------------------------------------------------------------
// GET /auth/health
// Always returns 200. Describes auth state. Safe for unauthenticated polling
// (monitoring, health checks, frontend load-time probe).
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
// Returns the current user, their accessible brands with roles, and a default
// brand. Returns 401 if no valid session exists.
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
// GET /login
// Initiates OIDC PKCE flow. Accepts optional ?returnTo= (path-only, validated).
// ---------------------------------------------------------------------------

router.get("/login", async (req: Request, res: Response): Promise<void> => {
  const config = await getOidcConfig();
  const callbackUrl = `${getOrigin(req)}/api/callback`;
  const returnTo = getSafeReturnTo(req.query.returnTo);

  const state = oidc.randomState();
  const nonce = oidc.randomNonce();
  const codeVerifier = oidc.randomPKCECodeVerifier();
  const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);

  const redirectTo = oidc.buildAuthorizationUrl(config, {
    redirect_uri: callbackUrl,
    scope: "openid email profile offline_access",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    prompt: "login consent",
    state,
    nonce,
  });

  setOidcCookie(res, "code_verifier", codeVerifier);
  setOidcCookie(res, "nonce", nonce);
  setOidcCookie(res, "state", state);
  setOidcCookie(res, "return_to", returnTo);

  res.redirect(redirectTo.href);
});

// ---------------------------------------------------------------------------
// GET /callback
// OIDC callback. Validates tokens (PKCE + nonce + state + signature), upserts
// user, bootstraps admin if applicable, creates session, sets cookie.
//
// Query params are NOT validated with Zod — the OIDC provider may send params
// not expressed in any schema.
// ---------------------------------------------------------------------------

router.get(
  "/callback",
  async (req: Request, res: Response): Promise<void> => {
    const config = await getOidcConfig();
    const callbackUrl = `${getOrigin(req)}/api/callback`;

    const codeVerifier = req.cookies?.code_verifier as string | undefined;
    const nonce = req.cookies?.nonce as string | undefined;
    const expectedState = req.cookies?.state as string | undefined;

    if (!codeVerifier || !expectedState) {
      res.redirect("/api/login");
      return;
    }

    const currentUrl = new URL(
      `${callbackUrl}?${new URL(req.url, `http://${req.headers.host}`).searchParams}`,
    );

    let tokens: oidc.TokenEndpointResponse & oidc.TokenEndpointResponseHelpers;
    try {
      tokens = await oidc.authorizationCodeGrant(config, currentUrl, {
        pkceCodeVerifier: codeVerifier,
        expectedNonce: nonce,
        expectedState,
        idTokenExpected: true,
      });
    } catch {
      res.redirect("/api/login");
      return;
    }

    // Clear all OIDC transient cookies regardless of outcome
    res.clearCookie("code_verifier", { path: "/" });
    res.clearCookie("nonce", { path: "/" });
    res.clearCookie("state", { path: "/" });

    const returnTo = getSafeReturnTo(req.cookies?.return_to as string | undefined);
    res.clearCookie("return_to", { path: "/" });

    const claims = tokens.claims();
    if (!claims) {
      res.redirect("/api/login");
      return;
    }

    const dbUser = await upsertUser(claims as unknown as Record<string, unknown>);

    // Bootstrap: grant admin access to all brands if user ID is in
    // ADMIN_REPLIT_IDS. This is idempotent (ON CONFLICT DO NOTHING) and runs
    // on every login for simplicity — it only writes anything the first time.
    // After the first write, user_brand_access is the source of truth.
    //
    // RULE: The final platform admin must never be removed. See the TODO in
    // the file header — the enforcement guard belongs in the admin management
    // routes, not here.
    await bootstrapAdminIfApplicable(dbUser.id);

    const now = Math.floor(Date.now() / 1000);
    const sessionData: SessionData = {
      user: dbUser,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expiresIn() ? now + tokens.expiresIn()! : claims.exp,
    };

    const sid = await createSession(sessionData);
    setSessionCookie(res, sid);

    logAuthEvent({
      user_id: dbUser.id,
      method: req.method,
      route: "/callback",
      result: "ALLOW",
      reason: "LOGIN_SUCCESS",
    });

    res.redirect(returnTo);
  },
);

// ---------------------------------------------------------------------------
// GET /logout
// Clears the session from the DB and the session cookie, then redirects to
// the OIDC end-session endpoint so Replit also invalidates the SSO session.
// ---------------------------------------------------------------------------

router.get("/logout", async (req: Request, res: Response): Promise<void> => {
  const config = await getOidcConfig();
  const origin = getOrigin(req);
  const sid = getSessionId(req);
  const userId = req.user?.id ?? null;

  await clearSession(res, sid);

  logAuthEvent({
    user_id: userId,
    method: req.method,
    route: "/logout",
    result: "ALLOW",
    reason: "LOGOUT",
  });

  const endSessionUrl = oidc.buildEndSessionUrl(config, {
    client_id: process.env.REPL_ID!,
    post_logout_redirect_uri: origin,
  });

  res.redirect(endSessionUrl.href);
});

export default router;
