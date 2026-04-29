import { pgTable, text, varchar, integer, timestamp, jsonb } from "drizzle-orm/pg-core";

export const sharedCollectionsTable = pgTable("shared_collections", {
  token: varchar("token", { length: 32 }).primaryKey(),
  brand_id: integer("brand_id").notNull(),
  title: text("title"),
  post_ids: jsonb("post_ids").$type<number[]>().notNull().default([]),
  view_count: integer("view_count").notNull().default(0),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SharedCollection = typeof sharedCollectionsTable.$inferSelect;
