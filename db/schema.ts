import { boolean, integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const profiles = pgTable("profiles", {
  userId: text("user_id").primaryKey(),
  displayName: text("display_name").notNull(),
  xp: integer("xp").notNull().default(680),
  streak: integer("streak").notNull().default(7),
  skillsJson: text("skills_json").notNull().default("{}"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const trainingSessions = pgTable("training_sessions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  taskId: text("task_id").notNull(),
  taskTitle: text("task_title").notNull(),
  diagnosis: text("diagnosis").notNull(),
  evidence: text("evidence").notNull(),
  hintsUsed: integer("hints_used").notNull().default(0),
  score: integer("score").notNull(),
  skillGainsJson: text("skill_gains_json").notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }).notNull(),
}, (table) => [uniqueIndex("idx_sessions_user_task").on(table.userId, table.taskId)]);

// New continuous-training records. The legacy table above is intentionally kept
// so existing user history remains readable after the Vercel migration.
export const taskAttempts = pgTable("task_attempts", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  taskId: text("task_id").notNull(),
  variantId: text("variant_id").notNull(),
  taskTitle: text("task_title").notNull(),
  diagnosisJson: text("diagnosis_json").notNull(),
  evidenceJson: text("evidence_json").notNull(),
  reflectionJson: text("reflection_json").notNull(),
  testResultsJson: text("test_results_json").notNull(),
  toolUsageJson: text("tool_usage_json").notNull().default("[]"),
  hintsUsed: integer("hints_used").notNull().default(0),
  firstHintSeconds: integer("first_hint_seconds").notNull().default(0),
  autonomousDiagnosis: boolean("autonomous_diagnosis").notNull().default(true),
  independentCompletion: boolean("independent_completion").notNull().default(true),
  aiDependencyScore: integer("ai_dependency_score").notNull().default(0),
  aiJudgmentScore: integer("ai_judgment_score").notNull().default(0),
  engineeringOwnershipScore: integer("engineering_ownership_score").notNull().default(0),
  aiClaimConfidence: integer("ai_claim_confidence").notNull().default(0),
  aiClaimAccurate: boolean("ai_claim_accurate").notNull().default(false),
  architectureDriftDetected: boolean("architecture_drift_detected").notNull().default(false),
  reviewJson: text("review_json").notNull().default("{}"),
  specificationJson: text("specification_json").notNull().default("{}"),
  releaseReadinessJson: text("release_readiness_json").notNull().default("{}"),
  score: integer("score").notNull(),
  skillGainsJson: text("skill_gains_json").notNull(),
  durationSeconds: integer("duration_seconds").notNull().default(0),
  completedAt: timestamp("completed_at", { withTimezone: true }).notNull(),
});

export const taskCatalog = pgTable("task_catalog", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  taskJson: text("task_json").notNull(),
  published: boolean("published").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const skillEvents = pgTable("skill_events", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  attemptId: integer("attempt_id").notNull(),
  skill: text("skill").notNull(),
  delta: integer("delta").notNull(),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});
