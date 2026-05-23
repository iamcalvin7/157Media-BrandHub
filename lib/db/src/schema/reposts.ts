import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const repostsTable = pgTable("reposts", {
  id: serial("id").primaryKey(),
  brand_id: integer("brand_id").notNull(),
  platform: text("platform").notNull().default("Instagram"),
  author_handle: text("author_handle"),
  author_name: text("author_name"),
  source_url: text("source_url"),
  caption: text("caption"),
  notes: text("notes"),
  market: text("market"),
  permission_granted: boolean("permission_granted"),
  reposted: boolean("reposted").notNull().default(false),
  reposted_at: timestamp("reposted_at", { withTimezone: true }),
  reposted_on: text("reposted_on"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Repost = typeof repostsTable.$inferSelect;
export type InsertRepost = typeof repostsTable.$inferInsert;
