import { pgTable, integer, text, timestamp, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const dataSnapshotVersionTable = pgTable(
  "data_snapshot_version",
  {
    id: integer("id").primaryKey().default(1),
    version: text("version").notNull(),
    appliedAt: timestamp("applied_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    singleRow: check("single_row", sql`${table.id} = 1`),
  }),
);

export type DataSnapshotVersion = typeof dataSnapshotVersionTable.$inferSelect;
