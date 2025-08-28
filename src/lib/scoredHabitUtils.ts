// /lib/scoredHabitUtils.ts
import { HabitScoringType } from "@prisma/client";

/* --------------------------------- existing -------------------------------- */

// Calculate points per completion for a scored habit: max score divided by target frequency
export function getPointsPerCompletion(
  scoredHabit: { weight: number; targetFrequency?: number },
  allScoredHabits: { weight: number }[]
) {
  const maxScore = getScoreMax(scoredHabit, allScoredHabits);
  return maxScore / (scoredHabit.targetFrequency || 1);
}

// Calculate the maximum possible score for a scored habit as a percentage of total weight (MVP: linear positive capped only)
export function getScoreMax(
  scoredHabit: { weight: number },
  allScoredHabits: { weight: number }[]
) {
  const totalWeight = allScoredHabits.reduce((sum, h) => sum + h.weight, 0);
  if (totalWeight === 0) return 0;
  return (scoredHabit.weight / totalWeight) * 100;
}

/* ------------------------------ new additions ------------------------------ */

// Minimal structural types so we don't depend on app-layer interfaces
type MinimalScoredHabit = {
  habitId: string;
  habit?: { name: string };
  weight: number;
  targetFrequency?: number;
  // scoringType?: HabitScoringType; // reserved for future logic
};

type HabitLog = {
  habitId: string;
  completed?: boolean;
  value?: number;
};

type DailyLog = {
  habitLogs: HabitLog[];
};

export type HabitScore = {
  habitId: string;
  habitName: string;
  weeklyCompletions: number; // count of boolean completions across the week
  target: number; // targetFrequency (defaults to 1)
  scoreMax: number; // cap for this habit based on weights
  ratio: number; // [0,1] = weeklyCompletions / target clamped
  weeklyScore: number; // ratio * scoreMax
  pointsPerCompletion: number; // informational only
};

export type WeeklyScores = {
  perHabit: HabitScore[];
  totalScore: number; // sum of per-habit weeklyScore
  maxScoreAmongHabits: number; // for normalizing UI bars
};

/**
 * Count how many days in the week the habit was completed.
 * Current behavior: treat a completion if `completed === true` on that day.
 * (Numeric habits can be added later when scoringType logic expands.)
 */
export function getWeeklyCompletionCount(
  weeklyLogs: DailyLog[] = [],
  habitId: string
): number {
  return weeklyLogs.reduce((count, d) => {
    const hl = d.habitLogs?.find((h) => h.habitId === habitId);
    return count + (hl?.completed ? 1 : 0);
  }, 0);
}

/**
 * Compute per-habit and total scores for the given week's logs.
 * - ratio = min(weeklyCompletions / targetFrequency, 1)
 * - weeklyScore = ratio * scoreMax
 * - scoreMax and pointsPerCompletion reuse your existing helpers
 */
export function computeWeeklyScores(
  activeHabits: MinimalScoredHabit[] = [],
  weeklyLogs: DailyLog[] = []
): WeeklyScores {
  if (!activeHabits.length) {
    return { perHabit: [], totalScore: 0, maxScoreAmongHabits: 0 };
  }

  const perHabit: HabitScore[] = activeHabits.map((sh) => {
    const weeklyCompletions = getWeeklyCompletionCount(weeklyLogs, sh.habitId);
    // log progress to console

    const target = sh.targetFrequency || 1;
    const scoreMax = getScoreMax(sh, activeHabits);
    const ratio = Math.min(target > 0 ? weeklyCompletions / target : 0, 1);
    const weeklyScore = ratio * scoreMax;
    const pointsPerCompletion = getPointsPerCompletion(sh, activeHabits);
    // console.log(
    //   `[computeWeeklyScores] Habit: ${sh.habit?.name ?? sh.habitId}
    //   - habitId: ${sh.habitId}
    //   - habitName: ${sh.habit?.name ?? ""}
    //   - weeklyCompletions: ${weeklyCompletions}
    //   - target: ${target}
    //   - scoreMax: ${scoreMax}
    //   - ratio: ${ratio}
    //   - weeklyScore: ${weeklyScore}
    //   - pointsPerCompletion: ${pointsPerCompletion}
    //   - weight: ${sh.weight}
    //   - targetFrequency: ${sh.targetFrequency ?? 1}
    //   - allHabitsWeights: [${activeHabits.map((h) => h.weight).join(", ")}]
    //   `
    // );
    return {
      habitId: sh.habitId,
      habitName: sh.habit?.name ?? "",
      weeklyCompletions,
      target,
      scoreMax,
      ratio,
      weeklyScore,
      pointsPerCompletion,
    };
  });

  const totalScore = perHabit.reduce((s, h) => s + h.weeklyScore, 0);
  const maxScoreAmongHabits = Math.max(...perHabit.map((h) => h.scoreMax), 0);

  return { perHabit, totalScore, maxScoreAmongHabits };
}

// /** Clamp a numeric weekly total to the canonical 0–100 display range. */
// export function clampTotalTo100(totalRaw: number): number {
//   const MAX = 100;
//   if (!isFinite(totalRaw)) return 0;
//   return Math.max(0, Math.min(MAX, totalRaw));
// }

/** Get a 0–100 percentage for progress bars (optionally custom max). */
export function totalPercent(totalRaw: number, maxTotal = 100): number {
  if (maxTotal <= 0) return 0;
  const clamped = Math.max(0, Math.min(maxTotal, totalRaw));
  return (clamped / maxTotal) * 100;
}

/** Build a quick lookup map from habitId -> HabitScore for rendering. */
export function toHabitScoreMap(
  perHabit: HabitScore[]
): Record<string, HabitScore> {
  return perHabit.reduce<Record<string, HabitScore>>((acc, hs) => {
    acc[hs.habitId] = hs;
    return acc;
  }, {});
}
