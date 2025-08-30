// lib/weeklyLogUtils.ts
import { prisma } from "@/lib/prisma";
import { getStartOfWeek } from "@/lib/date"; // returns 'yyyy-MM-dd'
import { computeWeeklyScores } from "@/lib/scoringUtils";

export async function ensureWeeklyLog(
  userId: string,
  dateStr: string,
  scoringSystemId: string
) {
  const startDate = getStartOfWeek(dateStr); // 'yyyy-MM-dd' Monday start (match UI/API)

  const weeklyLog = await prisma.weeklyLog.upsert({
    where: {
      userId_startDate: { userId, startDate },
    },
    update: {},
    create: { userId, startDate, scoringSystemId },
  });

  return weeklyLog;
}

/**
 * Recalculate and persist the weekly score using shared scoring utilities.
 * Assumes weeklyLog.scoringSystemId points to the system used for that week.
 */
export async function updateWeeklyScore(weeklyLogId: string) {
  const weeklyLog = await prisma.weeklyLog.findUnique({
    where: { id: weeklyLogId },
    include: {
      dailyLogs: { include: { habitLogs: true } },
      ScoringSystem: {
        include: {
          habits: { include: { habit: true } }, // include habit for name if desired
        },
      },
      // modifiers: true, // omit for MVP (not applied below)
    },
  });

  if (!weeklyLog) throw new Error("WeeklyLog not found");

  // Use the exact scored habits for THIS weekly log’s scoring system
  const activeHabits = weeklyLog.ScoringSystem.habits;

  // Run the same math as the client (one source of truth)
  const { totalScore } = computeWeeklyScores(
    activeHabits as any,
    weeklyLog.dailyLogs as any
  );

  // Persist raw total (already 0–100 under current rules)
  await prisma.weeklyLog.update({
    where: { id: weeklyLogId },
    data: { score: totalScore },
  });

  return totalScore;
}
