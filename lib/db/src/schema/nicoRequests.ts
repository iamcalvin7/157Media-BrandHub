import { pgTable, text, serial, timestamp, date } from "drizzle-orm/pg-core";

export const nicoRequestsTable = pgTable("nico_requests", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  kind: text("kind").notNull().default("other"),
  description: text("description"),
  due_date: date("due_date"),
  time_note: text("time_note"),
  format: text("format"),
  script: text("script"),
  visual_direction: text("visual_direction"),
  visual_refs: text("visual_refs"),
  status: text("status").notNull().default("pending"),
  notes: text("notes"),
  drive_url: text("drive_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type NicoRequest = typeof nicoRequestsTable.$inferSelect;
export type InsertNicoRequest = typeof nicoRequestsTable.$inferInsert;
