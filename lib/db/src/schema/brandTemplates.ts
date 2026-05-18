import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";

export const brandTemplatesTable = pgTable("brand_templates", {
  id: serial("id").primaryKey(),
  brand_id: integer("brand_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  media_url: text("media_url").notNull(),
  media_kind: text("media_kind").notNull(),
  template_url: text("template_url"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type BrandTemplate = typeof brandTemplatesTable.$inferSelect;
export type InsertBrandTemplate = typeof brandTemplatesTable.$inferInsert;
