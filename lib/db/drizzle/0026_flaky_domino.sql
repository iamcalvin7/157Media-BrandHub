ALTER TABLE "content_posts" ADD COLUMN "boost_daily_budget" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "content_posts" ADD COLUMN "boost_start_date" date;--> statement-breakpoint
ALTER TABLE "content_posts" ADD COLUMN "boost_end_date" date;