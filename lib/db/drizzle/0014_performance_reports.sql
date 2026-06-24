CREATE TABLE "performance_reports" (
  "id" serial PRIMARY KEY NOT NULL,
  "brand_id" integer NOT NULL,
  "platform" text NOT NULL,
  "month" text NOT NULL,
  "label" text,
  "uploaded_by" text,
  "uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
  "source_file_name" text,
  "post_count" integer DEFAULT 0 NOT NULL,
  "status" text DEFAULT 'ready' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "performance_report_posts" (
  "id" serial PRIMARY KEY NOT NULL,
  "report_id" integer NOT NULL,
  "brand_id" integer NOT NULL,
  "platform" text NOT NULL,
  "post_id_external" text,
  "permalink" text,
  "publish_time" timestamp with time zone,
  "post_type" text,
  "caption" text,
  "duration_sec" integer,
  "account_username" text,
  "is_partner" boolean DEFAULT false NOT NULL,
  "is_crosspost" boolean DEFAULT false NOT NULL,
  "is_share" boolean DEFAULT false NOT NULL,
  "views" bigint,
  "reach" bigint,
  "likes" integer,
  "comments" integer,
  "shares" integer,
  "saves" integer,
  "follows" integer,
  "link_clicks" integer,
  "total_clicks" integer,
  "raw_data" jsonb,
  "content_post_id" integer
);
--> statement-breakpoint
CREATE TABLE "performance_report_summaries" (
  "id" serial PRIMARY KEY NOT NULL,
  "report_id" integer NOT NULL,
  "total_posts" integer DEFAULT 0 NOT NULL,
  "total_views" bigint,
  "total_reach" bigint,
  "total_likes" integer,
  "total_comments" integer,
  "total_shares" integer,
  "total_saves" integer,
  "total_link_clicks" integer,
  "engagement_rate" numeric(8, 4),
  "top_post_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "bottom_post_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "best_day_of_week" text,
  "best_hour_of_day" integer,
  CONSTRAINT "performance_report_summaries_report_id_unique" UNIQUE("report_id")
);
--> statement-breakpoint
ALTER TABLE "performance_reports"
  ADD CONSTRAINT "performance_reports_brand_id_brands_id_fk"
  FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "performance_reports"
  ADD CONSTRAINT "performance_reports_uploaded_by_users_id_fk"
  FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "performance_reports"
  ADD CONSTRAINT "performance_reports_brand_platform_month_uq"
  UNIQUE ("brand_id", "platform", "month");
--> statement-breakpoint
ALTER TABLE "performance_report_posts"
  ADD CONSTRAINT "performance_report_posts_report_id_fk"
  FOREIGN KEY ("report_id") REFERENCES "public"."performance_reports"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "performance_report_posts"
  ADD CONSTRAINT "performance_report_posts_brand_id_fk"
  FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "performance_report_posts"
  ADD CONSTRAINT "performance_report_posts_content_post_id_fk"
  FOREIGN KEY ("content_post_id") REFERENCES "public"."content_posts"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "performance_report_summaries"
  ADD CONSTRAINT "performance_report_summaries_report_id_fk"
  FOREIGN KEY ("report_id") REFERENCES "public"."performance_reports"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "performance_reports_brand_idx" ON "performance_reports" ("brand_id");
--> statement-breakpoint
CREATE INDEX "performance_report_posts_report_idx" ON "performance_report_posts" ("report_id");
--> statement-breakpoint
CREATE INDEX "performance_report_posts_brand_idx" ON "performance_report_posts" ("brand_id");
