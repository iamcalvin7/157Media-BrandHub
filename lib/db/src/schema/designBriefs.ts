import { pgTable, text, varchar, timestamp, jsonb } from "drizzle-orm/pg-core";

type VisualRef = { name: string; dataUrl: string };

export const designBriefSharesTable = pgTable("design_brief_shares", {
  token: varchar("token", { length: 32 }).primaryKey(),
  brand_slug: text("brand_slug").notNull(),
  brand_name: text("brand_name"),
  brief_text: text("brief_text").notNull(),
  snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull(),
  visual_refs: jsonb("visual_refs").$type<VisualRef[]>().notNull().default([]),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type DesignBriefShare = typeof designBriefSharesTable.$inferSelect;
