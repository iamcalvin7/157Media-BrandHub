import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";

export const brandsTable = pgTable("brands", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  shortName: text("short_name"),
  tagline: text("tagline"),
  primaryColor: text("primary_color").notNull().default("#1e82b4"),
  accentColor: text("accent_color").notNull().default("#f6a610"),
  alertColor: text("alert_color").notNull().default("#e01814"),
  logoUrl: text("logo_url"),
  systemPromptKey: text("system_prompt_key"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Brand = typeof brandsTable.$inferSelect;
export type InsertBrand = typeof brandsTable.$inferInsert;
