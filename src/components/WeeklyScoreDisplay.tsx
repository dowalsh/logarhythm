"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SegmentedProgressBar from "@/components/SegmentedProgressBar";
import HabitScoreRow from "@/components/HabitScoreRow";
import { getPointsPerCompletion } from "@/lib/utils";

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

interface HabitLog {
  id: string;
  dailyLogId: string;
  habitId: string;
  value?: number;
  completed?: boolean;
}

interface DailyLog {
  id: string;
  userId: string;
  scoringSystemId: string;
  date: string;
  notes?: string;
  habitLogs: HabitLog[];
}

interface WeeklyScoreDisplayProps {
  scoredHabits: ScoredHabit[];
  weeklyLogs: DailyLog[];
}

export default function WeeklyScoreDisplay({
  scoredHabits,
  weeklyLogs,
}: WeeklyScoreDisplayProps) {
  // Calculate weekly completion counts for each habit
  const getWeeklyCompletionCount = (habitId: string) => {
    return weeklyLogs.reduce((count, dayLog) => {
      const habitLog = dayLog.habitLogs?.find((hl) => hl.habitId === habitId);
      return count + (habitLog?.completed ? 1 : 0);
    }, 0);
  };

  // Calculate weekly score for a habit
  const calculateWeeklyHabitScore = (scoredHabit: ScoredHabit) => {
    const weeklyCompletions = getWeeklyCompletionCount(scoredHabit.habitId);
    const target = scoredHabit.targetFrequency || 1;

    // Linear scoring relative to target, capped at target
    const completionRatio = Math.min(weeklyCompletions / target, 1);
    return Math.round(completionRatio * scoredHabit.weight);
  };

  // Get weekly progress segments for display
  const getWeeklyProgressSegments = (scoredHabit: ScoredHabit) => {
    const weeklyCompletions = getWeeklyCompletionCount(scoredHabit.habitId);
    const target = scoredHabit.targetFrequency || 1;

    return Math.min(weeklyCompletions, target);
  };

  const totalScore = scoredHabits.reduce(
    (sum, habit) => sum + calculateWeeklyHabitScore(habit),
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
            const score = calculateWeeklyHabitScore(scoredHabit);
            const progressSegments = getWeeklyProgressSegments(scoredHabit);
            const target = scoredHabit.targetFrequency || 1;
            const pointsPerCompletion = getPointsPerCompletion(scoredHabit);

            return (
              <HabitScoreRow
                key={scoredHabit.habitId}
                habitName={scoredHabit.habit.name}
                pointsPerCompletion={pointsPerCompletion}
                progressCurrent={progressSegments}
                progressMax={target}
                score={score}
                scoreMax={scoredHabit.weight}
              />
            );
          })}

          <div className="border-t pt-3 mt-4">
            <div className="grid grid-cols-12 gap-2 items-center text-sm font-semibold">
              <div className="col-span-3 text-right">TOTAL</div>
              <div className="col-span-6">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-sm h-4">
                  <div
                    className="bg-yellow-500 h-4 rounded-sm transition-all duration-300"
                    style={{
                      width: `${
                        maxScore > 0 ? (totalScore / maxScore) * 100 : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
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
