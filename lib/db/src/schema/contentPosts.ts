import {
  pgTable, text, serial, timestamp, integer, boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const contentPostsTable = pgTable("content_posts", {
  id: serial("id").primaryKey(),
  market: text("market").notNull(),
  platform: text("platform").notNull(),
  pillar: text("pillar").notNull(),
  tone_register: text("tone_register").notNull(),
  format: text("format").notNull(),
  caption: text("caption").notNull(),
  visual_direction: text("visual_direction").notNull(),
  cta: text("cta"),
  media_url: text("media_url"),
  link_url: text("link_url"),
  cross_post: boolean("cross_post"),
  month: text("month").notNull(),
  scheduled_date: text("scheduled_date"),
  status: text("status").notNull().default("pending"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const approvalDecisionsTable = pgTable("approval_decisions", {
  id: serial("id").primaryKey(),
  post_id: integer("post_id").references(() => contentPostsTable.id),
  decision: text("decision").notNull(),
  rejection_reason: text("rejection_reason"),
  decided_at: timestamp("decided_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertContentPostSchema = createInsertSchema(contentPostsTable).omit({ id: true, created_at: true });
export const insertApprovalDecisionSchema = createInsertSchema(approvalDecisionsTable).omit({ id: true, decided_at: true });

export type ContentPost = typeof contentPostsTable.$inferSelect;
export type ApprovalDecision = typeof approvalDecisionsTable.$inferSelect;
export type InsertContentPost = z.infer<typeof insertContentPostSchema>;
export type InsertApprovalDecision = z.infer<typeof insertApprovalDecisionSchema>;
