CREATE TABLE "marketing_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"brand_id" integer NOT NULL,
	"name" text NOT NULL,
	"request_type" text,
	"sizes" jsonb,
	"designer" text,
	"deadline" date,
	"market" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"notes" text,
	"drive_url" text,
	"inspiration_urls" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "content_posts" ADD COLUMN "canva_url" text;--> statement-breakpoint
ALTER TABLE "content_posts" ADD COLUMN "deliverable_urls" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "brand_prints" ADD COLUMN "print_type" text;--> statement-breakpoint
ALTER TABLE "brand_prints" ADD COLUMN "thumbnail_url" text;--> statement-breakpoint
ALTER TABLE "brand_prints" ADD COLUMN "files" jsonb;--> statement-breakpoint
ALTER TABLE "brand_prints" ADD COLUMN "links" jsonb;--> statement-breakpoint
ALTER TABLE "share_post_feedback" ADD COLUMN "copy_comment" text;--> statement-breakpoint
ALTER TABLE "share_post_feedback" ADD COLUMN "visual_comment" text;--> statement-breakpoint
ALTER TABLE "share_post_feedback" ADD COLUMN "dismissed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "facebook_page_tokens" ADD COLUMN "market_hint" text;--> statement-breakpoint
ALTER TABLE "facebook_page_tokens" ADD COLUMN "instagram_account_id" varchar(64);--> statement-breakpoint
ALTER TABLE "marketing_requests" ADD CONSTRAINT "marketing_requests_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "marketing_requests_brand_idx" ON "marketing_requests" USING btree ("brand_id");