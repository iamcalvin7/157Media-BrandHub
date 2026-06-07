/**
 * authAuditLog — fire-and-forget audit logger for auth/access decisions.
 *
 * Rules enforced here:
 * - Never throws or rejects. A failed write must NEVER fail the request.
 * - The INSERT is deferred via Promise.resolve().then() so zero synchronous
 *   latency is added to the request path.
 * - Never log credentials, tokens, session IDs, raw headers, passwords, or
 *   any PII beyond user_id (which is the OIDC sub — not an email address).
 * - route must be the Express matched path pattern (e.g. /auth/access),
 *   never the raw URL, to prevent high-cardinality log entries.
 */

import { db, authAuditLogTable } from "@workspace/db";
import { logger } from "./logger.js";

export interface AuthAuditEvent {
  user_id?: string | null;
  brand_id?: number | null;
  method: string;
  route: string;
  result: "ALLOW" | "DENY";
  reason: string;
}

export function logAuthEvent(event: AuthAuditEvent): void {
  Promise.resolve()
    .then(() =>
      db.insert(authAuditLogTable).values({
        user_id: event.user_id ?? null,
        brand_id: event.brand_id ?? null,
        method: event.method,
        route: event.route,
        result: event.result,
        reason: event.reason,
      }),
    )
    .catch((err: unknown) => {
      logger.warn({ err }, "authAuditLog: failed to write audit event");
    });
}
