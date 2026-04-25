import { pgTable, text, serial, timestamp, jsonb, integer, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const changelogEntriesTable = pgTable(
  "changelog_entries",
  {
    id: serial("id").primaryKey(),
    brand_id: integer("brand_id").notNull().default(1),
    sortKey: text("sort_key").notNull(),
    date: text("date").notNull(),
    category: text("category").notNull(),
    summary: text("summary").notNull(),
    capabilities: jsonb("capabilities").notNull().$type<string[]>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    brandSortKeyIdx: uniqueIndex("changelog_brand_sort_key_idx").on(table.brand_id, table.sortKey),
  }),
);

export const insertChangelogEntrySchema = createInsertSchema(changelogEntriesTable).omit({ id: true, createdAt: true });
export type InsertChangelogEntry = z.infer<typeof insertChangelogEntrySchema>;
export type ChangelogEntry = typeof changelogEntriesTable.$inferSelect;
