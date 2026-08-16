import { pgTable, text, serial, timestamp, integer, real, boolean, index } from "drizzle-orm/pg-core";
import { brandsTable } from "./brands";

export const adBoostsTable = pgTable(
  "ad_boosts",
  {
    id: serial("id").primaryKey(),
    brand_id: integer("brand_id").notNull().references(() => brandsTable.id, { onDelete: "restrict" }),
    post_url: text("post_url").notNull(),
    boost_amount: real("boost_amount"),
    boost_duration: text("boost_duration"),
    target_audience: text("target_audience"), // "EN" | "IT" | "EN+IT"
    done: boolean("done").notNull().default(false),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    brandIdx: index("ad_boosts_brand_idx").on(table.brand_id),
  }),
);

export type AdBoost = typeof adBoostsTable.$inferSelect;
