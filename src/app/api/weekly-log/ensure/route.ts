// /app/api/weekly-log/ensure/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { ensureWeeklyLog } from "@/lib/weeklyLogUtils";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await currentUser();
    const email = user?.emailAddresses?.[0]?.emailAddress;
    if (!email)
      return NextResponse.json(
        { error: "User email not found" },
        { status: 400 }
      );

    const { startDate } = await req.json(); // 'yyyy-MM-dd' (Monday start)
    if (!startDate)
      return NextResponse.json(
        { error: "startDate required" },
        { status: 400 }
      );

    const dbUser = await prisma.user.findUnique({ where: { email } });
    if (!dbUser)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    // 1) If a weekly log already exists for this week, return it (with scoring system + habits)
    const existing = await prisma.weeklyLog.findUnique({
      where: { userId_startDate: { userId: dbUser.id, startDate } },
      include: {
        ScoringSystem: {
          include: {
            habits: { include: { habit: true } }, // computeWeeklyScores expects habit details
          },
        },
      },
    });

    if (existing) {
      return NextResponse.json({ weeklyLog: existing }, { status: 200 });
    }

    // 2) Pick the "most recent" scoring system (prefer active, then newest)
    const latest = await prisma.scoringSystem.findFirst({
      where: { userId: dbUser.id },
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    });

    if (!latest) {
      return NextResponse.json(
        { weeklyLog: null, error: "No scoring systems for user" },
        { status: 404 }
      );
    }

    // 3) Create/ensure the weekly log using your util
    await ensureWeeklyLog(dbUser.id, startDate, latest.id);

    // 4) Reload with relations and return
    const created = await prisma.weeklyLog.findUnique({
      where: { userId_startDate: { userId: dbUser.id, startDate } },
      include: {
        ScoringSystem: {
          include: {
            habits: { include: { habit: true } },
          },
        },
      },
    });

    return NextResponse.json({ weeklyLog: created }, { status: 200 });
  } catch (e) {
    console.error("[WEEKLY_LOG_ENSURE_ERROR]", e);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
