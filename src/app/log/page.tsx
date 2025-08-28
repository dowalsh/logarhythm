// /app/log/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  format,
  subDays,
  startOfToday,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addWeeks,
  subWeeks,
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
import { parseDateOnly, toDateString } from "@/lib/date";
import { getPointsPerCompletion, getScoreMax } from "@/lib/scoredHabitUtils";
import { useUser, SignInButton } from "@clerk/nextjs";

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
  date: string; // yyyy-MM-dd
  notes?: string;
  habitLogs: HabitLog[];
}

function getWeekDates(selectedDate: string) {
  const date = parseDateOnly(selectedDate);
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
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
  const weekDates = getWeekDates(selectedDate);
  const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];

  const handlePrevWeek = () => {
    const prevWeek = subWeeks(parseDateOnly(selectedDate), 1);
    setSelectedDate(toDateString(startOfWeek(prevWeek, { weekStartsOn: 1 })));
  };
  const handleNextWeek = () => {
    const nextWeek = addWeeks(parseDateOnly(selectedDate), 1);
    setSelectedDate(toDateString(startOfWeek(nextWeek, { weekStartsOn: 1 })));
  };

  const hasLogForDate = (dateStr: string) =>
    weeklyLogs.some((log) => log.date === dateStr);

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
          const base =
            "flex flex-col items-center justify-center w-8 h-10 sm:w-10 sm:h-12 rounded border transition-colors";
          const variant = isSelected
            ? " bg-primary text-primary-foreground border-primary"
            : hasLog
            ? " bg-green-100 text-green-800 border-green-400"
            : " bg-muted text-muted-foreground border-border hover:bg-accent";
          return (
            <button
              key={dateStr}
              onClick={() => setSelectedDate(dateStr)}
              className={base + variant}
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
  const { isSignedIn } = useUser();
  if (!isSignedIn) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <h1 className="text-xl font-semibold mb-4">
          Please sign in to view your log
        </h1>
        <SignInButton mode="modal">
          <Button variant="default">Sign In</Button>
        </SignInButton>
      </div>
    );
  }

  // --- state
  const today = toDateString(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [logData, setLogData] = useState<Record<string, number | boolean>>({});
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // --- data
  const { data: scoringSystems, error: scoringError } = useSWR<ScoringSystem[]>(
    "/api/scoring-systems",
    fetcher
  );

  const { weekStart, weekEnd } = useMemo(() => {
    const start = startOfWeek(parseDateOnly(selectedDate), { weekStartsOn: 1 });
    const end = endOfWeek(parseDateOnly(selectedDate), { weekStartsOn: 1 });
    return { weekStart: start, weekEnd: end };
  }, [selectedDate]);

  const {
    data: weeklyLogsResp,
    mutate: mutateWeekly,
    error: weeklyLogError,
  } = useSWR(
    scoringSystems
      ? `/api/logs/week?start=${toDateString(weekStart)}&end=${toDateString(
          weekEnd
        )}`
      : null,
    fetcher
  );

  const activeScoringSystem = useMemo(
    () => scoringSystems?.find((s) => s.isActive),
    [scoringSystems]
  );

  const activeHabits = activeScoringSystem?.habits || [];
  const weeklyLogs: DailyLog[] = weeklyLogsResp?.logs || [];

  // find the selected day's log from the week payload
  const selectedDayLog: DailyLog | undefined = useMemo(
    () => weeklyLogs.find((l) => l.date === selectedDate),
    [weeklyLogs, selectedDate]
  );

  // seed local form state whenever the selected day changes or data loads
  useEffect(() => {
    if (selectedDayLog) {
      setNotes(selectedDayLog.notes || "");
      const filled: Record<string, number | boolean> = {};
      for (const hl of selectedDayLog.habitLogs || []) {
        filled[hl.habitId] = hl.completed ?? hl.value ?? 0;
      }
      setLogData(filled);
      setIsEditing(false);
    } else {
      // no log exists for the day yet => start in edit mode
      setNotes("");
      setLogData({});
      setIsEditing(true);
    }
  }, [selectedDayLog]);

  // patched weekly logs (live preview including current edits on the selected day)
  const patchedWeeklyLogs: DailyLog[] = useMemo(() => {
    if (!activeScoringSystem) return [];
    const base = weeklyLogs.slice();
    const virtual: DailyLog = {
      id: selectedDayLog?.id || "virtual",
      userId: selectedDayLog?.userId || "virtual",
      scoringSystemId: activeScoringSystem.id,
      date: selectedDate,
      notes,
      habitLogs: activeHabits.map((sh) => {
        const val = logData[sh.habitId];
        return {
          id: selectedDayLog
            ? selectedDayLog.habitLogs.find((h) => h.habitId === sh.habitId)
                ?.id || `virtual-${sh.habitId}`
            : `virtual-${sh.habitId}`,
          dailyLogId: selectedDayLog?.id || "virtual",
          habitId: sh.habitId,
          value: typeof val === "number" ? val : undefined,
          completed: typeof val === "boolean" ? val : undefined,
        };
      }),
    };
    const idx = base.findIndex((d) => d.date === selectedDate);
    if (idx >= 0) base[idx] = virtual;
    else base.push(virtual);
    return base;
  }, [
    activeScoringSystem,
    weeklyLogs,
    selectedDayLog,
    selectedDate,
    notes,
    logData,
    activeHabits,
  ]);

  // helpers
  const getWeeklyCompletionCount = (habitId: string) =>
    patchedWeeklyLogs.reduce((count, d) => {
      const hl = d.habitLogs?.find((h) => h.habitId === habitId);
      return count + (hl?.completed ? 1 : 0);
    }, 0);

  const totalScore = useMemo(() => {
    if (!activeHabits.length) return 0;
    return activeHabits.reduce((sum, habit) => {
      const completions = getWeeklyCompletionCount(habit.habitId);
      const target = habit.targetFrequency || 1;
      const scoreMax = getScoreMax(habit, activeHabits);
      const ratio = Math.min(completions / target, 1);
      return sum + ratio * scoreMax;
    }, 0);
  }, [activeHabits, patchedWeeklyLogs]);

  const handleSubmit = async () => {
    setSaving(true);
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
      await mutateWeekly(); // single source of truth
      setIsEditing(false);
    } catch (e) {
      toast.error("Error saving log");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const recentDates = Array.from({ length: 5 }, (_, i) =>
    format(subDays(startOfToday(), i), "yyyy-MM-dd")
  );
  const isLoading = !scoringSystems && !scoringError;

  return (
    <div className="max-w-4xl mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
      <WeekSelector
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        weeklyLogs={weeklyLogs}
      />

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
        {!isLoading && activeScoringSystem && activeHabits.length === 0 && (
          <p className="text-sm text-muted">
            No habits in your active scoring system. Add some habits to get
            started.
          </p>
        )}

        {activeHabits.length > 0 && (
          <div className="space-y-3 mb-6">
            {(() => {
              const maxScoreAmongHabits = Math.max(
                ...activeHabits.map((h) => getScoreMax(h, activeHabits))
              );
              const maxProgressBarWidth = 120;

              return activeHabits.map((sh) => {
                const weeklyCompletions = getWeeklyCompletionCount(sh.habitId);
                const target = sh.targetFrequency || 1;
                const scoreMax = getScoreMax(sh, activeHabits);
                const ratio = Math.min(weeklyCompletions / target, 1);
                const weeklyScore = ratio * scoreMax;
                const pointsPerCompletion = getPointsPerCompletion(
                  sh,
                  activeHabits
                );
                const proportionalWidth =
                  (scoreMax / maxScoreAmongHabits) * maxProgressBarWidth;

                return (
                  <div key={sh.habitId} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <HabitScoreRow
                        habitName={sh.habit.name}
                        pointsPerCompletion={pointsPerCompletion}
                        progressCurrent={Math.min(weeklyCompletions, target)}
                        progressMax={target}
                        score={weeklyScore}
                        scoreMax={scoreMax}
                        progressBarWidth={proportionalWidth}
                      />
                    </div>
                    <div className="flex-shrink-0">
                      <Checkbox
                        checked={!!logData[sh.habitId]}
                        onCheckedChange={(checked) =>
                          isEditing &&
                          setLogData((d) => ({ ...d, [sh.habitId]: !!checked }))
                        }
                        disabled={!isEditing}
                        className="w-5 h-5"
                      />
                    </div>
                  </div>
                );
              });
            })()}

            {/* TOTAL */}
            <div className="border-t pt-3 mt-4">
              <div className="grid grid-cols-12 gap-2 items-center text-sm font-semibold">
                <div className="col-span-3 text-right text-xs sm:text-sm">
                  TOTAL
                </div>
                <div className="col-span-6">
                  {(() => {
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
                  <span>{Math.round(totalScore)}/100</span>
                </div>
              </div>
            </div>
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
            disabled={saving}
            className="mt-4 w-full bg-green-600 text-white hover:bg-green-700 h-12 sm:h-10 text-base"
          >
            {saving ? "Saving..." : "Submit"}
          </Button>
        )}
      </div>
    </div>
  );
}
