import { pgTable, text, serial, timestamp, integer, date, index } from "drizzle-orm/pg-core";
import { brandsTable } from "./brands";

export const brandPrintsTable = pgTable(
  "brand_prints",
  {
    id: serial("id").primaryKey(),
    brand_id: integer("brand_id").notNull().references(() => brandsTable.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    description: text("description"),
    media_url: text("media_url").notNull(),
    media_kind: text("media_kind").notNull(),
    drive_url: text("drive_url"),
    // 2026-05-18-i: print_date is intentionally kept in the schema but no longer
    // read or written by the UI/API. We replaced it with created_at (upload time)
    // but the column stays in place so the deploy-time schema diff has no
    // destructive change to validate. Do not drop or repurpose this column.
    print_date: date("print_date"),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    brandIdx: index("brand_prints_brand_idx").on(t.brand_id),
  }),
);

export type BrandPrint = typeof brandPrintsTable.$inferSelect;
export type InsertBrandPrint = typeof brandPrintsTable.$inferInsert;
