import { pgTable, text, serial, timestamp, integer, index } from "drizzle-orm/pg-core";
import { brandsTable } from "./brands";

export const pastPostsTable = pgTable(
  "past_posts",
  {
    id: serial("id").primaryKey(),
    brand_id: integer("brand_id").notNull().default(1).references(() => brandsTable.id, { onDelete: "restrict" }),
    date: text("date").notNull(),
    time: text("time"),
    platform: text("platform").notNull(),
    caption: text("caption").notNull(),
    direction: text("direction"),
    market: text("market"),
    imported_at: timestamp("imported_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    brandIdx: index("past_posts_brand_idx").on(t.brand_id),
  }),
);

export type PastPost = typeof pastPostsTable.$inferSelect;
export type InsertPastPost = typeof pastPostsTable.$inferInsert;
