import { and, desc, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getDb } from "../../../db";
import { profiles, trainingSessions } from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";
import { baseSkills, tasks } from "../../data";

export const runtime = "nodejs";

const ANONYMOUS_COOKIE = "forge-user-id";
const defaultSkills = baseSkills;

type RequestIdentity = {
  userId: string;
  displayName: string;
  setCookie: boolean;
};

async function identity(): Promise<RequestIdentity> {
  const signedInUser = await getChatGPTUser();
  if (signedInUser) {
    return {
      userId: signedInUser.userId,
      displayName: signedInUser.displayName,
      setCookie: false,
    };
  }

  const cookieStore = await cookies();
  const existingId = cookieStore.get(ANONYMOUS_COOKIE)?.value;
  return {
    userId: existingId ?? crypto.randomUUID(),
    displayName: "AI 工程师",
    setCookie: !existingId,
  };
}

function response(body: unknown, user: RequestIdentity, status = 200) {
  const result = NextResponse.json(body, { status });
  if (user.setCookie) {
    result.cookies.set(ANONYMOUS_COOKIE, user.userId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  }
  return result;
}

function profilePayload(profile: typeof profiles.$inferSelect) {
  return {
    user_id: profile.userId,
    display_name: profile.displayName,
    xp: profile.xp,
    streak: profile.streak,
    skills_json: profile.skillsJson,
    updated_at: profile.updatedAt.toISOString(),
  };
}

function sessionPayload(session: typeof trainingSessions.$inferSelect) {
  return {
    id: session.id,
    user_id: session.userId,
    task_id: session.taskId,
    task_title: session.taskTitle,
    diagnosis: session.diagnosis,
    evidence: session.evidence,
    hints_used: session.hintsUsed,
    score: session.score,
    skill_gains_json: session.skillGainsJson,
    completed_at: session.completedAt.toISOString(),
  };
}

export async function GET() {
  const user = await identity();
  try {
    const db = getDb();
    let [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, user.userId))
      .limit(1);

    if (!profile) {
      const now = new Date();
      [profile] = await db
        .insert(profiles)
        .values({
          userId: user.userId,
          displayName: user.displayName,
          xp: 680,
          streak: 7,
          skillsJson: JSON.stringify(defaultSkills),
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: profiles.userId,
          set: { displayName: user.displayName, updatedAt: now },
        })
        .returning();
    }

    const sessions = await db
      .select()
      .from(trainingSessions)
      .where(eq(trainingSessions.userId, user.userId))
      .orderBy(desc(trainingSessions.completedAt))
      .limit(30);

    return response(
      {
        profile: profilePayload(profile),
        sessions: sessions.map(sessionPayload),
        persistence: "postgres",
      },
      user,
    );
  } catch {
    return response(
      {
        profile: {
          display_name: user.displayName,
          xp: 680,
          streak: 7,
          skills_json: JSON.stringify(defaultSkills),
        },
        sessions: [],
        persistence: "unavailable",
      },
      user,
    );
  }
}

export async function POST(request: Request) {
  const user = await identity();
  try {
    const body = (await request.json()) as {
      taskId?: string;
      diagnosis?: string;
      evidence?: string;
      hintsUsed?: number;
    };
    const diagnosis = body.diagnosis?.trim() ?? "";
    const evidence = body.evidence?.trim() ?? "";
    const task = tasks.find((candidate) => candidate.id === body.taskId);

    if (!task || diagnosis.length < 24 || evidence.length < 28) {
      return response({ error: "invalid training evidence" }, user, 400);
    }

    const db = getDb();
    const hintsUsed = Math.max(0, Math.min(2, Number(body.hintsUsed) || 0));
    const score = Math.max(40, 100 - hintsUsed * 12);
    const [[current], [previousSession]] = await Promise.all([
      db.select().from(profiles).where(eq(profiles.userId, user.userId)).limit(1),
      db
        .select({ id: trainingSessions.id })
        .from(trainingSessions)
        .where(
          and(
            eq(trainingSessions.userId, user.userId),
            eq(trainingSessions.taskId, task.id),
          ),
        )
        .limit(1),
    ]);

    const awarded = !previousSession;
    const skills = current
      ? (JSON.parse(current.skillsJson) as Record<string, number>)
      : { ...defaultSkills };
    if (awarded) {
      for (const [name, gain] of Object.entries(task.gains)) {
        skills[name] = Math.min(100, (skills[name] ?? 40) + gain);
      }
    }

    const xp = (current?.xp ?? 680) + (awarded ? score : 0);
    const now = new Date();
    const profileUpsert = db
        .insert(profiles)
        .values({
          userId: user.userId,
          displayName: user.displayName,
          xp,
          streak: current?.streak ?? 7,
          skillsJson: JSON.stringify(skills),
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: profiles.userId,
          set: {
            displayName: user.displayName,
            xp,
            skillsJson: JSON.stringify(skills),
            updatedAt: now,
          },
        });

    const sessionUpsert = db
        .insert(trainingSessions)
        .values({
          userId: user.userId,
          taskId: task.id,
          taskTitle: task.title,
          diagnosis,
          evidence,
          hintsUsed,
          score,
          skillGainsJson: JSON.stringify(task.gains),
          completedAt: now,
        })
        .onConflictDoUpdate({
          target: [trainingSessions.userId, trainingSessions.taskId],
          set: {
            diagnosis,
            evidence,
            hintsUsed,
            score,
            skillGainsJson: JSON.stringify(task.gains),
            completedAt: now,
          },
        });

    await db.batch([profileUpsert, sessionUpsert]);

    return response({ ok: true, awarded, skills, xp }, user);
  } catch (error) {
    return response(
      {
        error: error instanceof Error ? error.message : "save failed",
      },
      user,
      503,
    );
  }
}
