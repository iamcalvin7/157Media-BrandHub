/**
 * accessAdmin.ts — Brand-level user access management endpoints (W2.B2).
 *
 * All routes are admin-only (requireBrandAccess('admin')).
 * The path :brandId must match req.brandId (the brand resolved from
 * X-Brand-Slug) — this prevents an admin of brand A from mutating brand B.
 *
 * Endpoints:
 *   GET    /admin/access/brands/:brandId/users           — list access rows
 *   POST   /admin/access/brands/:brandId/users           — grant or update access
 *   PATCH  /admin/access/brands/:brandId/users/:userId   — update role
 *   DELETE /admin/access/brands/:brandId/users/:userId   — revoke access
 *
 * Final-admin guard (PATCH / DELETE):
 *   Any operation that would leave the target brand with zero admin rows
 *   is rejected with HTTP 409 CONFLICT and logged with reason FINAL_ADMIN_GUARD.
 *
 * Audit events written to auth_audit_log:
 *   ACCESS_GRANTED    — POST completed (grant or update)
 *   ROLE_UPDATED      — PATCH completed
 *   ACCESS_REVOKED    — DELETE completed
 *   FINAL_ADMIN_GUARD — operation blocked by final-admin guard
 */

import { Router, type IRouter } from "express";
import { requireBrandAccess } from "../middlewares/requireBrandAccess.js";
import { routeParam } from "../lib/routeParam.js";
import { logAuthEvent } from "../lib/authAuditLog.js";
import { logger } from "../lib/logger.js";
import { db, userBrandAccessTable, usersTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";

const router: IRouter = Router();

const VALID_ROLES = new Set<string>(["viewer", "editor", "admin"]);

// ─── helpers ─────────────────────────────────────────────────────────────────

/**
 * Parse and validate the path :brandId param.
 * Returns { ok: false } if the value is not a valid integer or does not
 * match the brand already resolved by brandContextMiddleware (req.brandId).
 */
function parseBrandId(
  param: string | string[],
  reqBrandId: number,
): { ok: true; brandId: number } | { ok: false } {
  const brandId = parseInt(routeParam(param), 10);
  if (isNaN(brandId) || brandId !== reqBrandId) return { ok: false };
  return { ok: true, brandId };
}

/**
 * Count other admin rows for the same brand, excluding the
 * (targetUserId, targetBrandId) pair about to be removed or demoted.
 * A result of 0 means the operation would leave the brand with no admins
 * and must be rejected (final-admin guard — per-brand invariant).
 */
async function countOtherAdmins(
  targetUserId: string,
  targetBrandId: number,
): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(userBrandAccessTable)
    .where(
      and(
        eq(userBrandAccessTable.role, "admin"),
        eq(userBrandAccessTable.brand_id, targetBrandId),
        sql`${userBrandAccessTable.user_id} != ${targetUserId}`,
      ),
    );
  return row?.count ?? 0;
}

// ─── GET /admin/access/brands/:brandId/users ─────────────────────────────────

router.get(
  "/admin/access/brands/:brandId/users",
  requireBrandAccess("admin"),
  async (req, res): Promise<void> => {
    const parsed = parseBrandId(req.params.brandId, req.brandId);
    if (!parsed.ok) {
      res.status(403).json({ error: "Forbidden: brand mismatch" });
      return;
    }

    try {
      const rows = await db
        .select({
          user_id: userBrandAccessTable.user_id,
          brand_id: userBrandAccessTable.brand_id,
          role: userBrandAccessTable.role,
          granted_at: userBrandAccessTable.granted_at,
          email: usersTable.email,
          firstName: usersTable.firstName,
          lastName: usersTable.lastName,
          profileImageUrl: usersTable.profileImageUrl,
        })
        .from(userBrandAccessTable)
        .leftJoin(usersTable, eq(userBrandAccessTable.user_id, usersTable.id))
        .where(eq(userBrandAccessTable.brand_id, parsed.brandId));

      res.json(rows);
    } catch (err) {
      logger.error({ err }, "accessAdmin: failed to list brand users");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// ─── POST /admin/access/brands/:brandId/users ────────────────────────────────
// Grant access to a user, or update their role if they already have a row.

router.post(
  "/admin/access/brands/:brandId/users",
  requireBrandAccess("admin"),
  async (req, res): Promise<void> => {
    const parsed = parseBrandId(req.params.brandId, req.brandId);
    if (!parsed.ok) {
      res.status(403).json({ error: "Forbidden: brand mismatch" });
      return;
    }

    const { user_id, role } = req.body as {
      user_id?: unknown;
      role?: unknown;
    };

    if (typeof user_id !== "string" || !user_id.trim()) {
      res.status(400).json({ error: "user_id is required" });
      return;
    }
    if (typeof role !== "string" || !VALID_ROLES.has(role)) {
      res.status(400).json({ error: "role must be one of: viewer, editor, admin" });
      return;
    }

    try {
      const [row] = await db
        .insert(userBrandAccessTable)
        .values({ user_id: user_id.trim(), brand_id: parsed.brandId, role })
        .onConflictDoUpdate({
          target: [userBrandAccessTable.user_id, userBrandAccessTable.brand_id],
          set: { role, granted_at: new Date() },
        })
        .returning();

      logAuthEvent({
        user_id: req.user!.id,
        brand_id: parsed.brandId,
        method: req.method,
        route: req.route?.path ?? req.path,
        result: "ALLOW",
        reason: "ACCESS_GRANTED",
      });

      res.status(201).json(row);
    } catch (err) {
      logger.error({ err }, "accessAdmin: failed to grant access");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// ─── PATCH /admin/access/brands/:brandId/users/:userId ───────────────────────
// Update the role of an existing access row.
// Enforces final-admin guard on admin → non-admin demotion.

router.patch(
  "/admin/access/brands/:brandId/users/:userId",
  requireBrandAccess("admin"),
  async (req, res): Promise<void> => {
    const parsed = parseBrandId(req.params.brandId, req.brandId);
    if (!parsed.ok) {
      res.status(403).json({ error: "Forbidden: brand mismatch" });
      return;
    }

    const userId = routeParam(req.params.userId);
    const { role } = req.body as { role?: unknown };

    if (typeof role !== "string" || !VALID_ROLES.has(role)) {
      res.status(400).json({ error: "role must be one of: viewer, editor, admin" });
      return;
    }

    try {
      const [existing] = await db
        .select({ role: userBrandAccessTable.role })
        .from(userBrandAccessTable)
        .where(
          and(
            eq(userBrandAccessTable.user_id, userId),
            eq(userBrandAccessTable.brand_id, parsed.brandId),
          ),
        );

      if (!existing) {
        res.status(404).json({ error: "Access row not found" });
        return;
      }

      // Final-admin guard: demoting the last global admin is forbidden
      if (existing.role === "admin" && role !== "admin") {
        const otherAdmins = await countOtherAdmins(userId, parsed.brandId);
        if (otherAdmins === 0) {
          logAuthEvent({
            user_id: req.user!.id,
            brand_id: parsed.brandId,
            method: req.method,
            route: req.route?.path ?? req.path,
            result: "DENY",
            reason: "FINAL_ADMIN_GUARD",
          });
          res.status(409).json({ error: "Cannot demote the final platform admin" });
          return;
        }
      }

      const [updated] = await db
        .update(userBrandAccessTable)
        .set({ role })
        .where(
          and(
            eq(userBrandAccessTable.user_id, userId),
            eq(userBrandAccessTable.brand_id, parsed.brandId),
          ),
        )
        .returning();

      logAuthEvent({
        user_id: req.user!.id,
        brand_id: parsed.brandId,
        method: req.method,
        route: req.route?.path ?? req.path,
        result: "ALLOW",
        reason: "ROLE_UPDATED",
      });

      res.json(updated);
    } catch (err) {
      logger.error({ err }, "accessAdmin: failed to update role");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// ─── DELETE /admin/access/brands/:brandId/users/:userId ──────────────────────
// Revoke a user's access to the brand.
// Enforces final-admin guard if the target row is the last global admin.

router.delete(
  "/admin/access/brands/:brandId/users/:userId",
  requireBrandAccess("admin"),
  async (req, res): Promise<void> => {
    const parsed = parseBrandId(req.params.brandId, req.brandId);
    if (!parsed.ok) {
      res.status(403).json({ error: "Forbidden: brand mismatch" });
      return;
    }

    const userId = routeParam(req.params.userId);

    try {
      const [existing] = await db
        .select({ role: userBrandAccessTable.role })
        .from(userBrandAccessTable)
        .where(
          and(
            eq(userBrandAccessTable.user_id, userId),
            eq(userBrandAccessTable.brand_id, parsed.brandId),
          ),
        );

      if (!existing) {
        res.status(404).json({ error: "Access row not found" });
        return;
      }

      // Final-admin guard: revoking the last global admin is forbidden
      if (existing.role === "admin") {
        const otherAdmins = await countOtherAdmins(userId, parsed.brandId);
        if (otherAdmins === 0) {
          logAuthEvent({
            user_id: req.user!.id,
            brand_id: parsed.brandId,
            method: req.method,
            route: req.route?.path ?? req.path,
            result: "DENY",
            reason: "FINAL_ADMIN_GUARD",
          });
          res.status(409).json({ error: "Cannot revoke the final platform admin" });
          return;
        }
      }

      await db
        .delete(userBrandAccessTable)
        .where(
          and(
            eq(userBrandAccessTable.user_id, userId),
            eq(userBrandAccessTable.brand_id, parsed.brandId),
          ),
        );

      logAuthEvent({
        user_id: req.user!.id,
        brand_id: parsed.brandId,
        method: req.method,
        route: req.route?.path ?? req.path,
        result: "ALLOW",
        reason: "ACCESS_REVOKED",
      });

      res.sendStatus(204);
    } catch (err) {
      logger.error({ err }, "accessAdmin: failed to revoke access");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;
