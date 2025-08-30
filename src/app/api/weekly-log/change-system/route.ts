// /app/api/weekly-log/change-system/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

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

    const { startDate, scoringSystemId, deleteDailyLogs } =
      (await req.json()) as {
        startDate?: string;
        scoringSystemId?: string;
        deleteDailyLogs?: boolean;
      };
    if (!startDate || !scoringSystemId) {
      return NextResponse.json(
        { error: "startDate and scoringSystemId required" },
        { status: 400 }
      );
    }

    const dbUser = await prisma.user.findUnique({ where: { email } });
    if (!dbUser)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Check target system belongs to this user
    const targetSystem = await prisma.scoringSystem.findFirst({
      where: { id: scoringSystemId, userId: dbUser.id },
      select: { id: true },
    });
    if (!targetSystem)
      return NextResponse.json(
        { error: "Scoring system not found" },
        { status: 404 }
      );

    // Find the weekly log
    const weeklyLog = await prisma.weeklyLog.findUnique({
      where: { userId_startDate: { userId: dbUser.id, startDate } },
      include: { dailyLogs: { select: { id: true } } },
    });
    if (!weeklyLog)
      return NextResponse.json(
        { error: "WeeklyLog not found" },
        { status: 404 }
      );

    const hasDailyLogs = weeklyLog.dailyLogs.length > 0;
    if (hasDailyLogs && !deleteDailyLogs) {
      return NextResponse.json(
        { error: "Daily logs exist for this week", code: "NEEDS_CONFIRMATION" },
        { status: 409 }
      );
    }

    // Transaction: optionally delete logs, then update system
    const updated = await prisma.$transaction(async (tx) => {
      if (hasDailyLogs && deleteDailyLogs) {
        const dailyLogIds = weeklyLog.dailyLogs.map((d) => d.id);
        // If your schema already cascades deletes, you can skip these two lines
        await tx.habitLog.deleteMany({
          where: { dailyLogId: { in: dailyLogIds } },
        });
        await tx.dailyLog.deleteMany({ where: { id: { in: dailyLogIds } } });
      }

      await tx.weeklyLog.update({
        where: { id: weeklyLog.id },
        data: { scoringSystemId },
      });

      return tx.weeklyLog.findUnique({
        where: { id: weeklyLog.id },
        include: {
          ScoringSystem: { include: { habits: { include: { habit: true } } } },
        },
      });
    });

    return NextResponse.json({ weeklyLog: updated }, { status: 200 });
  } catch (e) {
    console.error("[WEEKLY_LOG_CHANGE_SYSTEM_ERROR]", e);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
