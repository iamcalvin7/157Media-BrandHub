import { pgTable, text, serial, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const changelogEntriesTable = pgTable("changelog_entries", {
  id: serial("id").primaryKey(),
  sortKey: text("sort_key").notNull().unique(),
  date: text("date").notNull(),
  category: text("category").notNull(),
  summary: text("summary").notNull(),
  capabilities: jsonb("capabilities").notNull().$type<string[]>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertChangelogEntrySchema = createInsertSchema(changelogEntriesTable).omit({ id: true, createdAt: true });
export type InsertChangelogEntry = z.infer<typeof insertChangelogEntrySchema>;
export type ChangelogEntry = typeof changelogEntriesTable.$inferSelect;
