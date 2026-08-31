CREATE TABLE "ad_budgets" (
	"id" serial PRIMARY KEY NOT NULL,
	"brand_id" integer NOT NULL,
	"spend_month" text NOT NULL,
	"page" text NOT NULL,
	"budget_amount" real NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ad_budgets" ADD CONSTRAINT "ad_budgets_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ad_budgets_brand_month_page_uidx" ON "ad_budgets" USING btree ("brand_id","spend_month","page");