import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { startOfWeek, subWeeks, formatISO } from "date-fns";

// this needs a major refactor.

// API request
export async function GET(req: NextRequest) {
  // try 
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
    // WE SHOULDNET NEED TO DO THIS; REMOVE
    // const activeScoringSystem = await prisma.scoringSystem.findFirst({
    //   where: { userId: dbUser.id, isActive: true },
    //   include: {
    //     habits: {
    //       include: { habit: true },
    //       orderBy: { weight: "desc" },
    //     },
    //   },
    // });
    // console.log("[WEEKLY_SCORES] Active scoring system:", activeScoringSystem);

    // if (!activeScoringSystem) {
    //   console.log("[WEEKLY_SCORES] No active scoring system found");
    //   return NextResponse.json({ data: [] }, { status: 200 });
    // }

    // const scoredHabits = activeScoringSystem.habits;
    // console.log("[WEEKLY_SCORES] Scored habits count:", scoredHabits.length);

    // if (!scoredHabits.length) {
    //   console.log("[WEEKLY_SCORES] No scored habits found");
    //   return NextResponse.json({ data: [] }, { status: 200 });
    // }

    // Allow for configurable start and end dates (default to now and 12 weeks ago)
    const now = new Date();
    // These could later be set from query params or request body
    const endDate = now;
    const startDate = subWeeks(now, 11);

    const weekStarts: string[] = [];
    let current = startOfWeek(startDate, { weekStartsOn: 1 });
    const last = startOfWeek(endDate, { weekStartsOn: 1 });
    while (current <= last) {
      weekStarts.push(formatISO(current, { representation: "date" }));
      current = subWeeks(current, -1); // move forward one week
    }
    const oldestWeek = weekStarts[0];
    const latestWeek = weekStarts[weekStarts.length - 1];

    const logs = await prisma.dailyLog.findMany({
      where: {
      userId: dbUser.id,
      date: {
        gte: oldestWeek,
        lte: latestWeek,
      },
      },
      include: {
      habitLogs: true,
      },
      orderBy: { date: "asc" },
    });

    const logsByWeek: Record<string, typeof logs> = {};
    for (const week of weekStarts) {
      logsByWeek[week] = [];
    }
    for (const log of logs) {
      const week = startOfWeek(new Date(log.date), { weekStartsOn: 1 });
      const weekKey = formatISO(week, { representation: "date" });
      if (logsByWeek[weekKey]) {
        logsByWeek[weekKey].push(log);
      }
    }
    
    // run through each week;
    const data = weekStarts.map((week) => {
      // grab the logs for this week
      const weeklyLogs = logsByWeek[week] || [];

      // get completion
      const getWeeklyCompletionCount = (habitId: string) => {
        const count = weeklyLogs.reduce((acc, dayLog) => {
          const habitLog = dayLog.habitLogs?.find(
            (hl) => hl.habitId === habitId
          );
          return acc + (habitLog?.completed ? 1 : 0);
        }, 0);
        const habit = scoredHabits.find((h) => h.habitId === habitId)?.habit;
        console.log(
          `[WEEKLY_SCORES] Week ${week} habit ${
            habit?.name ?? habitId
          } completions:`,
          count
        );
        return count;
      };

      // get sum of the weights of all habits in this week's scoring system
      const getTotalWeight = 

      const calculateWeeklyHabitScore = (
        scoredHabit: (typeof scoredHabits)[0]
      ) => {
        const habitName = scoredHabit.habit?.name ?? scoredHabit.habitId;
        console.log(
          `[WEEKLY_SCORES] Calculating score for week ${week}, habit ${habitName}`
        );
        const weeklyCompletions = getWeeklyCompletionCount(scoredHabit.habitId);
        console.log(
          `[WEEKLY_SCORES] Week ${week} habit ${habitName} weekly completions:`,
          weeklyCompletions
        );
        const target = scoredHabit.targetFrequency || 1;
        console.log(
          `[WEEKLY_SCORES] Week ${week} habit ${habitName} target frequency:`,
          target
        );
        const completionRatio = Math.min(weeklyCompletions / target, 1);
        console.log(
          `[WEEKLY_SCORES] Week ${week} habit ${habitName} completion ratio:`,
          completionRatio
        );
        const score = Math.round(completionRatio * scoredHabit.weight);
        console.log(
          `[WEEKLY_SCORES] Week ${week} habit ${habitName} weight:`,
          scoredHabit.weight
        );
        console.log(
          `[WEEKLY_SCORES] Week ${week} habit ${habitName} score:`,
          score
        );
        return score;
      };

      const totalScore = scoredHabits.reduce(
        (sum, habit) => sum + calculateWeeklyHabitScore(habit),
        0
      );
      console.log(`[WEEKLY_SCORES] Week ${week} total score:`, totalScore);

      return { week, totalScore };
    });

    console.log("[WEEKLY_SCORES] Final data:", data);
    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("[WEEKLY_SCORES_GET_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
