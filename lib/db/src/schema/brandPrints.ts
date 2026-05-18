import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";

export const brandPrintsTable = pgTable("brand_prints", {
  id: serial("id").primaryKey(),
  brand_id: integer("brand_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  media_url: text("media_url").notNull(),
  media_kind: text("media_kind").notNull(),
  drive_url: text("drive_url"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type BrandPrint = typeof brandPrintsTable.$inferSelect;
export type InsertBrandPrint = typeof brandPrintsTable.$inferInsert;
