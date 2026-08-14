CREATE TABLE "skill_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"attempt_id" integer NOT NULL,
	"skill" text NOT NULL,
	"delta" integer NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"task_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"task_title" text NOT NULL,
	"diagnosis_json" text NOT NULL,
	"evidence_json" text NOT NULL,
	"reflection_json" text NOT NULL,
	"test_results_json" text NOT NULL,
	"tool_usage_json" text DEFAULT '[]' NOT NULL,
	"hints_used" integer DEFAULT 0 NOT NULL,
	"first_hint_seconds" integer DEFAULT 0 NOT NULL,
	"autonomous_diagnosis" boolean DEFAULT true NOT NULL,
	"independent_completion" boolean DEFAULT true NOT NULL,
	"ai_dependency_score" integer DEFAULT 0 NOT NULL,
	"score" integer NOT NULL,
	"skill_gains_json" text NOT NULL,
	"duration_seconds" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_catalog" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"task_json" text NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
