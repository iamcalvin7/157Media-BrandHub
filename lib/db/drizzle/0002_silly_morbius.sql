CREATE INDEX "conversations_brand_idx" ON "conversations" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "content_ideas_brand_idx" ON "content_ideas" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "approval_decisions_post_idx" ON "approval_decisions" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "content_posts_brand_idx" ON "content_posts" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "events_brand_idx" ON "events" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "past_posts_brand_idx" ON "past_posts" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "copywriter_feedback_brand_idx" ON "copywriter_feedback" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "copywriter_rules_brand_idx" ON "copywriter_rules" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "brand_voice_notes_brand_idx" ON "brand_voice_notes" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "brand_voice_notes_source_post_idx" ON "brand_voice_notes" USING btree ("source_post_id");--> statement-breakpoint
CREATE INDEX "saved_items_brand_idx" ON "saved_items" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "media_assets_brand_idx" ON "media_assets" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "shared_collections_brand_idx" ON "shared_collections" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "nico_links_brand_idx" ON "nico_links" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "reposts_brand_idx" ON "reposts" USING btree ("brand_id");