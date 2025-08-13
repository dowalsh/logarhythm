// lib/weeklyLogUtils.ts
import { prisma } from "@/lib/prisma";
import { getStartOfWeek } from "@/lib/date";

export async function ensureWeeklyLog(
  userId: string,
  dateStr: string,
  scoringSystemId: string
) {
  const startDate = getStartOfWeek(dateStr); // 'YYYY-MM-DD'

  const weeklyLog = await prisma.weeklyLog.upsert({
    where: {
      userId_startDate: {
        userId,
        startDate,
      },
    },
    update: {},
    create: {
      userId,
      startDate,
      scoringSystemId,
    },
  });

  return weeklyLog;
}

export async function calculateWeeklyScore(weeklyLogId: string) {
  const weeklyLog = await prisma.weeklyLog.findUnique({
    where: { id: weeklyLogId },
    include: {
      dailyLogs: { include: { habitLogs: true } },
      ScoringSystem: {
        include: {
          habits: true,
        },
      },
      modifiers: true,
    },
  });

  if (!weeklyLog) throw new Error("WeeklyLog not found");

  const habitLogMap: Record<string, number> = {};

  for (const log of weeklyLog.dailyLogs) {
    for (const hl of log.habitLogs) {
      if (hl.completed) {
        habitLogMap[hl.habitId] = (habitLogMap[hl.habitId] || 0) + 1;
      }
    }
  }

  let score = 0;

  for (const scored of weeklyLog.ScoringSystem.habits) {
    const count = habitLogMap[scored.habitId] || 0;
    const capped = Math.min(count, scored.targetFrequency ?? 7);
    score += capped * scored.weight;
  }

  const modifierSum = weeklyLog.modifiers.reduce((sum, m) => sum + m.value, 0);
  score += modifierSum;

  await prisma.weeklyLog.update({
    where: { id: weeklyLogId },
    data: { score },
  });

  console.log(
    `✅ WeeklyLog ${weeklyLog.startDate} updated with score: ${score}`
  );
}
