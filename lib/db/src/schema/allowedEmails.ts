import { pgTable, varchar, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

export const allowedEmailsTable = pgTable("allowed_emails", {
  email:   varchar("email").primaryKey(),
  addedBy: varchar("added_by")
             .references(() => usersTable.id, { onDelete: "set null" }),
  note:    varchar("note"),
  addedAt: timestamp("added_at", { withTimezone: true })
             .notNull()
             .defaultNow(),
});

export type AllowedEmail      = typeof allowedEmailsTable.$inferSelect;
export type InsertAllowedEmail = typeof allowedEmailsTable.$inferInsert;
