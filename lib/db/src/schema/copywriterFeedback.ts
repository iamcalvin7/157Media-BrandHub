import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";

export const copywriterFeedbackTable = pgTable("copywriter_feedback", {
  id: serial("id").primaryKey(),
  brand_id: integer("brand_id").notNull().default(1),
  type: text("type").notNull(), // "approved" | "rejected"
  caption: text("caption"),
  platform: text("platform"),
  market: text("market"),
  post_type: text("post_type"),
  note: text("note"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});
