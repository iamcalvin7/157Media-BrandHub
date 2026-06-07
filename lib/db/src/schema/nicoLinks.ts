import { pgTable, text, serial, timestamp, integer, date, index } from "drizzle-orm/pg-core";
import { brandsTable } from "./brands";

// Drop-zone for the videographer (Nico): a flat table of dated links —
// videos, voiceovers, raw images etc. Brand-scoped (Virtu only in the UI
// today, but the schema is generic so any brand could use it).
export const nicoLinksTable = pgTable(
  "nico_links",
  {
    id: serial("id").primaryKey(),
    brand_id: integer("brand_id").notNull().default(1).references(() => brandsTable.id, { onDelete: "restrict" }),
    kind: text("kind").notNull(),
    name: text("name"),
    date: date("date"),
    url: text("url").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    brandIdx: index("nico_links_brand_idx").on(t.brand_id),
  }),
);

export type NicoLink = typeof nicoLinksTable.$inferSelect;
export type InsertNicoLink = typeof nicoLinksTable.$inferInsert;
