// /app/log/page.tsx

"use client";

import { useEffect, useState } from "react";
import { format, subDays, startOfToday } from "date-fns";
import useSWR from "swr";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import { fetcher } from "@/lib/swr";
import { Pencil } from "lucide-react";
import WeeklyScoreDisplay from "@/components/WeeklyScoreDisplay";

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

  const {
    data: existingLog,
    mutate,
    error: logError,
  } = useSWR(selectedDate ? `/api/logs?date=${selectedDate}` : null, fetcher);

  // Get active scoring system and its habits
  const activeScoringSystem = scoringSystems?.find((system) => system.isActive);
  const activeHabits = activeScoringSystem?.habits || [];

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

  const calculateHabitScore = (scoredHabit: ScoredHabit) => {
    const value = logData[scoredHabit.habitId];
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
    const value = logData[scoredHabit.habitId];
    const target = scoredHabit.targetFrequency || 1;

    if (scoredHabit.habit.habitType === "BOOLEAN") {
      return typeof value === "boolean" && value ? 1 : 0;
    } else {
      const numericValue = typeof value === "number" ? value : 0;
      return Math.min(Math.floor(numericValue), target);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Weekly Score Display */}
      {activeHabits.length > 0 && (
        <WeeklyScoreDisplay
          scoredHabits={activeHabits}
          dailyLogData={logData}
        />
      )}

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

        <label className="block text-sm font-medium mb-2">Select Date</label>
        <select
          className="border px-3 py-2 rounded-md bg-background mb-6"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        >
          {recentDates.map((date) => (
            <option key={date} value={date}>
              {format(new Date(date + "T00:00:00"), "EEEE, MMMM d")}
              {date === today ? " (Today)" : ""}
            </option>
          ))}
        </select>

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
              const score = calculateHabitScore(scoredHabit);
              const progressSegments = getProgressSegments(scoredHabit);
              const target = scoredHabit.targetFrequency || 1;
              const pointsPerUnit = scoredHabit.weight / target;

              return (
                <div
                  key={scoredHabit.habitId}
                  className="grid grid-cols-12 gap-2 items-center text-sm border-b pb-3"
                >
                  <div className="col-span-4 flex items-center gap-2">
                    <span className="font-medium truncate">
                      {scoredHabit.habit.name}
                    </span>
                  </div>
                  <div className="col-span-3 text-center">
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
                  <div className="col-span-1 text-right font-medium">
                    {score.toFixed(0)}/{scoredHabit.weight}
                  </div>
                  <div className="col-span-1 flex justify-end">
                    {scoredHabit.habit.habitType === "BOOLEAN" ? (
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
                    ) : (
                      <Input
                        type="number"
                        className="w-20"
                        value={logData[scoredHabit.habitId]?.toString() ?? ""}
                        onChange={(e) =>
                          isEditing &&
                          setLogData((d) => ({
                            ...d,
                            [scoredHabit.habitId]:
                              parseFloat(e.target.value) || 0,
                          }))
                        }
                        disabled={!isEditing}
                        placeholder="0"
                      />
                    )}
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
