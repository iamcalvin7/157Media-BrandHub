CREATE TABLE "brands" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"short_name" text,
	"tagline" text,
	"primary_color" text DEFAULT '#1e82b4' NOT NULL,
	"accent_color" text DEFAULT '#f6a610' NOT NULL,
	"alert_color" text DEFAULT '#e01814' NOT NULL,
	"logo_url" text,
	"system_prompt_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "brands_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"brand_id" integer DEFAULT 1 NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "changelog_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"brand_id" integer DEFAULT 1 NOT NULL,
	"sort_key" text NOT NULL,
	"date" text NOT NULL,
	"category" text NOT NULL,
	"summary" text NOT NULL,
	"capabilities" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_ideas" (
	"id" serial PRIMARY KEY NOT NULL,
	"brand_id" integer DEFAULT 1 NOT NULL,
	"platform" text NOT NULL,
	"theme" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"hashtags" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_decisions" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer,
	"decision" text NOT NULL,
	"rejection_reason" text,
	"decided_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"brand_id" integer DEFAULT 1 NOT NULL,
	"market" text NOT NULL,
	"platform" text NOT NULL,
	"pillar" text NOT NULL,
	"title" text,
	"tone_register" text,
	"format" text NOT NULL,
	"caption" text DEFAULT '' NOT NULL,
	"visual_direction" text DEFAULT '' NOT NULL,
	"graphic_text" text,
	"resources" text,
	"visual_reference_url" text,
	"cta" text,
	"media_url" text,
	"media_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"link_url" text,
	"drive_url" text,
	"posted_url" text,
	"posted_url_ig" text,
	"cross_post" boolean,
	"ig_format" text,
	"month" text NOT NULL,
	"scheduled_date" text,
	"scheduled_time" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"creative_status" text DEFAULT 'To Do' NOT NULL,
	"recurring" boolean DEFAULT false NOT NULL,
	"notes" text,
	"assigned_to" text,
	"entry_type" text DEFAULT 'post' NOT NULL,
	"group_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"brand_id" integer DEFAULT 1 NOT NULL,
	"title" text NOT NULL,
	"date" text NOT NULL,
	"end_date" text,
	"market" text DEFAULT 'both' NOT NULL,
	"type" text DEFAULT 'seasonal' NOT NULL,
	"notes" text,
	"recurring" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "past_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"brand_id" integer DEFAULT 1 NOT NULL,
	"date" text NOT NULL,
	"time" text,
	"platform" text NOT NULL,
	"caption" text NOT NULL,
	"direction" text,
	"market" text,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "copywriter_feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"brand_id" integer DEFAULT 1 NOT NULL,
	"type" text NOT NULL,
	"caption" text,
	"platform" text,
	"market" text,
	"post_type" text,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "copywriter_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"brand_id" integer DEFAULT 1 NOT NULL,
	"content" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "voice_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"brand_id" integer NOT NULL,
	"post_type" text NOT NULL,
	"tone" text DEFAULT '' NOT NULL,
	"length" text DEFAULT '' NOT NULL,
	"opening" text DEFAULT '' NOT NULL,
	"cta" text DEFAULT '' NOT NULL,
	"avoid" text DEFAULT '' NOT NULL,
	"anchor_example" text DEFAULT '' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pillars" (
	"id" serial PRIMARY KEY NOT NULL,
	"brand_id" integer DEFAULT 1 NOT NULL,
	"name" text NOT NULL,
	"market" text DEFAULT 'both' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"brand_id" integer DEFAULT 1 NOT NULL,
	"name" text NOT NULL,
	"role" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brand_voice_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"brand_id" integer DEFAULT 1 NOT NULL,
	"source_post_id" integer,
	"note" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"brand_id" integer DEFAULT 1 NOT NULL,
	"kind" text NOT NULL,
	"url" text,
	"title" text,
	"notes" text,
	"thumbnail_url" text,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" serial PRIMARY KEY NOT NULL,
	"brand_id" integer DEFAULT 1 NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"kind" text NOT NULL,
	"object_path" text NOT NULL,
	"mime_type" text,
	"size_bytes" integer,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"folder" text,
	"source_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brand_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"brand_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"media_url" text NOT NULL,
	"media_kind" text NOT NULL,
	"template_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brand_prints" (
	"id" serial PRIMARY KEY NOT NULL,
	"brand_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"media_url" text NOT NULL,
	"media_kind" text NOT NULL,
	"drive_url" text,
	"print_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scraper_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"brand_id" integer DEFAULT 1 NOT NULL,
	"root_url" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"error" text,
	"page_count" integer DEFAULT 0 NOT NULL,
	"max_pages" integer DEFAULT 200 NOT NULL,
	"max_depth" integer DEFAULT 5 NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scraper_pages" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"url" text NOT NULL,
	"title" text,
	"content" text,
	"status_code" integer,
	"depth" integer DEFAULT 0 NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shared_collections" (
	"token" varchar(32) PRIMARY KEY NOT NULL,
	"brand_id" integer NOT NULL,
	"title" text,
	"post_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "share_post_feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"share_token" varchar(64) NOT NULL,
	"brand_id" integer NOT NULL,
	"post_id" integer NOT NULL,
	"decision" text,
	"comment" text,
	"client_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nico_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"brand_id" integer DEFAULT 1 NOT NULL,
	"kind" text NOT NULL,
	"name" text,
	"date" date,
	"url" text NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nico_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"kind" text DEFAULT 'other' NOT NULL,
	"description" text,
	"due_date" date,
	"time_note" text,
	"format" text,
	"script" text,
	"visual_direction" text,
	"visual_refs" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"notes" text,
	"drive_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_snapshot_version" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"version" text NOT NULL,
	"applied_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "single_row" CHECK ("data_snapshot_version"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE "design_brief_shares" (
	"token" varchar(32) PRIMARY KEY NOT NULL,
	"brand_slug" text NOT NULL,
	"brand_name" text,
	"brief_text" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	"visual_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reposts" (
	"id" serial PRIMARY KEY NOT NULL,
	"brand_id" integer NOT NULL,
	"platform" text DEFAULT 'Instagram' NOT NULL,
	"author_handle" text,
	"author_name" text,
	"source_url" text,
	"caption" text,
	"notes" text,
	"market" text,
	"permission_granted" boolean,
	"reposted" boolean DEFAULT false NOT NULL,
	"reposted_at" timestamp with time zone,
	"reposted_on" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deleted_row_tombstones" (
	"table_name" varchar(64) NOT NULL,
	"row_id" bigint NOT NULL,
	"deleted_at" timestamp with time zone DEFAULT NOW() NOT NULL,
	CONSTRAINT "deleted_row_tombstones_table_name_row_id_pk" PRIMARY KEY("table_name","row_id")
);
--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_decisions" ADD CONSTRAINT "approval_decisions_post_id_content_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."content_posts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scraper_pages" ADD CONSTRAINT "scraper_pages_job_id_scraper_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."scraper_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "changelog_brand_sort_key_idx" ON "changelog_entries" USING btree ("brand_id","sort_key");--> statement-breakpoint
CREATE INDEX "content_posts_group_idx" ON "content_posts" USING btree ("group_id");--> statement-breakpoint
CREATE UNIQUE INDEX "voice_profiles_brand_posttype_uq" ON "voice_profiles" USING btree ("brand_id","post_type");--> statement-breakpoint
CREATE UNIQUE INDEX "team_members_brand_name_idx" ON "team_members" USING btree ("brand_id","name");--> statement-breakpoint
CREATE INDEX "brand_templates_brand_idx" ON "brand_templates" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "brand_prints_brand_idx" ON "brand_prints" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "scraper_jobs_brand_idx" ON "scraper_jobs" USING btree ("brand_id","created_at");--> statement-breakpoint
CREATE INDEX "scraper_pages_job_idx" ON "scraper_pages" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "share_post_feedback_post_idx" ON "share_post_feedback" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "share_post_feedback_brand_idx" ON "share_post_feedback" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "share_post_feedback_token_idx" ON "share_post_feedback" USING btree ("share_token");