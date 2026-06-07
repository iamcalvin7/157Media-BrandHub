import { sql } from "drizzle-orm";
import { pgTable, varchar, integer, text, timestamp, index, check, primaryKey } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";
import { brandsTable } from "./brands";

export const userBrandAccessTable = pgTable(
  "user_brand_access",
  {
    user_id: varchar("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    brand_id: integer("brand_id")
      .notNull()
      .references(() => brandsTable.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    granted_at: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.user_id, t.brand_id] }),
    userIdx: index("user_brand_access_user_idx").on(t.user_id),
    roleCheck: check(
      "user_brand_access_role_check",
      sql`${t.role} IN ('admin', 'editor', 'viewer')`,
    ),
  }),
);

export type UserBrandAccess = typeof userBrandAccessTable.$inferSelect;
export type InsertUserBrandAccess = typeof userBrandAccessTable.$inferInsert;
