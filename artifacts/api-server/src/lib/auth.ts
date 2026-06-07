/**
 * auth.ts — Session management and OIDC configuration for Replit Auth.
 *
 * Sessions are stored as rows in the `sessions` PostgreSQL table. The session
 * ID is a 32-byte random hex string (not HMAC-signed) — security comes from
 * its entropy. No SESSION_SECRET is required.
 *
 * The OIDC client ID is process.env.REPL_ID, automatically set by Replit in
 * all environments (development and deployed).
 */

import * as client from "openid-client";
import crypto from "crypto";
import { type Request, type Response } from "express";
import { db, sessionsTable, usersTable, userBrandAccessTable, brandsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger.js";

// ---------------------------------------------------------------------------
// AuthUser type — shared between this module, authMiddleware, and routes
// ---------------------------------------------------------------------------

export interface AuthUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
}

// ---------------------------------------------------------------------------
// Session constants
// ---------------------------------------------------------------------------

export const ISSUER_URL = process.env.ISSUER_URL ?? "https://replit.com/oidc";
export const SESSION_COOKIE = "sid";
export const SESSION_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

export interface SessionData {
  user: AuthUser;
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
}

// ---------------------------------------------------------------------------
// OIDC configuration (lazy, cached)
// ---------------------------------------------------------------------------

let oidcConfig: client.Configuration | null = null;

export async function getOidcConfig(): Promise<client.Configuration> {
  if (!oidcConfig) {
    oidcConfig = await client.discovery(
      new URL(ISSUER_URL),
      process.env.REPL_ID!,
    );
  }
  return oidcConfig;
}

// ---------------------------------------------------------------------------
// Session CRUD
// ---------------------------------------------------------------------------

export async function createSession(data: SessionData): Promise<string> {
  const sid = crypto.randomBytes(32).toString("hex");
  await db.insert(sessionsTable).values({
    sid,
    sess: data as unknown as Record<string, unknown>,
    expire: new Date(Date.now() + SESSION_TTL),
  });
  return sid;
}

export async function getSession(sid: string): Promise<SessionData | null> {
  const [row] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.sid, sid));

  if (!row || row.expire < new Date()) {
    if (row) await deleteSession(sid);
    return null;
  }

  return row.sess as unknown as SessionData;
}

export async function updateSession(
  sid: string,
  data: SessionData,
): Promise<void> {
  await db
    .update(sessionsTable)
    .set({
      sess: data as unknown as Record<string, unknown>,
      expire: new Date(Date.now() + SESSION_TTL),
    })
    .where(eq(sessionsTable.sid, sid));
}

export async function deleteSession(sid: string): Promise<void> {
  await db.delete(sessionsTable).where(eq(sessionsTable.sid, sid));
}

export async function clearSession(
  res: Response,
  sid?: string,
): Promise<void> {
  if (sid) await deleteSession(sid);
  res.clearCookie(SESSION_COOKIE, { path: "/" });
}

export function getSessionId(req: Request): string | undefined {
  const authHeader = req.headers["authorization"];
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return req.cookies?.[SESSION_COOKIE];
}

// ---------------------------------------------------------------------------
// Admin bootstrap
// ---------------------------------------------------------------------------

/**
 * ADMIN_REPLIT_IDS — bootstrap-only.
 *
 * Comma-separated Replit OIDC sub values (e.g. "user:12345,user:67890").
 * When a user's OIDC sub is present in this set, they receive admin access
 * to ALL brands on their first successful login via an idempotent INSERT …
 * ON CONFLICT DO NOTHING. After that write, the database (user_brand_access)
 * is the sole authority for access decisions — this env var is never checked
 * again for access control.
 *
 * Set this in Replit secrets before the first login. It can be cleared or
 * left in place after bootstrap without affecting live access.
 */
const ADMIN_REPLIT_IDS: Set<string> = new Set(
  (process.env.ADMIN_REPLIT_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
);

if (ADMIN_REPLIT_IDS.size === 0) {
  logger.warn(
    "ADMIN_REPLIT_IDS is not set — no users will receive bootstrap admin " +
      "access on first login. Set this secret before the first login to " +
      "seed initial admin access.",
  );
}

/**
 * Grants admin access to every brand for users whose OIDC sub is in
 * ADMIN_REPLIT_IDS. Safe to call on every login — ON CONFLICT DO NOTHING
 * makes it idempotent. No-op for non-admin users.
 */
export async function bootstrapAdminIfApplicable(userId: string): Promise<void> {
  if (!ADMIN_REPLIT_IDS.has(userId)) return;

  const allBrands = await db.select({ id: brandsTable.id }).from(brandsTable);

  for (const brand of allBrands) {
    await db
      .insert(userBrandAccessTable)
      .values({ user_id: userId, brand_id: brand.id, role: "admin" })
      .onConflictDoNothing();
  }

  logger.info({ userId, brandCount: allBrands.length }, "auth: admin bootstrap applied");
}

// ---------------------------------------------------------------------------
// User upsert
// ---------------------------------------------------------------------------

export async function upsertUser(
  claims: Record<string, unknown>,
): Promise<AuthUser> {
  const userData = {
    id: claims.sub as string,
    email: (claims.email as string) || null,
    firstName: (claims.first_name as string) || null,
    lastName: (claims.last_name as string) || null,
    profileImageUrl: ((claims.profile_image_url as string) ||
      (claims.picture as string)) ?? null,
  };

  const [user] = await db
    .insert(usersTable)
    .values(userData)
    .onConflictDoUpdate({
      target: usersTable.id,
      set: { ...userData, updatedAt: new Date() },
    })
    .returning();

  return {
    id: user.id,
    email: user.email ?? null,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    profileImageUrl: user.profileImageUrl ?? null,
  };
}
