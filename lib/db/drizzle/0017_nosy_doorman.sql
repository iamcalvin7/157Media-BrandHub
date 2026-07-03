CREATE TABLE "facebook_page_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"brand_id" integer NOT NULL,
	"page_id" varchar(64) NOT NULL,
	"page_name" varchar(255) NOT NULL,
	"page_access_token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "facebook_page_tokens_brand_id_page_id_unique" UNIQUE("brand_id","page_id")
);
--> statement-breakpoint
ALTER TABLE "facebook_page_tokens" ADD CONSTRAINT "facebook_page_tokens_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;