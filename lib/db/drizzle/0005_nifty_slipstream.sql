ALTER TABLE "approval_decisions" DROP CONSTRAINT "approval_decisions_post_id_content_posts_id_fk";
--> statement-breakpoint
ALTER TABLE "approval_decisions" ADD CONSTRAINT "approval_decisions_post_id_content_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."content_posts"("id") ON DELETE cascade ON UPDATE no action;