"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Habit {
  id: string;
  name: string;
  habitType: "BOOLEAN" | "NUMERIC";
}

interface ScoredHabit {
  id: string;
  habitId: string;
  scoringType: string;
  weight: number;
  targetFrequency?: number;
  habit: Habit;
}

interface WeeklyScoreDisplayProps {
  scoredHabits: ScoredHabit[];
  dailyLogData: Record<string, number | boolean>;
}

export default function WeeklyScoreDisplay({
  scoredHabits,
  dailyLogData,
}: WeeklyScoreDisplayProps) {
  const calculateHabitScore = (scoredHabit: ScoredHabit) => {
    const value = dailyLogData[scoredHabit.habitId];
    if (value === undefined || value === null) return 0;

    const target = scoredHabit.targetFrequency || 1;

    switch (scoredHabit.scoringType) {
      case "LINEAR_POSITIVE_CAPPED":
        const completion =
          typeof value === "boolean" ? (value ? 1 : 0) : Number(value);
        return Math.min(
          (completion / target) * scoredHabit.weight,
          scoredHabit.weight
        );

      case "THRESHOLD_TARGET":
        const thresholdMet =
          typeof value === "boolean" ? value : Number(value) >= target;
        return thresholdMet ? scoredHabit.weight : 0;

      case "ONE_OFF_BONUS":
        const completed =
          typeof value === "boolean" ? value : Number(value) > 0;
        return completed ? scoredHabit.weight : 0;

      default:
        return 0;
    }
  };

  const getProgressSegments = (scoredHabit: ScoredHabit) => {
    const value = dailyLogData[scoredHabit.habitId];
    const target = scoredHabit.targetFrequency || 1;

    if (scoredHabit.habit.habitType === "BOOLEAN") {
      // Boolean habits: show 1 segment if completed
      return typeof value === "boolean" && value ? 1 : 0;
    } else {
      // Numeric habits: show segments based on value vs target
      const numericValue = typeof value === "number" ? value : 0;
      return Math.min(Math.floor(numericValue), target);
    }
  };

  const totalScore = scoredHabits.reduce(
    (sum, habit) => sum + calculateHabitScore(habit),
    0
  );
  const maxScore = scoredHabits.reduce((sum, habit) => sum + habit.weight, 0);

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg">This Week's Score</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {scoredHabits.map((scoredHabit) => {
            const score = calculateHabitScore(scoredHabit);
            const progressSegments = getProgressSegments(scoredHabit);
            const target = scoredHabit.targetFrequency || 1;
            const pointsPerUnit = scoredHabit.weight / target;

            return (
              <div
                key={scoredHabit.habitId}
                className="grid grid-cols-12 gap-2 items-center text-sm"
              >
                <div className="col-span-3 flex items-center gap-2">
                  <span className="font-medium truncate">
                    {scoredHabit.habit.name}
                  </span>
                </div>
                <div className="col-span-2 text-center">
                  Weight: {scoredHabit.weight}
                </div>
                <div className="col-span-2 text-center">
                  {pointsPerUnit.toFixed(1)} pts ea.
                </div>
                <div className="col-span-3">
                  <div className="flex gap-1 h-4">
                    {Array.from({ length: target }, (_, i) => (
                      <div
                        key={i}
                        className={`flex-1 rounded-sm ${
                          i < progressSegments
                            ? "bg-green-500"
                            : "bg-gray-200 dark:bg-gray-700"
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <div className="col-span-2 text-right font-medium">
                  {score.toFixed(0)}/{scoredHabit.weight}
                </div>
              </div>
            );
          })}

          <div className="border-t pt-3 mt-4">
            <div className="grid grid-cols-12 gap-2 items-center text-sm font-semibold">
              <div className="col-span-9 text-right">TOTAL</div>
              <div className="col-span-3 text-right">
                {totalScore.toFixed(0)}/{maxScore}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
