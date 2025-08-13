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
  // Fetch the weekly log with all related data:
  // - dailyLogs (each with their habitLogs)
  // - ScoringSystem (with its habits and their scoring rules)
  // - modifiers (any manual score adjustments)
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

  // Map to count how many times each habit was completed in the week
  const habitLogMap: Record<string, number> = {};

  // Iterate over each day's logs
  for (const log of weeklyLog.dailyLogs) {
    // For each habit log in the day, increment count if completed
    for (const hl of log.habitLogs) {
      if (hl.completed) {
        habitLogMap[hl.habitId] = (habitLogMap[hl.habitId] || 0) + 1;
      }
    }
  }

  let score = 0;

  // get the sum of the weights of all habits in this scoring system
  const totalWeight = weeklyLog.ScoringSystem.habits.reduce(
    (sum, habit) => sum + habit.weight,
    0
  );

  // For each habit in the scoring system:
  // - Get how many times it was completed (from habitLogMap)
  // - Cap the count at the target frequency (default 7 if not set)
  // evaluate the proportion completed of the target
  // Multiply by the habit's weight as a proportion of totalWeight and add to score
  for (const scored of weeklyLog.ScoringSystem.habits) {
    const count = habitLogMap[scored.habitId] || 0;
    console.log(`Habit (ID: ${scored.habitId}) - Completed: ${count} times`);
    const targetFrequency = scored.targetFrequency ?? 1;
    console.log(`Target frequency for habit: ${targetFrequency}`);
    const proportion_completed = Math.min(1, count / targetFrequency);
    console.log(`Proportion completed for habit: ${proportion_completed}`);
    const weightProportion = totalWeight > 0 ? scored.weight / totalWeight : 0;
    console.log(
      `Weight: ${scored.weight}, Weight proportion: ${weightProportion}`
    );
    const habitScore = proportion_completed * weightProportion * 100;
    console.log(`Score contribution from habit: ${habitScore}`);
    score += habitScore;
  }
  console.log(`Total weekly score before modifiers: ${score}`);

  // Update the weekly log with the new score
  await prisma.weeklyLog.update({
    where: { id: weeklyLogId },
    data: { score },
  });

  // Log the update for debugging
  console.log(
    `✅ WeeklyLog ${weeklyLog.startDate} updated with score: ${score}`
  );
}
