import { pgTable, text, serial, timestamp, integer, jsonb } from "drizzle-orm/pg-core";

export const savedItemsTable = pgTable("saved_items", {
  id: serial("id").primaryKey(),
  brand_id: integer("brand_id").notNull().default(1),
  kind: text("kind").notNull(),
  url: text("url"),
  title: text("title"),
  notes: text("notes"),
  thumbnailUrl: text("thumbnail_url"),
  // Free-form user tags ("summer", "visual", "pillar:guides", etc.). Mirrors
  // the mediaAssets tags column shape so the same jsonb pattern is reused.
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SavedItem = typeof savedItemsTable.$inferSelect;
export type InsertSavedItem = typeof savedItemsTable.$inferInsert;
