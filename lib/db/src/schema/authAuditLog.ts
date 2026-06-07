import { sql } from "drizzle-orm";
import { pgTable, serial, varchar, integer, text, timestamp, index, check } from "drizzle-orm/pg-core";

export const authAuditLogTable = pgTable(
  "auth_audit_log",
  {
    id: serial("id").primaryKey(),
    user_id: varchar("user_id"),
    brand_id: integer("brand_id"),
    method: text("method").notNull(),
    route: text("route").notNull(),
    result: text("result").notNull(),
    reason: text("reason"),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    createdAtIdx: index("auth_audit_log_created_at_idx").on(t.created_at),
    userCreatedAtIdx: index("auth_audit_log_user_created_at_idx").on(t.user_id, t.created_at),
    resultCheck: check(
      "auth_audit_log_result_check",
      sql`${t.result} IN ('ALLOW', 'DENY')`,
    ),
  }),
);

export type AuthAuditLog = typeof authAuditLogTable.$inferSelect;
export type InsertAuthAuditLog = typeof authAuditLogTable.$inferInsert;
