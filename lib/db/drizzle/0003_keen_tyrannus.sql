-- Production data repair: null-out any remaining orphan source_post_id references.
--
-- WHY this is here and not only in 0001_data_cleanup_d2a.sql:
--   0001 ran in production when the only known orphans were bvn.id=84,85
--   (source_post_id=48). Row bvn.id=45 (source_post_id=37) was created after
--   0001 was already applied, so it was never cleaned. It would cause the FK
--   constraint below to fail with a foreign-key violation.
--
-- This UPDATE must run before the ADD CONSTRAINT below.
-- Idempotent: affects 0 rows on dev (already clean) and in any future re-run.
-- Does NOT delete any brand_voice_notes rows — only sets source_post_id = NULL
-- for values that reference a content_posts row that no longer exists.
UPDATE brand_voice_notes
SET    source_post_id = NULL
WHERE  source_post_id IS NOT NULL
  AND  source_post_id NOT IN (SELECT id FROM content_posts);

--> statement-breakpoint

ALTER TABLE "conversations" ADD CONSTRAINT "conversations_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_posts" ADD CONSTRAINT "content_posts_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "past_posts" ADD CONSTRAINT "past_posts_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_voice_notes" ADD CONSTRAINT "brand_voice_notes_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_voice_notes" ADD CONSTRAINT "brand_voice_notes_source_post_id_content_posts_id_fk" FOREIGN KEY ("source_post_id") REFERENCES "public"."content_posts"("id") ON DELETE set null ON UPDATE no action;
