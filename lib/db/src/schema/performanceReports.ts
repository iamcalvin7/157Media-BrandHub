import {
  pgTable, text, serial, integer, bigint, boolean, jsonb, numeric, timestamp, index, unique,
} from "drizzle-orm/pg-core";
import { brandsTable } from "./brands";
import { usersTable } from "./auth";
import { contentPostsTable } from "./contentPosts";

export const performanceReportsTable = pgTable(
  "performance_reports",
  {
    id: serial("id").primaryKey(),
    brand_id: integer("brand_id").notNull().references(() => brandsTable.id, { onDelete: "restrict" }),
    platform: text("platform").notNull(),
    month: text("month").notNull(),
    label: text("label"),
    uploaded_by: text("uploaded_by").references(() => usersTable.id, { onDelete: "set null" }),
    uploaded_at: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
    source_file_name: text("source_file_name"),
    post_count: integer("post_count").notNull().default(0),
    status: text("status").notNull().default("ready"),
  },
  (t) => ({
    brandIdx: index("performance_reports_brand_idx").on(t.brand_id),
    uniqBrandPlatformMonth: unique("performance_reports_brand_platform_month_uq").on(t.brand_id, t.platform, t.month),
  }),
);

export const performanceReportPostsTable = pgTable(
  "performance_report_posts",
  {
    id: serial("id").primaryKey(),
    report_id: integer("report_id").notNull().references(() => performanceReportsTable.id, { onDelete: "cascade" }),
    brand_id: integer("brand_id").notNull().references(() => brandsTable.id, { onDelete: "restrict" }),
    platform: text("platform").notNull(),
    post_id_external: text("post_id_external"),
    permalink: text("permalink"),
    publish_time: timestamp("publish_time", { withTimezone: true }),
    post_type: text("post_type"),
    caption: text("caption"),
    duration_sec: integer("duration_sec"),
    account_username: text("account_username"),
    is_partner: boolean("is_partner").notNull().default(false),
    is_crosspost: boolean("is_crosspost").notNull().default(false),
    is_share: boolean("is_share").notNull().default(false),
    views: bigint("views", { mode: "number" }),
    reach: bigint("reach", { mode: "number" }),
    likes: integer("likes"),
    comments: integer("comments"),
    shares: integer("shares"),
    saves: integer("saves"),
    follows: integer("follows"),
    link_clicks: integer("link_clicks"),
    total_clicks: integer("total_clicks"),
    raw_data: jsonb("raw_data"),
    content_post_id: integer("content_post_id").references(() => contentPostsTable.id, { onDelete: "set null" }),
  },
  (t) => ({
    reportIdx: index("performance_report_posts_report_idx").on(t.report_id),
    brandIdx: index("performance_report_posts_brand_idx").on(t.brand_id),
  }),
);

export const performanceReportSummariesTable = pgTable(
  "performance_report_summaries",
  {
    id: serial("id").primaryKey(),
    report_id: integer("report_id").notNull().references(() => performanceReportsTable.id, { onDelete: "cascade" }).unique(),
    total_posts: integer("total_posts").notNull().default(0),
    total_views: bigint("total_views", { mode: "number" }),
    total_reach: bigint("total_reach", { mode: "number" }),
    total_likes: integer("total_likes"),
    total_comments: integer("total_comments"),
    total_shares: integer("total_shares"),
    total_saves: integer("total_saves"),
    total_link_clicks: integer("total_link_clicks"),
    engagement_rate: numeric("engagement_rate", { precision: 8, scale: 4 }),
    top_post_ids: jsonb("top_post_ids").$type<number[]>().notNull().default([]),
    bottom_post_ids: jsonb("bottom_post_ids").$type<number[]>().notNull().default([]),
    best_day_of_week: text("best_day_of_week"),
    best_hour_of_day: integer("best_hour_of_day"),
  },
);

export type PerformanceReport = typeof performanceReportsTable.$inferSelect;
export type PerformanceReportPost = typeof performanceReportPostsTable.$inferSelect;
export type PerformanceReportSummary = typeof performanceReportSummariesTable.$inferSelect;
