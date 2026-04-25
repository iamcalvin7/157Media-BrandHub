import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";

export const pastPostsTable = pgTable("past_posts", {
  id: serial("id").primaryKey(),
  brand_id: integer("brand_id").notNull().default(1),
  date: text("date").notNull(),
  time: text("time"),
  platform: text("platform").notNull(),
  caption: text("caption").notNull(),
  direction: text("direction"),
  market: text("market"),
  imported_at: timestamp("imported_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PastPost = typeof pastPostsTable.$inferSelect;
export type InsertPastPost = typeof pastPostsTable.$inferInsert;
