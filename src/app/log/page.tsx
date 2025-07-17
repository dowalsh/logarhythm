// /app/log/page.tsx

"use client";

import { useEffect, useState } from "react";
import {
  format,
  subDays,
  startOfToday,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addWeeks,
  subWeeks,
  isSameDay,
  isSameWeek,
} from "date-fns";
import useSWR from "swr";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import { fetcher } from "@/lib/swr";
import { Pencil, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import HabitScoreRow from "@/components/HabitScoreRow";
import { parseDateOnly, toDateString, isSameDate } from "@/lib/date";
import { getPointsPerCompletion, getScoreMax } from "@/lib/scoredHabitUtils";

// TODO: colours are broken on dark mode, fix this later
// TODO: arrows on left and right to go back and forward a day
// TODO: live score calculations
// TODO: calendar style drop down

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

interface ScoringSystem {
  id: string;
  name: string;
  isActive: boolean;
  habits: ScoredHabit[];
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

function getWeekDates(selectedDate: string) {
  const date = parseDateOnly(selectedDate);
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
  // Return array of date-only strings
  return eachDayOfInterval({ start: weekStart, end: weekEnd }).map(
    toDateString
  );
}

function WeekSelector({
  selectedDate,
  setSelectedDate,
  weeklyLogs,
}: {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  weeklyLogs: DailyLog[];
}) {
  const weekDates = getWeekDates(selectedDate); // now array of strings
  const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];

  // Debug: print weekDates and weeklyLogs
  console.log("[WeekSelector] weekDates:", weekDates);
  console.log(
    "[WeekSelector] weeklyLogs:",
    weeklyLogs.map((l) => l.date)
  );

  const handlePrevWeek = () => {
    const prevWeek = subWeeks(parseDateOnly(selectedDate), 1);
    setSelectedDate(toDateString(startOfWeek(prevWeek, { weekStartsOn: 1 })));
  };
  const handleNextWeek = () => {
    const nextWeek = addWeeks(parseDateOnly(selectedDate), 1);
    setSelectedDate(toDateString(startOfWeek(nextWeek, { weekStartsOn: 1 })));
  };

  // Helper to check if a log exists for a given date (now a string)
  const hasLogForDate = (dateStr: string) => {
    const found = weeklyLogs.some((log) => log.date === dateStr);
    // Debug: print for each date
    console.log(`[WeekSelector] hasLogForDate ${dateStr}:`, found);
    return found;
  };

  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2 my-4:my-6 px-2">
      <button
        onClick={handlePrevWeek}
        className="p-2 rounded hover:bg-muted"
        aria-label="Previous week"
      >
        <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
      </button>
      <div className="flex gap-1 p-2 flex-1 justify-center">
        {weekDates.map((dateStr, idx) => {
          const isSelected = dateStr === selectedDate;
          const hasLog = hasLogForDate(dateStr);
          let buttonClass =
            "flex flex-col items-center justify-center w-8 h-10 sm:w-10 sm:h-12 rounded border transition-colors";
          if (isSelected) {
            buttonClass += "bg-primary text-primary-foreground border-primary ";
          } else if (hasLog) {
            buttonClass += "bg-green-100 text-green-800 border-green-400 ";
          } else {
            buttonClass +=
              "bg-muted text-muted-foreground border-border hover:bg-accent ";
          }
          return (
            <button
              key={dateStr}
              onClick={() => setSelectedDate(dateStr)}
              className={buttonClass}
              aria-label={`Select ${dayLabels[idx]} ${dateStr.slice(8, 10)}`}
            >
              <span className="font-bold text-xs sm:text-base">
                {dayLabels[idx]}
              </span>
              <span className="text-xs mt-0.5 sm:mt-1">
                {dateStr.slice(8, 10)}
              </span>
            </button>
          );
        })}
      </div>
      <button
        onClick={handleNextWeek}
        className="p-2 rounded hover:bg-muted"
        aria-label="Next week"
      >
        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
      </button>
    </div>
  );
}

export default function LogPage() {
  const today = toDateString(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  const { data: scoringSystems, error: scoringError } = useSWR<ScoringSystem[]>(
    "/api/scoring-systems",
    fetcher
  );
  const [logData, setLogData] = useState<Record<string, number | boolean>>({});
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  // Get the current week's date range
  const weekStart = startOfWeek(parseDateOnly(selectedDate), {
    weekStartsOn: 1,
  });
  const weekEnd = endOfWeek(parseDateOnly(selectedDate), { weekStartsOn: 1 });

  // Fetch current day's log
  const {
    data: existingLog,
    mutate,
    error: logError,
  } = useSWR(selectedDate ? `/api/logs?date=${selectedDate}` : null, fetcher);

  // Get active scoring system and its habits
  const activeScoringSystem = scoringSystems?.find((system) => system.isActive);
  const activeHabits = activeScoringSystem?.habits || [];

  // Fetch all logs for the current week
  const { data: weeklyLogs, error: weeklyLogError } = useSWR(
    activeScoringSystem
      ? `/api/logs/week?start=${toDateString(weekStart)}&end=${toDateString(
          weekEnd
        )}`
      : null,
    fetcher
  );

  useEffect(() => {
    const logDataObj =
      existingLog?.log === undefined ? existingLog : existingLog?.log;
    if (logDataObj) {
      setNotes(logDataObj.notes || "");
      const filled: Record<string, number | boolean> = {};
      if (Array.isArray(logDataObj.habitLogs)) {
        for (const entry of logDataObj.habitLogs) {
          filled[entry.habitId] = entry.completed ?? entry.value ?? "";
        }
      }
      setLogData(filled);
      setIsEditing(false);
    } else {
      setNotes("");
      setLogData({});
      setIsEditing(true);
    }
  }, [existingLog]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          notes,
          logs: Object.entries(logData).map(([habitId, val]) =>
            typeof val === "boolean"
              ? { habitId, completed: val }
              : { habitId, value: val }
          ),
        }),
      });

      if (!res.ok) throw new Error("Failed to submit log");
      toast.success("Log saved");
      mutate(); // refresh daily log
      // Also refresh weekly logs
      if (activeScoringSystem) {
        const weekStartStr = toDateString(weekStart);
        const weekEndStr = toDateString(weekEnd);
        mutate(`/api/logs/week?start=${weekStartStr}&end=${weekEndStr}`);
      }
      setIsEditing(false);
    } catch (err) {
      toast.error("Error saving log");
      console.error("Error submitting log:", err);
    } finally {
      setLoading(false);
    }
  };

  const recentDates = Array.from({ length: 5 }, (_, i) => {
    const d = subDays(startOfToday(), i);
    return format(d, "yyyy-MM-dd");
  });

  const isToday = selectedDate === today;
  const hasExistingLog = !!existingLog;
  const isLoading = !scoringSystems && !scoringError;

  // Helper: create a virtual DailyLog for the selected day using current logData
  function getVirtualDailyLog(): DailyLog | null {
    if (!activeScoringSystem) return null;
    return {
      id: existingLog?.log?.id || existingLog?.id || "virtual",
      userId: existingLog?.log?.userId || existingLog?.userId || "virtual",
      scoringSystemId: activeScoringSystem.id,
      date: selectedDate,
      notes: notes,
      habitLogs: activeHabits.map((scoredHabit) => {
        const val = logData[scoredHabit.habitId];
        return {
          id: "virtual-" + scoredHabit.habitId,
          dailyLogId: existingLog?.log?.id || existingLog?.id || "virtual",
          habitId: scoredHabit.habitId,
          value: typeof val === "number" ? val : undefined,
          completed: typeof val === "boolean" ? val : undefined,
        };
      }),
    };
  }

  // Helper: get weekly logs, but override selected day with virtual logData
  function getPatchedWeeklyLogs(): DailyLog[] {
    if (!weeklyLogs?.logs) return [];
    const virtualLog = getVirtualDailyLog();
    // Replace the log for selectedDate with the virtual one
    let replaced = false;
    const patched = weeklyLogs.logs.map((log: DailyLog) => {
      if (log.date === selectedDate && virtualLog) {
        replaced = true;
        return virtualLog;
      }
      return log;
    });
    // If no log existed for selectedDate, add the virtual one
    if (!replaced && virtualLog) {
      patched.push(virtualLog);
    }
    return patched;
  }

  const getWeeklyProgressSegments = (scoredHabit: ScoredHabit) => {
    const weeklyCompletions = getWeeklyCompletionCount(scoredHabit.habitId);
    const target = scoredHabit.targetFrequency || 1;
    return Math.min(weeklyCompletions, target);
  };

  const getWeeklyCompletionCount = (habitId: string) => {
    const logs = getPatchedWeeklyLogs();
    if (!logs) return 0;
    return logs.reduce((count: number, dayLog: DailyLog) => {
      const habitLog = dayLog.habitLogs?.find(
        (hl: HabitLog) => hl.habitId === habitId
      );
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

  return (
    <div className="max-w-4xl mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Weekly Score Display
      {activeHabits.length > 0 && (
        <WeeklyScoreDisplay
          scoredHabits={activeHabits}
          weeklyLogs={weeklyLogs?.logs || []}
        />
      )} */}

      {/* Week Selector */}
      <WeekSelector
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        weeklyLogs={weeklyLogs?.logs || []}
      />

      {/* Daily Log Form */}
      <div className="rounded-md border shadow-sm p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground" />
            <h1 className="text-xl sm:text-2xl font-semibold">Log Entry</h1>
          </div>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="text-sm text-blue-500 hover:text-blue-700 p-2 rounded hover:bg-blue-50"
            >
              <Pencil className="w-4 h-4 inline mr-1" />
              <span className="hidden sm:inline">Edit</span>
            </button>
          )}
        </div>

        {scoringError && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md mb-4">
            <p className="text-sm text-destructive">
              Error loading scoring systems. Please try refreshing the page.
            </p>
          </div>
        )}

        {logError && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md mb-4">
            <p className="text-sm text-destructive">
              Error loading log data. Please try refreshing the page.
            </p>
          </div>
        )}

        {weeklyLogError && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md mb-4">
            <p className="text-sm text-destructive">
              Error loading weekly data. Please try refreshing the page.
            </p>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2 text-sm text-muted-foreground">
              Loading habits...
            </span>
          </div>
        )}

        {!isLoading && !activeScoringSystem && (
          <p className="text-sm text-muted">
            No active scoring system found. Please create one in the Habits
            section.
          </p>
        )}
        {!isLoading && activeHabits.length === 0 && activeScoringSystem && (
          <p className="text-sm text-muted">
            No habits in your active scoring system. Add some habits to get
            started.
          </p>
        )}

        {/* Compact Table Format */}
        {activeHabits.length > 0 && (
          <div className="space-y-3 mb-6">
            {(() => {
              // Calculate the maximum score among all habits to determine the baseline width
              const maxScoreAmongHabits = Math.max(
                ...activeHabits.map((habit) => getScoreMax(habit, activeHabits))
              );
              // Define responsive max width for the progress bar (in pixels)
              // Mobile: 80px, Desktop: 120
              const maxProgressBarWidth =
                typeof window !== "undefined" && window.innerWidth >= 640
                  ? 120
                  : 80;
              return activeHabits.map((scoredHabit: ScoredHabit) => {
                const weeklyCompletions = getWeeklyCompletionCount(
                  scoredHabit.habitId
                );
                const target = scoredHabit.targetFrequency || 1;
                const scoreMax = getScoreMax(scoredHabit, activeHabits);
                const completionRatio = Math.min(weeklyCompletions / target, 1);
                const weeklyScore = completionRatio * scoreMax;
                const weeklyProgress = getWeeklyProgressSegments(scoredHabit);
                const pointsPerCompletion = getPointsPerCompletion(
                  scoredHabit,
                  activeHabits
                );
                // Calculate proportional width based on this habit's max score
                const proportionalWidth =
                  (scoreMax / maxScoreAmongHabits) * 120; // CSS will handle responsive max-width
                return (
                  <div
                    key={scoredHabit.habitId}
                    className="flex items-center gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <HabitScoreRow
                        habitName={scoredHabit.habit.name}
                        pointsPerCompletion={pointsPerCompletion}
                        progressCurrent={weeklyProgress}
                        progressMax={target}
                        score={weeklyScore}
                        scoreMax={scoreMax}
                        progressBarWidth={proportionalWidth}
                      />
                    </div>
                    <div className="flex-shrink-0">
                      <Checkbox
                        checked={!!logData[scoredHabit.habitId]}
                        onCheckedChange={(checked) =>
                          isEditing &&
                          setLogData((d) => ({
                            ...d,
                            [scoredHabit.habitId]: !!checked,
                          }))
                        }
                        disabled={!isEditing}
                        className="w-5 h-5"
                      />
                    </div>
                  </div>
                );
              });
            })()}
            {/* TOTAL Bar */}
            <div className="border-t pt-3 mt-4">
              <div className="grid grid-cols-12 gap-2 items-center text-sm font-semibold">
                <div className="col-span-3 text-right text-xs sm:text-sm">
                  TOTAL
                </div>
                <div className="col-span-6">
                  {(() => {
                    // Calculate the current total score using patched weekly logs (live with checkbox changes)
                    const patchedLogs = getPatchedWeeklyLogs();
                    const totalScore = activeHabits.reduce((sum, habit) => {
                      const completions = patchedLogs.reduce(
                        (count, dayLog) => {
                          const habitLog = dayLog.habitLogs?.find(
                            (hl) => hl.habitId === habit.habitId
                          );
                          return count + (habitLog?.completed ? 1 : 0);
                        },
                        0
                      );
                      const target = habit.targetFrequency || 1;
                      const scoreMax = getScoreMax(habit, activeHabits);
                      const completionRatio = Math.min(completions / target, 1);
                      const habitScore = completionRatio * scoreMax;
                      return sum + habitScore;
                    }, 0);
                    const maxScore = 100;
                    const percent =
                      maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
                    return (
                      <div className="relative w-full h-3 sm:h-4 rounded-sm overflow-hidden bg-gray-200 dark:bg-gray-700">
                        <div
                          className="absolute left-0 top-0 h-3 sm:h-4 bg-yellow-500 rounded-sm transition-all duration-300"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    );
                  })()}
                </div>
                <div className="col-span-3 text-right text-xs sm:text-sm">
                  {(() => {
                    const patchedLogs = getPatchedWeeklyLogs();
                    const totalScore = activeHabits.reduce((sum, habit) => {
                      const completions = patchedLogs.reduce(
                        (count, dayLog) => {
                          const habitLog = dayLog.habitLogs?.find(
                            (hl) => hl.habitId === habit.habitId
                          );
                          return count + (habitLog?.completed ? 1 : 0);
                        },
                        0
                      );
                      const target = habit.targetFrequency || 1;
                      const scoreMax = getScoreMax(habit, activeHabits);
                      const completionRatio = Math.min(completions / target, 1);
                      const habitScore = completionRatio * scoreMax;
                      return sum + habitScore;
                    }, 0);
                    const maxScore = 100;
                    return (
                      <span>
                        {Math.round(totalScore)}/{maxScore}
                      </span>
                    );
                  })()}
                </div>
              </div>
            </div>
            {/* END TOTAL Bar */}
          </div>
        )}

        <Textarea
          value={notes}
          onChange={(e) => isEditing && setNotes(e.target.value)}
          placeholder="Any notes for this day?"
          className="mt-4 min-h-[80px] sm:min-h-[100px] resize-none"
          disabled={!isEditing}
        />

        {isEditing && (
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="mt-4 w-full bg-green-600 text-white hover:bg-green-700 h-12 sm:h-10 text-base"
          >
            {loading ? "Saving..." : "Submit"}
          </Button>
        )}
      </div>
    </div>
  );
}
