import { integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

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
