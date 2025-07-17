import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { startOfWeek, subWeeks, formatISO } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the current user from Clerk to find their email
    const { currentUser } = await import("@clerk/nextjs/server");
    const user = await currentUser();

    if (!user || !user.emailAddresses[0]?.emailAddress) {
      return NextResponse.json(
        { error: "User email not found" },
        { status: 400 }
      );
    }

    // Find the user in our database by email
    const dbUser = await prisma.user.findUnique({
      where: { email: user.emailAddresses[0].emailAddress },
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: "User not found in database" },
        { status: 404 }
      );
    }

    // Get the active scoring system and its scored habits
    const activeScoringSystem = await prisma.scoringSystem.findFirst({
      where: { userId: dbUser.id, isActive: true },
      include: {
        habits: {
          include: { habit: true },
          orderBy: { weight: "desc" },
        },
      },
    });

    if (!activeScoringSystem) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    const scoredHabits = activeScoringSystem.habits;
    if (!scoredHabits.length) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    // Calculate the last 12 week start dates (Monday)
    const now = new Date();
    const weekStarts: string[] = [];
    for (let i = 11; i >= 0; i--) {
      const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
      weekStarts.push(formatISO(weekStart, { representation: "date" }));
    }

    // Fetch all daily logs for the last 12 weeks
    const oldestWeek = weekStarts[0];
    const logs = await prisma.dailyLog.findMany({
      where: {
        userId: dbUser.id,
        date: { gte: oldestWeek },
        scoringSystemId: activeScoringSystem.id,
      },
      include: {
        habitLogs: true,
      },
      orderBy: { date: "asc" },
    });

    // Group logs by weekStart
    const logsByWeek: Record<string, typeof logs> = {};
    for (const week of weekStarts) {
      logsByWeek[week] = [];
    }
    for (const log of logs) {
      // Find the week this log belongs to
      const week = startOfWeek(new Date(log.date), { weekStartsOn: 1 });
      const weekKey = formatISO(week, { representation: "date" });
      if (logsByWeek[weekKey]) {
        logsByWeek[weekKey].push(log);
      }
    }

    // Calculate weekly scores
    const data = weekStarts.map((week) => {
      const weeklyLogs = logsByWeek[week] || [];
      // For each habit, count completions and calculate score
      const getWeeklyCompletionCount = (habitId: string) => {
        return weeklyLogs.reduce((count, dayLog) => {
          const habitLog = dayLog.habitLogs?.find(
            (hl) => hl.habitId === habitId
          );
          return count + (habitLog?.completed ? 1 : 0);
        }, 0);
      };
      const calculateWeeklyHabitScore = (
        scoredHabit: (typeof scoredHabits)[0]
      ) => {
        const weeklyCompletions = getWeeklyCompletionCount(scoredHabit.habitId);
        const target = scoredHabit.targetFrequency || 1;
        const completionRatio = Math.min(weeklyCompletions / target, 1);
        return Math.round(completionRatio * scoredHabit.weight);
      };
      const totalScore = scoredHabits.reduce(
        (sum, habit) => sum + calculateWeeklyHabitScore(habit),
        0
      );
      return { week, totalScore };
    });

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("[WEEKLY_SCORES_GET_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
