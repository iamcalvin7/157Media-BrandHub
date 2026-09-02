import { jsonb, integer, pgTable, serial, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { brandsTable } from "./brands";

export const brandOffersTable = pgTable(
  "brand_offers",
  {
    id: serial("id").primaryKey(),
    brand_id: integer("brand_id").notNull().references(() => brandsTable.id, { onDelete: "cascade" }),
    content: jsonb("content").$type<Record<string, unknown>>().notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    brandUnique: uniqueIndex("brand_offers_brand_uidx").on(table.brand_id),
  }),
);

export type BrandOffers = typeof brandOffersTable.$inferSelect;