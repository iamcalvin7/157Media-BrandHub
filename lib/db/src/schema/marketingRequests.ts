import { pgTable, text, serial, timestamp, integer, date, index, jsonb } from "drizzle-orm/pg-core";
import { brandsTable } from "./brands";

export const marketingRequestsTable = pgTable(
  "marketing_requests",
  {
    id: serial("id").primaryKey(),
    brand_id: integer("brand_id").notNull().references(() => brandsTable.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    request_type: text("request_type"),
    sizes: jsonb("sizes").$type<string[]>(),
    designer: text("designer"),
    deadline: date("deadline"),
    market: text("market"),
    status: text("status").notNull().default("pending"),
    notes: text("notes"),
    drive_url: text("drive_url"),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    brandIdx: index("marketing_requests_brand_idx").on(t.brand_id),
  }),
);

export type MarketingRequest = typeof marketingRequestsTable.$inferSelect;
export type InsertMarketingRequest = typeof marketingRequestsTable.$inferInsert;
