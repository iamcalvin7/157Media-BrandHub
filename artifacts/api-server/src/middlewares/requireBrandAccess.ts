/**
 * requireBrandAccess(role) — Brand-level authorization enforcement (W2.B).
 *
 * Role hierarchy:  viewer (1) < editor (2) < admin (3)
 *
 * Decision matrix:
 *   !isAuthenticated()                        → 401  (x-api-key alone is NOT sufficient)
 *   brandNotFound (unknown brand header)      → 404
 *   no row in user_brand_access               → 403  + DENY audit log
 *   row exists but role rank insufficient     → 403  + DENY audit log
 *   role rank sufficient                      → next() + ALLOW audit log
 *   DB error at any step                      → 500  (fail-closed, never allows access)
 *
 * requireSession — session-only guard for hub-level (cross-brand) routes.
 *   !isAuthenticated() → 401
 *   valid session      → next()
 */

import type { Request, Response, NextFunction } from "express";
import { db, userBrandAccessTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { logAuthEvent } from "../lib/authAuditLog.js";
import { logger } from "../lib/logger.js";

export type BrandRole = "viewer" | "editor" | "admin";

const ROLE_RANK: Record<BrandRole, number> = {
  viewer: 1,
  editor: 2,
  admin: 3,
};

function hasMinimumRole(actual: string, minimum: BrandRole): boolean {
  const actualRank = ROLE_RANK[actual as BrandRole] ?? 0;
  return actualRank >= ROLE_RANK[minimum];
}

export function requireBrandAccess(
  minimumRole: BrandRole,
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // 1. Session required — x-api-key alone is NOT sufficient
    if (!req.isAuthenticated()) {
      logAuthEvent({
        user_id: null,
        brand_id: req.brandId ?? null,
        method: req.method,
        route: req.route?.path ?? req.path,
        result: "DENY",
        reason: "NO_SESSION",
      });
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // 2. Explicit brand header was provided but didn't match any known brand
    if (req.brandNotFound) {
      logAuthEvent({
        user_id: req.user!.id,
        brand_id: null,
        method: req.method,
        route: req.route?.path ?? req.path,
        result: "DENY",
        reason: "BRAND_NOT_FOUND",
      });
      res.status(404).json({ error: "Brand not found" });
      return;
    }

    // 3. Look up brand access for this user + brand  (fail-closed on DB error)
    let rows: { role: string }[];
    try {
      rows = await db
        .select({ role: userBrandAccessTable.role })
        .from(userBrandAccessTable)
        .where(
          and(
            eq(userBrandAccessTable.user_id, req.user!.id),
            eq(userBrandAccessTable.brand_id, req.brandId),
          ),
        );
    } catch (err) {
      logger.error(
        { err, userId: req.user!.id, brandId: req.brandId },
        "requireBrandAccess: DB error — failing closed",
      );
      res.status(500).json({ error: "Internal server error" });
      return;
    }

    // 4. No access row for this brand
    if (rows.length === 0) {
      logAuthEvent({
        user_id: req.user!.id,
        brand_id: req.brandId,
        method: req.method,
        route: req.route?.path ?? req.path,
        result: "DENY",
        reason: "NO_BRAND_ACCESS",
      });
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    // 5. Role check — user's actual role must meet or exceed the minimum
    const userRole = rows[0]!.role;
    if (!hasMinimumRole(userRole, minimumRole)) {
      logAuthEvent({
        user_id: req.user!.id,
        brand_id: req.brandId,
        method: req.method,
        route: req.route?.path ?? req.path,
        result: "DENY",
        reason: "INSUFFICIENT_ROLE",
      });
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    // 6. Access granted
    logAuthEvent({
      user_id: req.user!.id,
      brand_id: req.brandId,
      method: req.method,
      route: req.route?.path ?? req.path,
      result: "ALLOW",
      reason: "OK",
    });

    next();
  };
}

/**
 * requireSession — session-only guard for hub-level (cross-brand) routes.
 * Ensures the caller is authenticated but does NOT enforce brand-level access.
 * Use for routes that aggregate data across all brands (e.g. /content/feedback).
 */
export function requireSession(req: Request, res: Response, next: NextFunction): void {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}
