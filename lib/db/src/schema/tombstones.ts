import { pgTable, varchar, bigint, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Tracks rows deleted on the live site so the snapshot bootstrap doesn't revive
// them from the dev snapshot on the next deploy. Only knowledge-base tables that
// participate in snapshot merges need tombstone entries — content tables (e.g.
// content_posts) are left untouched by the bootstrap once prod has any data, so
// prod-side deletes there already stick automatically.
//
// This table is also created lazily at runtime in
// artifacts/api-server/src/lib/tombstones.ts (`ensureTombstonesTable`) as a
// belt-and-suspenders guard. The runtime DDL is idempotent; having this schema
// definition ensures the table is created correctly on a fresh DB via migrations.
export const deletedRowTombstonesTable = pgTable(
  "deleted_row_tombstones",
  {
    table_name: varchar("table_name", { length: 64 }).notNull(),
    row_id: bigint("row_id", { mode: "number" }).notNull(),
    deleted_at: timestamp("deleted_at", { withTimezone: true })
      .notNull()
      .default(sql`NOW()`),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.table_name, t.row_id] }),
  }),
);

export type DeletedRowTombstone = typeof deletedRowTombstonesTable.$inferSelect;
