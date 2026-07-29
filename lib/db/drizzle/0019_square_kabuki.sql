CREATE TABLE "evergreen_content" (
	"id" serial PRIMARY KEY NOT NULL,
	"brand_id" integer NOT NULL,
	"title" text NOT NULL,
	"link" text,
	"thumbnail_url" text,
	"media_type" text DEFAULT 'image' NOT NULL,
	"last_used_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "evergreen_content" ADD CONSTRAINT "evergreen_content_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "evergreen_content_brand_idx" ON "evergreen_content" USING btree ("brand_id");