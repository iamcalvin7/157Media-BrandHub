import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const copywriterRulesTable = pgTable("copywriter_rules", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});
