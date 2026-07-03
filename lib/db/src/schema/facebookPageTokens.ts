import { pgTable, serial, integer, varchar, text, timestamp, unique } from "drizzle-orm/pg-core";
import { brandsTable } from "./brands";

export const facebookPageTokensTable = pgTable(
  "facebook_page_tokens",
  {
    id: serial("id").primaryKey(),
    brand_id: integer("brand_id").notNull().references(() => brandsTable.id, { onDelete: "cascade" }),
    page_id: varchar("page_id", { length: 64 }).notNull(),
    page_name: varchar("page_name", { length: 255 }).notNull(),
    page_access_token: text("page_access_token").notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniq_brand_page: unique().on(t.brand_id, t.page_id),
  }),
);

export type FacebookPageToken = typeof facebookPageTokensTable.$inferSelect;
