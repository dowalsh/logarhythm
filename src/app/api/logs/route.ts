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

    const { date, notes, logs, scoringSystemId } = await req.json();

    if (!date || !Array.isArray(logs)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    if (!scoringSystemId) {
      return NextResponse.json(
        { error: "No scoring system found" },
        { status: 400 }
      );
    }

    const dateString = typeof date === "string" ? date.slice(0, 10) : "";

    await prisma.$transaction(async (tx) => {
      //HELP - need to move this ensureWeeklyLog somewhere it makes more sense. Likely before this API gets called.
      const weeklyLog = await ensureWeeklyLog(
        dbUser.id,
        dateString,
        scoringSystemId
      );

      const dailyLog = await tx.dailyLog.upsert({
        where: {
          userId_date: { userId: dbUser.id, date: dateString },
        },
        update: {
          notes: notes,
          weeklyLogId: weeklyLog.id,
        },
        create: {
          userId: dbUser.id,
          weeklyLogId: weeklyLog.id,
          date: dateString,
          notes: notes,
        },
      });

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
