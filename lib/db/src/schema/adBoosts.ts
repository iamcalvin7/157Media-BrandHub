import { pgTable, text, serial, timestamp, integer, real, boolean, index, uniqueIndex, date } from "drizzle-orm/pg-core";
import { brandsTable } from "./brands";
import { contentPostsTable } from "./contentPosts";

export const adBoostsTable = pgTable(
  "ad_boosts",
  {
    id: serial("id").primaryKey(),
    brand_id: integer("brand_id").notNull().references(() => brandsTable.id, { onDelete: "restrict" }),
    content_post_id: integer("content_post_id").references(() => contentPostsTable.id, { onDelete: "cascade" }),
    post_url: text("post_url").notNull(),
    post_name: text("post_name"),
    posted_on: date("posted_on"),
    boost_amount: real("boost_amount"),
    boost_duration: text("boost_duration"),
    target_audience: text("target_audience"), // "EN" | "IT" | "EN+IT"
    spend_month: text("spend_month"), // YYYY-MM for month-split allocations
    page: text("page"), // "GHS" | "VF-EN" | "VF-IT"
    source: text("source").notNull().default("manual"), // "manual" | "calendar"
    done: boolean("done").notNull().default(false),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    brandIdx: index("ad_boosts_brand_idx").on(table.brand_id),
    contentPostIdx: index("ad_boosts_content_post_idx").on(table.content_post_id),
    sourceMonthIdx: uniqueIndex("ad_boosts_content_post_month_uidx").on(table.content_post_id, table.spend_month),
  }),
);

export type AdBoost = typeof adBoostsTable.$inferSelect;
