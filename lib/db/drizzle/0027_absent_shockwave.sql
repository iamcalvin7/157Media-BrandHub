ALTER TABLE "content_posts" ADD COLUMN "boosted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ad_boosts" ADD COLUMN "content_post_id" integer;--> statement-breakpoint
ALTER TABLE "ad_boosts" ADD COLUMN "spend_month" text;--> statement-breakpoint
ALTER TABLE "ad_boosts" ADD COLUMN "page" text;--> statement-breakpoint
ALTER TABLE "ad_boosts" ADD COLUMN "source" text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "ad_boosts" ADD CONSTRAINT "ad_boosts_content_post_id_content_posts_id_fk" FOREIGN KEY ("content_post_id") REFERENCES "public"."content_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ad_boosts_content_post_idx" ON "ad_boosts" USING btree ("content_post_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ad_boosts_content_post_month_uidx" ON "ad_boosts" USING btree ("content_post_id","spend_month");