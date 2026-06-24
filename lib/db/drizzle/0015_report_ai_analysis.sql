ALTER TABLE "performance_report_summaries"
  ADD COLUMN "ai_analysis" text;
--> statement-breakpoint
ALTER TABLE "performance_report_summaries"
  ADD COLUMN "ai_analysis_generated_at" timestamp with time zone;
