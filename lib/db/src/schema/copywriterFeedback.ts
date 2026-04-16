import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const copywriterFeedbackTable = pgTable("copywriter_feedback", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // "approved" | "rejected"
  caption: text("caption"),
  platform: text("platform"),
  market: text("market"),
  post_type: text("post_type"),
  note: text("note"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});
