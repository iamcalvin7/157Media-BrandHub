import { pgTable, text, serial, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const contentIdeasTable = pgTable("content_ideas", {
  id: serial("id").primaryKey(),
  platform: text("platform").notNull(),
  theme: text("theme").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  hashtags: jsonb("hashtags").notNull().$type<string[]>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertContentIdeaSchema = createInsertSchema(contentIdeasTable).omit({ id: true, createdAt: true });
export type InsertContentIdea = z.infer<typeof insertContentIdeaSchema>;
export type ContentIdea = typeof contentIdeasTable.$inferSelect;
