import { HabitScoringType } from "@prisma/client";

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
  scoredHabit: {
    weight: number;
  },
  allScoredHabits: { weight: number }[]
) {
  const totalWeight = allScoredHabits.reduce((sum, h) => sum + h.weight, 0);
  if (totalWeight === 0) return 0;
  return (scoredHabit.weight / totalWeight) * 100;
}
