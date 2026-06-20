import { pgTable, text, serial, timestamp, integer, index } from "drizzle-orm/pg-core";
import { brandsTable } from "./brands";

export const brandResourcesTable = pgTable(
  "brand_resources",
  {
    id: serial("id").primaryKey(),
    brand_id: integer("brand_id").notNull().references(() => brandsTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    url: text("url").notNull(),
    notes: text("notes"),
    sort_order: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    brandIdx: index("brand_resources_brand_idx").on(t.brand_id),
  }),
);

export type BrandResource = typeof brandResourcesTable.$inferSelect;
export type InsertBrandResource = typeof brandResourcesTable.$inferInsert;
