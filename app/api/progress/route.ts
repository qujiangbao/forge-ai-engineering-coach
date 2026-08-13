import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";

const defaultSkills = {
  "Code Reading": 72, "Code Modification": 64, "Debug": 61,
  "System Design": 49, "Acceptance Testing": 54, "Business Analysis": 68,
  "AI Orchestration": 57, "Delivery": 52,
};

async function ensureTables() {
  const db = env.DB;
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS profiles (user_id TEXT PRIMARY KEY, display_name TEXT NOT NULL, xp INTEGER NOT NULL DEFAULT 680, streak INTEGER NOT NULL DEFAULT 7, skills_json TEXT NOT NULL DEFAULT '{}', updated_at TEXT NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS training_sessions (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, task_id TEXT NOT NULL, task_title TEXT NOT NULL, diagnosis TEXT NOT NULL, evidence TEXT NOT NULL, hints_used INTEGER NOT NULL DEFAULT 0, score INTEGER NOT NULL, skill_gains_json TEXT NOT NULL, completed_at TEXT NOT NULL)`),
    db.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_user_task ON training_sessions(user_id, task_id)`),
  ]);
}

async function identity() {
  const user = await getChatGPTUser();
  return user ?? { userId: "local-demo", displayName: "AI 工程师", email: "", fullName: null };
}

export async function GET() {
  try {
    await ensureTables();
    const user = await identity();
    const profile = await env.DB.prepare("SELECT * FROM profiles WHERE user_id = ?").bind(user.userId).first<Record<string, unknown>>();
    const sessions = await env.DB.prepare("SELECT * FROM training_sessions WHERE user_id = ? ORDER BY completed_at DESC LIMIT 30").bind(user.userId).all<Record<string, unknown>>();
    if (!profile) {
      const now = new Date().toISOString();
      await env.DB.prepare("INSERT INTO profiles (user_id, display_name, xp, streak, skills_json, updated_at) VALUES (?, ?, 680, 7, ?, ?)").bind(user.userId, user.displayName, JSON.stringify(defaultSkills), now).run();
      return Response.json({ profile: { display_name: user.displayName, xp: 680, streak: 7, skills_json: JSON.stringify(defaultSkills) }, sessions: [] });
    }
    return Response.json({ profile, sessions: sessions.results });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "progress unavailable" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureTables();
    const user = await identity();
    const body = await request.json() as { taskId: string; taskTitle: string; diagnosis: string; evidence: string; hintsUsed: number; score: number; skillGains: Record<string, number> };
    if (!body.taskId || !body.diagnosis || !body.evidence) return Response.json({ error: "missing evidence" }, { status: 400 });
    const now = new Date().toISOString();
    const current = await env.DB.prepare("SELECT * FROM profiles WHERE user_id = ?").bind(user.userId).first<{skills_json:string;xp:number}>();
    const skills = current ? JSON.parse(current.skills_json) as Record<string, number> : { ...defaultSkills };
    for (const [name, gain] of Object.entries(body.skillGains)) skills[name] = Math.min(100, (skills[name] ?? 40) + gain);
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO profiles (user_id, display_name, xp, streak, skills_json, updated_at) VALUES (?, ?, ?, 7, ?, ?) ON CONFLICT(user_id) DO UPDATE SET display_name=excluded.display_name, xp=excluded.xp, skills_json=excluded.skills_json, updated_at=excluded.updated_at`).bind(user.userId, user.displayName, (current?.xp ?? 680) + body.score, JSON.stringify(skills), now),
      env.DB.prepare(`INSERT INTO training_sessions (user_id, task_id, task_title, diagnosis, evidence, hints_used, score, skill_gains_json, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(user_id, task_id) DO UPDATE SET diagnosis=excluded.diagnosis, evidence=excluded.evidence, hints_used=excluded.hints_used, score=excluded.score, skill_gains_json=excluded.skill_gains_json, completed_at=excluded.completed_at`).bind(user.userId, body.taskId, body.taskTitle, body.diagnosis, body.evidence, body.hintsUsed, body.score, JSON.stringify(body.skillGains), now),
    ]);
    return Response.json({ ok: true, skills, xp: (current?.xp ?? 680) + body.score });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "save failed" }, { status: 500 });
  }
}
