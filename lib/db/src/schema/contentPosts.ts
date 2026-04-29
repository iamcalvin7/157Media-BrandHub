import {
  pgTable, text, serial, timestamp, integer, boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const contentPostsTable = pgTable("content_posts", {
  id: serial("id").primaryKey(),
  brand_id: integer("brand_id").notNull().default(1),
  market: text("market").notNull(),
  platform: text("platform").notNull(),
  pillar: text("pillar").notNull(),
  title: text("title"),
  tone_register: text("tone_register"),
  format: text("format").notNull(),
  caption: text("caption").notNull().default(""),
  visual_direction: text("visual_direction").notNull().default(""),
  resources: text("resources"),
  visual_reference_url: text("visual_reference_url"),
  cta: text("cta"),
  media_url: text("media_url"),
  link_url: text("link_url"),
  drive_url: text("drive_url"),
  cross_post: boolean("cross_post"),
  month: text("month").notNull(),
  scheduled_date: text("scheduled_date"),
  scheduled_time: text("scheduled_time"),
  status: text("status").notNull().default("pending"),
  creative_status: text("creative_status").notNull().default("To Do"),
  recurring: boolean("recurring").notNull().default(false),
  notes: text("notes"),
  assigned_to: text("assigned_to"),
  // "post" (default) for regular calendar posts; "profile_change" for non-post
  // updates like cover photo / profile pic / bio refreshes that still need to
  // be tracked on the calendar.
  entry_type: text("entry_type").notNull().default("post"),
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
