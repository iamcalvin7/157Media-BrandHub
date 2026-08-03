CREATE TABLE "video_derivatives" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_path" text NOT NULL,
	"canonical_path" text,
	"status" text DEFAULT 'processing' NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "video_derivatives_source_path_unique" UNIQUE("source_path")
);
--> statement-breakpoint
CREATE INDEX "video_derivatives_status_idx" ON "video_derivatives" USING btree ("status");