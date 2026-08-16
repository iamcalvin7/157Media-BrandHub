CREATE TABLE "ad_boosts" (
	"id" serial PRIMARY KEY NOT NULL,
	"brand_id" integer NOT NULL,
	"post_url" text NOT NULL,
	"boost_amount" real,
	"boost_duration" text,
	"target_audience" text,
	"done" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ad_boosts" ADD CONSTRAINT "ad_boosts_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ad_boosts_brand_idx" ON "ad_boosts" USING btree ("brand_id");