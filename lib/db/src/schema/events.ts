import { pgTable, text, serial, timestamp, boolean, integer, index, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
// NOTE: events_market_check temporarily removed — production rows violate the constraint.
// Repair via POST /api/admin/repair/events-market, then re-add once prod data is clean.
import { brandsTable } from "./brands";

export const eventsTable = pgTable(
  "events",
  {
    id: serial("id").primaryKey(),
    brand_id: integer("brand_id").notNull().default(1).references(() => brandsTable.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    date: text("date").notNull(),
    end_date: text("end_date"),
    market: text("market").notNull().default("both"),
    type: text("type").notNull().default("seasonal"),
    notes: text("notes"),
    recurring: boolean("recurring").notNull().default(false),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    brandIdx: index("events_brand_idx").on(t.brand_id),
    typeCheck: check("events_type_check", sql`${t.type} IN ('brand_event', 'cultural', 'festival', 'public_holiday', 'seasonal')`),
  }),
);

export type Event = typeof eventsTable.$inferSelect;
export type InsertEvent = typeof eventsTable.$inferInsert;
