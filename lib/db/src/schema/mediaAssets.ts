import { pgTable, text, serial, timestamp, integer, jsonb } from "drizzle-orm/pg-core";

export const mediaAssetsTable = pgTable("media_assets", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  kind: text("kind").notNull(),
  objectPath: text("object_path").notNull(),
  mimeType: text("mime_type"),
  sizeBytes: integer("size_bytes"),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type MediaAsset = typeof mediaAssetsTable.$inferSelect;
export type InsertMediaAsset = typeof mediaAssetsTable.$inferInsert;
