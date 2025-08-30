import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { startOfWeek, subWeeks, formatISO } from "date-fns";
import { getStartOfWeek } from "@/lib/date";
import { ensureWeeklyLog, updateWeeklyScore } from "@/lib/weeklyLogUtils";

export async function GET(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { currentUser } = await import("@clerk/nextjs/server");
    const user = await currentUser();

    if (!user || !user.emailAddresses[0]?.emailAddress) {
      return NextResponse.json(
        { error: "User email not found" },
        { status: 400 }
      );
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: user.emailAddresses[0].emailAddress },
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: "User not found in database" },
        { status: 404 }
      );
    }

    const now = new Date();
    const endDate = now;
    const startDate = subWeeks(now, 11);

    const weekStarts: string[] = [];
    let current = startOfWeek(startDate, { weekStartsOn: 1 });
    const last = startOfWeek(endDate, { weekStartsOn: 1 });
    while (current <= last) {
      weekStarts.push(formatISO(current, { representation: "date" }));
      current = subWeeks(current, -1);
    }

    const weeklyLogs = await prisma.weeklyLog.findMany({
      where: {
        userId: dbUser.id,
        startDate: {
          gte: weekStarts[0],
          lte: weekStarts[weekStarts.length - 1],
        },
      },
      select: {
        startDate: true,
        score: true,
      },
    });

    const scoreMap = Object.fromEntries(
      weeklyLogs.map((log) => [log.startDate, log.score ?? 0])
    );

    const data = weekStarts.map((week) => ({
      week,
      totalScore: scoreMap[week] ?? 0,
    }));

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("[WEEKLY_SCORES_GET_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { currentUser } = await import("@clerk/nextjs/server");
    const user = await currentUser();

    if (!user || !user.emailAddresses[0]?.emailAddress) {
      return NextResponse.json(
        { error: "User email not found" },
        { status: 400 }
      );
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: user.emailAddresses[0].emailAddress },
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: "User not found in database" },
        { status: 404 }
      );
    }

    const { date, notes, logs, weeklyLogId } = await req.json();

    if (!date || !Array.isArray(logs)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    if (!weeklyLogId) {
      // Client must ensure/select a week first
      return NextResponse.json(
        { error: "weeklyLogId required (ensure week before posting)" },
        { status: 409 }
      );
    }

    const dateString = typeof date === "string" ? date.slice(0, 10) : "";

    // Verify weeklyLog belongs to this user
    const weeklyLog = await prisma.weeklyLog.findFirst({
      where: { id: weeklyLogId, userId: dbUser.id },
      select: { id: true, startDate: true },
    });
    if (!weeklyLog) {
      return NextResponse.json(
        { error: "WeeklyLog not found" },
        { status: 404 }
      );
    }

    // Optional sanity check: ensure the daily `date` falls in the same week as `weeklyLog.startDate`
    const weekOfDate = getStartOfWeek(dateString);
    if (weekOfDate !== weeklyLog.startDate) {
      return NextResponse.json(
        { error: "Date not in this WeeklyLog’s week" },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      // Upsert the daily log for this user+date and link to the weekly log
      const dailyLog = await tx.dailyLog.upsert({
        where: { userId_date: { userId: dbUser.id, date: dateString } },
        update: { notes, weeklyLogId: weeklyLog.id },
        create: {
          userId: dbUser.id,
          weeklyLogId: weeklyLog.id,
          date: dateString,
          notes,
        },
      });

      // Upsert each habit log
      await Promise.all(
        logs.map((log: any) =>
          tx.habitLog.upsert({
            where: {
              dailyLogId_habitId: {
                dailyLogId: dailyLog.id,
                habitId: log.habitId,
              },
            },
            update: {
              value: log.value ?? null,
              completed: log.completed ?? null,
            },
            create: {
              dailyLogId: dailyLog.id,
              habitId: log.habitId,
              value: log.value ?? null,
              completed: log.completed ?? null,
            },
          })
        )
      );

      // Recompute weekly score after changes
      await updateWeeklyScore(weeklyLog.id);
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DAILYLOG_POST_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
