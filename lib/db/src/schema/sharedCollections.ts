import { pgTable, text, varchar, integer, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { brandsTable } from "./brands";

export const sharedCollectionsTable = pgTable(
  "shared_collections",
  {
    token: varchar("token", { length: 32 }).primaryKey(),
    brand_id: integer("brand_id").notNull().references(() => brandsTable.id, { onDelete: "restrict" }),
    title: text("title"),
    post_ids: jsonb("post_ids").$type<number[]>().notNull().default([]),
    view_count: integer("view_count").notNull().default(0),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    brandIdx: index("shared_collections_brand_idx").on(t.brand_id),
  }),
);

export type SharedCollection = typeof sharedCollectionsTable.$inferSelect;
