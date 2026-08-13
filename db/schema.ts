import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const profiles = sqliteTable("profiles", {
  userId: text("user_id").primaryKey(),
  displayName: text("display_name").notNull(),
  xp: integer("xp").notNull().default(680),
  streak: integer("streak").notNull().default(7),
  skillsJson: text("skills_json").notNull().default("{}"),
  updatedAt: text("updated_at").notNull(),
});

export const trainingSessions = sqliteTable("training_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull(),
  taskId: text("task_id").notNull(),
  taskTitle: text("task_title").notNull(),
  diagnosis: text("diagnosis").notNull(),
  evidence: text("evidence").notNull(),
  hintsUsed: integer("hints_used").notNull().default(0),
  score: integer("score").notNull(),
  skillGainsJson: text("skill_gains_json").notNull(),
  completedAt: text("completed_at").notNull(),
}, (table) => [uniqueIndex("idx_sessions_user_task").on(table.userId, table.taskId)]);
