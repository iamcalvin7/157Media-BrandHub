import { pgTable, text, serial, timestamp, integer, jsonb, index } from "drizzle-orm/pg-core";

export const mediaAssetsTable = pgTable(
  "media_assets",
  {
    id: serial("id").primaryKey(),
    brand_id: integer("brand_id").notNull().default(1),
    name: text("name").notNull(),
    description: text("description"),
    kind: text("kind").notNull(),
    objectPath: text("object_path").notNull(),
    mimeType: text("mime_type"),
    sizeBytes: integer("size_bytes"),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    folder: text("folder"),
    sourceUrl: text("source_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    brandIdx: index("media_assets_brand_idx").on(t.brand_id),
  }),
);

export type MediaAsset = typeof mediaAssetsTable.$inferSelect;
export type InsertMediaAsset = typeof mediaAssetsTable.$inferInsert;
