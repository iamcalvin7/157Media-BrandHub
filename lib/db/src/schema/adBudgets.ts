import { pgTable, serial, integer, text, real, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { brandsTable } from "./brands";

export const adBudgetsTable = pgTable(
  "ad_budgets",
  {
    id: serial("id").primaryKey(),
    brand_id: integer("brand_id").notNull().references(() => brandsTable.id, { onDelete: "restrict" }),
    spend_month: text("spend_month").notNull(), // YYYY-MM
    page: text("page").notNull(), // "GHS" | "VF-EN" | "VF-IT"
    budget_amount: real("budget_amount").notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pageMonthUnique: uniqueIndex("ad_budgets_brand_month_page_uidx").on(
      table.brand_id,
      table.spend_month,
      table.page,
    ),
  }),
);

export type AdBudget = typeof adBudgetsTable.$inferSelect;