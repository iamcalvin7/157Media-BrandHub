import { pgTable, serial, text, timestamp, integer, index } from "drizzle-orm/pg-core";

export const copywriterRulesTable = pgTable(
  "copywriter_rules",
  {
    id: serial("id").primaryKey(),
    brand_id: integer("brand_id").notNull().default(1),
    content: text("content").notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    brandIdx: index("copywriter_rules_brand_idx").on(t.brand_id),
  }),
);
