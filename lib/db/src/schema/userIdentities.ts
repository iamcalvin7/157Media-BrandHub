import { pgTable, varchar, timestamp, primaryKey, index } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

export const userIdentitiesTable = pgTable(
  "user_identities",
  {
    provider:        varchar("provider").notNull(),
    providerSubject: varchar("provider_subject").notNull(),
    userId:          varchar("user_id")
                       .notNull()
                       .references(() => usersTable.id, { onDelete: "cascade" }),
    createdAt:       timestamp("created_at", { withTimezone: true })
                       .notNull()
                       .defaultNow(),
    lastLoginAt:     timestamp("last_login_at", { withTimezone: true }),
  },
  (t) => ({
    pk:      primaryKey({ columns: [t.provider, t.providerSubject] }),
    userIdx: index("user_identities_user_id_idx").on(t.userId),
  }),
);

export type UserIdentity      = typeof userIdentitiesTable.$inferSelect;
export type InsertUserIdentity = typeof userIdentitiesTable.$inferInsert;
