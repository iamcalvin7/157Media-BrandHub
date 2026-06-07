CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "user_brand_access" (
	"user_id" varchar NOT NULL,
	"brand_id" integer NOT NULL,
	"role" text NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_brand_access_user_id_brand_id_pk" PRIMARY KEY("user_id","brand_id"),
	CONSTRAINT "user_brand_access_role_check" CHECK ("user_brand_access"."role" IN ('admin', 'editor', 'viewer'))
);
--> statement-breakpoint
CREATE TABLE "auth_audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar,
	"brand_id" integer,
	"method" text NOT NULL,
	"route" text NOT NULL,
	"result" text NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_audit_log_result_check" CHECK ("auth_audit_log"."result" IN ('ALLOW', 'DENY'))
);
--> statement-breakpoint
ALTER TABLE "user_brand_access" ADD CONSTRAINT "user_brand_access_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_brand_access" ADD CONSTRAINT "user_brand_access_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");--> statement-breakpoint
CREATE INDEX "user_brand_access_user_idx" ON "user_brand_access" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auth_audit_log_created_at_idx" ON "auth_audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "auth_audit_log_user_created_at_idx" ON "auth_audit_log" USING btree ("user_id","created_at");