ALTER TABLE "task_attempts" ADD COLUMN "ai_judgment_score" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "task_attempts" ADD COLUMN "engineering_ownership_score" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "task_attempts" ADD COLUMN "ai_claim_confidence" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "task_attempts" ADD COLUMN "ai_claim_accurate" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "task_attempts" ADD COLUMN "architecture_drift_detected" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "task_attempts" ADD COLUMN "review_json" text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "task_attempts" ADD COLUMN "specification_json" text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "task_attempts" ADD COLUMN "release_readiness_json" text DEFAULT '{}' NOT NULL;