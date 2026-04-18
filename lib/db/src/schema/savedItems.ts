import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";

export const savedItemsTable = pgTable("saved_items", {
  id: serial("id").primaryKey(),
  kind: text("kind").notNull(),
  url: text("url"),
  title: text("title"),
  notes: text("notes"),
  thumbnailUrl: text("thumbnail_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SavedItem = typeof savedItemsTable.$inferSelect;
export type InsertSavedItem = typeof savedItemsTable.$inferInsert;
