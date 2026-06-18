/**
 * auth.ts — Clerk-based auth helpers.
 *
 * Responsibilities:
 *   resolveClerkUser  — fast-path per-request lookup: Clerk userId → AuthUser
 *   provisionClerkUser — first-login provisioning: create users + user_identities rows
 *   bootstrapAdminIfApplicable — idempotent brand-admin seeding via ADMIN_CLERK_EMAILS
 *
 * Sessions are no longer stored in the DB. Clerk manages session state client-side;
 * the backend verifies the short-lived session JWT on every request via clerkMiddleware().
 */

import { and, eq } from "drizzle-orm";
import {
  db,
  usersTable,
  userIdentitiesTable,
  allowedEmailsTable,
  userBrandAccessTable,
  brandsTable,
} from "@workspace/db";
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
// Bootstrap admin list
// ---------------------------------------------------------------------------

/**
 * ADMIN_CLERK_EMAILS — comma-separated email addresses that receive admin access
 * to ALL brands on their first successful login. Checked case-insensitively.
 *
 * Idempotent: ON CONFLICT DO NOTHING ensures repeated logins are no-ops.
 * After the first write, user_brand_access is the sole authority for access.
 */
const ADMIN_CLERK_EMAILS: Set<string> = new Set(
  (process.env.ADMIN_CLERK_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
);

if (ADMIN_CLERK_EMAILS.size === 0) {
  logger.warn(
    "ADMIN_CLERK_EMAILS is not set — no bootstrap admin access will be " +
      "seeded on first login. Set this secret before the first Clerk sign-in.",
  );
}

// ---------------------------------------------------------------------------
// resolveClerkUser — fast path, runs on every authenticated request
// ---------------------------------------------------------------------------

/**
 * Looks up the internal AuthUser for a Clerk userId.
 *
 * Uses user_identities as the mapping table:
 *   Clerk userId (provider_subject) → users.id (our stable internal UUID)
 *
 * Returns null if the user has not yet been provisioned (POST /auth/provision
 * has never been called for this Clerk userId). In that case the request
 * continues without req.user — the provision route handles the bootstrapping.
 */
export async function resolveClerkUser(
  clerkUserId: string,
): Promise<AuthUser | null> {
  const [identity] = await db
    .select({ userId: userIdentitiesTable.userId })
    .from(userIdentitiesTable)
    .where(
      and(
        eq(userIdentitiesTable.provider, "clerk"),
        eq(userIdentitiesTable.providerSubject, clerkUserId),
      ),
    );

  if (!identity) return null;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, identity.userId));

  if (!user) return null;

  return {
    id: user.id,
    email: user.email ?? null,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    profileImageUrl: user.profileImageUrl ?? null,
  };
}

// ---------------------------------------------------------------------------
// provisionClerkUser — first-login provisioning
// ---------------------------------------------------------------------------

export interface ProvisionParams {
  clerkUserId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
}

/**
 * Provisions a Clerk user into our DB. Safe to call on every login — idempotent.
 *
 * Steps:
 *   1. Gate on allowed_emails — throws { statusCode: 403 } if not found.
 *   2. Upsert users row (find by email to handle migration; or create with UUID).
 *   3. Upsert user_identities row (provider='clerk', provider_subject=clerkUserId).
 *   4. Update last_login_at on the identity row.
 *   5. Bootstrap admin access if email is in ADMIN_CLERK_EMAILS.
 *   6. Return the AuthUser.
 */
export async function provisionClerkUser(
  params: ProvisionParams,
): Promise<AuthUser> {
  const { clerkUserId, email, firstName, lastName, profileImageUrl } = params;

  // 1. Allowlist gate
  // Emails in ADMIN_CLERK_EMAILS are always trusted — they bypass the
  // allowed_emails table check. This handles the bootstrap case where
  // production's allowed_emails is empty (e.g. first deploy) but the
  // admin email is already known via the env var.
  const isAdminEmail = ADMIN_CLERK_EMAILS.has(email.toLowerCase());

  if (!isAdminEmail) {
    const [allowed] = await db
      .select({ email: allowedEmailsTable.email })
      .from(allowedEmailsTable)
      .where(eq(allowedEmailsTable.email, email));

    if (!allowed) {
      const err = new Error(`Email not in allowed list: ${email}`) as Error & {
        statusCode: number;
      };
      err.statusCode = 403;
      throw err;
    }
  }

  // 2. Upsert users row — find by email first so the UUID migration
  //    (users.id promoted before Clerk cutover) is respected.
  const [existingUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email));

  let userId: string;

  if (existingUser) {
    await db
      .update(usersTable)
      .set({
        firstName: firstName ?? existingUser.firstName,
        lastName: lastName ?? existingUser.lastName,
        profileImageUrl: profileImageUrl ?? existingUser.profileImageUrl,
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, existingUser.id));
    userId = existingUser.id;
  } else {
    const [newUser] = await db
      .insert(usersTable)
      .values({ email, firstName, lastName, profileImageUrl })
      .returning();
    userId = newUser!.id;
  }

  // 3 & 4. Upsert user_identities + refresh last_login_at
  await db
    .insert(userIdentitiesTable)
    .values({
      provider: "clerk",
      providerSubject: clerkUserId,
      userId,
      lastLoginAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [userIdentitiesTable.provider, userIdentitiesTable.providerSubject],
      set: { lastLoginAt: new Date() },
    });

  // 5. Bootstrap admin access for ADMIN_CLERK_EMAILS users
  await bootstrapAdminIfApplicable(userId, email);

  // 6. Fallback: any user who passed the allowlist but has no brand access yet
  //    gets admin on all brands. Covers allowed_emails users whose access rows
  //    were never seeded (e.g. first login after being added to allowed_emails).
  const existingAccess = await db
    .select({ id: userBrandAccessTable.brand_id })
    .from(userBrandAccessTable)
    .where(eq(userBrandAccessTable.user_id, userId));

  if (existingAccess.length === 0) {
    const allBrands = await db.select({ id: brandsTable.id }).from(brandsTable);
    for (const brand of allBrands) {
      await db
        .insert(userBrandAccessTable)
        .values({ user_id: userId, brand_id: brand.id, role: "admin" })
        .onConflictDoNothing();
    }
    logger.info({ userId, email, brandCount: allBrands.length }, "auth: default admin access granted on first login");
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  return {
    id: user!.id,
    email: user!.email ?? null,
    firstName: user!.firstName ?? null,
    lastName: user!.lastName ?? null,
    profileImageUrl: user!.profileImageUrl ?? null,
  };
}

// ---------------------------------------------------------------------------
// bootstrapAdminIfApplicable
// ---------------------------------------------------------------------------

/**
 * Grants admin access to every brand for a user whose email is in
 * ADMIN_CLERK_EMAILS. ON CONFLICT DO NOTHING makes this fully idempotent.
 */
export async function bootstrapAdminIfApplicable(
  userId: string,
  email: string,
): Promise<void> {
  if (!ADMIN_CLERK_EMAILS.has(email.toLowerCase())) return;

  const allBrands = await db.select({ id: brandsTable.id }).from(brandsTable);

  for (const brand of allBrands) {
    await db
      .insert(userBrandAccessTable)
      .values({ user_id: userId, brand_id: brand.id, role: "admin" })
      .onConflictDoNothing();
  }

  logger.info(
    { userId, brandCount: allBrands.length },
    "auth: admin bootstrap applied",
  );
}
