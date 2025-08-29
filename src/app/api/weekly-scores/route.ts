// /app/api/weekly-scores/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { startOfWeek, addWeeks, subWeeks } from "date-fns";
import { toDateString } from "@/lib/date";
import { updateWeeklyScore } from "@/lib/weeklyLogUtils"; // <-- add this
import { WeeklyScore } from "@/components/WeeklyScoreChart";

export async function GET(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();
    const email = user?.emailAddresses?.[0]?.emailAddress;
    if (!email) {
      return NextResponse.json(
        { error: "User email not found" },
        { status: 400 }
      );
    }

    const dbUser = await prisma.user.findUnique({ where: { email } });
    if (!dbUser) {
      return NextResponse.json(
        { error: "User not found in database" },
        { status: 404 }
      );
    }

    // Build week starts for current week back 11 weeks (12 points total), Monday start
    const weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 1;
    const now = new Date();
    const endWeek = startOfWeek(now, { weekStartsOn });
    const startWeek = startOfWeek(subWeeks(now, 11), { weekStartsOn });

    const weekStarts: string[] = [];
    for (let cur = startWeek; cur <= endWeek; cur = addWeeks(cur, 1)) {
      weekStarts.push(toDateString(cur)); // yyyy-MM-dd
    }

    // Fetch persisted weekly logs (id + score) for range
    const weeklyLogs = await prisma.weeklyLog.findMany({
      where: {
        userId: dbUser.id,
        startDate: {
          gte: weekStarts[0],
          lte: weekStarts[weekStarts.length - 1],
        },
      },
      select: {
        id: true,
        startDate: true,
        score: true,
        ScoringSystem: { select: { name: true } },
      },
    });

    type ByStartVal = {
      id: string;
      score: number | null;
      scoringSystemName?: string;
    };
    const byStart: Record<string, ByStartVal> = {};
    for (const wl of weeklyLogs)
      byStart[wl.startDate] = {
        id: wl.id,
        score: wl.score,
        scoringSystemName: wl.ScoringSystem?.name,
      };

    // Recompute only weeks that have a weeklyLog row but no score yet (fast self-heal)
    const toRecompute = weeklyLogs.filter((wl) => wl.score == null);

    if (toRecompute.length) {
      await Promise.all(
        toRecompute.map((wl) => updateWeeklyScore(wl.id).catch(() => null))
      );

      // 3) Re-read updated scores (and name, to be safe)
      const refreshed = await prisma.weeklyLog.findMany({
        where: { id: { in: toRecompute.map((w) => w.id) } },
        select: {
          id: true,
          startDate: true,
          score: true,
          ScoringSystem: { select: { name: true } },
        },
      });

      for (const r of refreshed) {
        byStart[r.startDate] = {
          id: r.id,
          score: r.score ?? 0,
          scoringSystemName:
            r.ScoringSystem?.name ?? byStart[r.startDate]?.scoringSystemName,
        };
      }
    }

    // Build response for every requested week (0 if no row exists)
    const data: WeeklyScore[] = weekStarts.map((week) => ({
      week,
      totalScore: Number(byStart[week]?.score ?? 0), // 0–100
      scoringSystemName: byStart[week]?.scoringSystemName ?? "", // <- string for tooltip
    }));

    // // print every scoring system name to console for debugging
    // data.forEach((d) => {
    //   console.log(
    //     `Week: ${d.week}, Score: ${d.totalScore}, Name: ${d.scoringSystemName}`
    //   );
    // });

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("[WEEKLY_SCORES_GET_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
