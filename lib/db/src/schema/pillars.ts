import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";

export const pillarsTable = pgTable("pillars", {
  id: serial("id").primaryKey(),
  brand_id: integer("brand_id").notNull().default(1),
  name: text("name").notNull(),
  market: text("market").notNull().default("both"), // 'english' | 'italian' | 'both'
  sort_order: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Pillar = typeof pillarsTable.$inferSelect;
