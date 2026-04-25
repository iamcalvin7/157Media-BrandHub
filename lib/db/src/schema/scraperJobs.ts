import { pgTable, text, serial, timestamp, integer, index } from "drizzle-orm/pg-core";

export const scraperJobsTable = pgTable("scraper_jobs", {
  id: serial("id").primaryKey(),
  brand_id: integer("brand_id").notNull().default(1),
  root_url: text("root_url").notNull(),
  status: text("status").notNull().default("queued"),
  error: text("error"),
  page_count: integer("page_count").notNull().default(0),
  max_pages: integer("max_pages").notNull().default(200),
  max_depth: integer("max_depth").notNull().default(5),
  started_at: timestamp("started_at", { withTimezone: true }),
  finished_at: timestamp("finished_at", { withTimezone: true }),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  brandIdx: index("scraper_jobs_brand_idx").on(t.brand_id, t.created_at),
}));

export const scraperPagesTable = pgTable("scraper_pages", {
  id: serial("id").primaryKey(),
  job_id: integer("job_id").notNull().references(() => scraperJobsTable.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  title: text("title"),
  content: text("content"),
  status_code: integer("status_code"),
  depth: integer("depth").notNull().default(0),
  fetched_at: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  jobIdx: index("scraper_pages_job_idx").on(t.job_id),
}));

export type ScraperJob = typeof scraperJobsTable.$inferSelect;
export type InsertScraperJob = typeof scraperJobsTable.$inferInsert;
export type ScraperPage = typeof scraperPagesTable.$inferSelect;
export type InsertScraperPage = typeof scraperPagesTable.$inferInsert;
