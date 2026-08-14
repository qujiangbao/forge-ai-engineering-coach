import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";
import { baseSkills, tasks } from "../../data";

const defaultSkills = baseSkills;

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
    const body = await request.json() as { taskId: string; diagnosis: string; evidence: string; hintsUsed: number };
    if (!body.taskId || !body.diagnosis || !body.evidence) return Response.json({ error: "missing evidence" }, { status: 400 });
    const task = tasks.find(candidate => candidate.id === body.taskId);
    if (!task) return Response.json({ error: "unknown task" }, { status: 400 });
    const hintsUsed = Math.max(0, Math.min(2, Number(body.hintsUsed) || 0));
    const score = Math.max(40, 100 - hintsUsed * 12);
    const now = new Date().toISOString();
    const current = await env.DB.prepare("SELECT * FROM profiles WHERE user_id = ?").bind(user.userId).first<{skills_json:string;xp:number}>();
    const previousSession = await env.DB.prepare("SELECT id FROM training_sessions WHERE user_id = ? AND task_id = ?").bind(user.userId, task.id).first<{id:number}>();
    const awarded = !previousSession;
    const skills = current ? JSON.parse(current.skills_json) as Record<string, number> : { ...defaultSkills };
    if (awarded) for (const [name, gain] of Object.entries(task.gains)) skills[name] = Math.min(100, (skills[name] ?? 40) + gain);
    const xp = (current?.xp ?? 680) + (awarded ? score : 0);
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO profiles (user_id, display_name, xp, streak, skills_json, updated_at) VALUES (?, ?, ?, 7, ?, ?) ON CONFLICT(user_id) DO UPDATE SET display_name=excluded.display_name, xp=excluded.xp, skills_json=excluded.skills_json, updated_at=excluded.updated_at`).bind(user.userId, user.displayName, xp, JSON.stringify(skills), now),
      env.DB.prepare(`INSERT INTO training_sessions (user_id, task_id, task_title, diagnosis, evidence, hints_used, score, skill_gains_json, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(user_id, task_id) DO UPDATE SET diagnosis=excluded.diagnosis, evidence=excluded.evidence, hints_used=excluded.hints_used, score=excluded.score, skill_gains_json=excluded.skill_gains_json, completed_at=excluded.completed_at`).bind(user.userId, task.id, task.title, body.diagnosis, body.evidence, hintsUsed, score, JSON.stringify(task.gains), now),
    ]);
    return Response.json({ ok: true, awarded, skills, xp });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "save failed" }, { status: 500 });
  }
}
