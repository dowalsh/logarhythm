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
import { Pencil, ChevronLeft, ChevronRight } from "lucide-react";
import WeeklyScoreDisplay from "@/components/WeeklyScoreDisplay";
import SegmentedProgressBar from "@/components/SegmentedProgressBar";
import HabitScoreRow from "@/components/HabitScoreRow";
import { getPointsPerCompletion } from "@/lib/utils";

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
  // Normalize to local midnight
  const date = new Date(selectedDate + "T00:00:00");
  const weekStart = startOfWeek(date, { weekStartsOn: 1 }); // Monday as start
  const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
  return eachDayOfInterval({ start: weekStart, end: weekEnd });
}

function WeekSelector({
  selectedDate,
  setSelectedDate,
}: {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
}) {
  const weekDates = getWeekDates(selectedDate);
  const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];

  const handlePrevWeek = () => {
    const prevWeek = subWeeks(new Date(selectedDate + "T00:00:00"), 1);
    setSelectedDate(
      format(startOfWeek(prevWeek, { weekStartsOn: 1 }), "yyyy-MM-dd")
    );
  };
  const handleNextWeek = () => {
    const nextWeek = addWeeks(new Date(selectedDate + "T00:00:00"), 1);
    setSelectedDate(
      format(startOfWeek(nextWeek, { weekStartsOn: 1 }), "yyyy-MM-dd")
    );
  };

  return (
    <div className="flex items-center justify-center gap-2 my-6">
      <button onClick={handlePrevWeek} className="p-2 rounded hover:bg-muted">
        <ChevronLeft className="w-5 h-5" />
      </button>
      <div className="flex gap-2">
        {weekDates.map((date, idx) => {
          const dateStr = format(date, "yyyy-MM-dd");
          const isSelected = dateStr === selectedDate;
          return (
            <button
              key={dateStr}
              onClick={() => setSelectedDate(dateStr)}
              className={`flex flex-col items-center justify-center w-10 h-12 rounded border transition-colors
                ${
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted text-muted-foreground border-border hover:bg-accent"
                }
              `}
            >
              <span className="font-bold text-base">{dayLabels[idx]}</span>
              <span className="text-xs mt-1">{format(date, "d-MMM")}</span>
            </button>
          );
        })}
      </div>
      <button onClick={handleNextWeek} className="p-2 rounded hover:bg-muted">
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}

export default function LogPage() {
  const today = format(startOfToday(), "yyyy-MM-dd");
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
  const weekStart = startOfWeek(new Date(selectedDate));
  const weekEnd = endOfWeek(new Date(selectedDate));

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
      ? `/api/logs/week?start=${format(weekStart, "yyyy-MM-dd")}&end=${format(
          weekEnd,
          "yyyy-MM-dd"
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
      for (const entry of logDataObj.habitLogs) {
        filled[entry.habitId] = entry.completed ?? entry.value ?? "";
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
      mutate();
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

  // Calculate weekly completion counts for each habit
  const getWeeklyCompletionCount = (habitId: string) => {
    if (!weeklyLogs?.logs) return 0;

    return weeklyLogs.logs.reduce((count: number, dayLog: DailyLog) => {
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

  // Get weekly progress segments for display
  const getWeeklyProgressSegments = (scoredHabit: ScoredHabit) => {
    const weeklyCompletions = getWeeklyCompletionCount(scoredHabit.habitId);
    const target = scoredHabit.targetFrequency || 1;

    return Math.min(weeklyCompletions, target);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Weekly Score Display */}
      {activeHabits.length > 0 && (
        <WeeklyScoreDisplay
          scoredHabits={activeHabits}
          weeklyLogs={weeklyLogs?.logs || []}
        />
      )}

      {/* Week Selector */}
      <WeekSelector
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
      />

      {/* Daily Log Form */}
      <div className="rounded-md border shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Log Entry</h1>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="text-sm text-blue-500 hover:text-blue-700"
            >
              <Pencil className="w-4 h-4 inline mr-1" />
              Edit
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

        {/* Removed select date dropdown */}

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
            {activeHabits.map((scoredHabit) => {
              const weeklyScore = calculateWeeklyHabitScore(scoredHabit);
              const weeklyProgress = getWeeklyProgressSegments(scoredHabit);
              const target = scoredHabit.targetFrequency || 1;
              const pointsPerCompletion = getPointsPerCompletion(scoredHabit);

              return (
                <div key={scoredHabit.habitId} className="flex items-center">
                  <div className="flex-1">
                    <HabitScoreRow
                      habitName={scoredHabit.habit.name}
                      pointsPerCompletion={pointsPerCompletion}
                      progressCurrent={weeklyProgress}
                      progressMax={target}
                      score={weeklyScore}
                      scoreMax={scoredHabit.weight}
                    />
                  </div>
                  <div className="ml-4">
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
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Textarea
          value={notes}
          onChange={(e) => isEditing && setNotes(e.target.value)}
          placeholder="Any notes for this day?"
          className="mt-4"
          disabled={!isEditing}
        />

        {isEditing && (
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="mt-4 w-full bg-green-600 text-white hover:bg-green-700"
          >
            {loading ? "Saving..." : "Submit"}
          </Button>
        )}
      </div>
    </div>
  );
}
