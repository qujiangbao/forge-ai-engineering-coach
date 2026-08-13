CREATE TABLE `profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`xp` integer DEFAULT 680 NOT NULL,
	`streak` integer DEFAULT 7 NOT NULL,
	`skills_json` text DEFAULT '{}' NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `training_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`task_id` text NOT NULL,
	`task_title` text NOT NULL,
	`diagnosis` text NOT NULL,
	`evidence` text NOT NULL,
	`hints_used` integer DEFAULT 0 NOT NULL,
	`score` integer NOT NULL,
	`skill_gains_json` text NOT NULL,
	`completed_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_sessions_user_task` ON `training_sessions` (`user_id`,`task_id`);