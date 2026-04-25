import { pgTable, text, serial, timestamp, boolean, integer } from "drizzle-orm/pg-core";

export const eventsTable = pgTable("events", {
  id: serial("id").primaryKey(),
  brand_id: integer("brand_id").notNull().default(1),
  title: text("title").notNull(),
  date: text("date").notNull(),
  end_date: text("end_date"),
  market: text("market").notNull().default("both"),
  type: text("type").notNull().default("seasonal"),
  notes: text("notes"),
  recurring: boolean("recurring").notNull().default(false),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Event = typeof eventsTable.$inferSelect;
export type InsertEvent = typeof eventsTable.$inferInsert;
