// /app/log/page.tsx

"use client";

// Imports
import { useEffect, useState } from "react";
import { format, subDays, startOfToday } from "date-fns";
import useSWR from "swr";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import { fetcher } from "@/lib/swr";

// Habit interface from backend
interface Habit {
  id: string;
  name: string;
  habitType: "BOOLEAN" | "NUMERIC";
}

export default function LogPage() {
  // Default to today's date using local start of day
  const today = format(startOfToday(), "yyyy-MM-dd");
  const [selectedDate, setSelectedDate] = useState<string>(today);
  console.log("Default selected date:", today);

  // Fetch all habits using global fetcher
  const { data: habits } = useSWR<Habit[]>("/api/habits", fetcher);
  console.log("Habits fetched from /api/habits:", habits);

  // State for habit values and notes
  const [logData, setLogData] = useState<Record<string, number | boolean>>({});
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch existing log for selected date
  const { data: existingLog, mutate } = useSWR(
    selectedDate ? `/api/logs?date=${selectedDate}` : null,
    fetcher
  );
  console.log("Selected date:", selectedDate);
  console.log("Existing log data:", existingLog);

  // Prefill form if existing log is fetched, or clear form if not
  useEffect(() => {
    if (existingLog) {
      console.log("Populating form with existing log:", existingLog);
      setNotes(existingLog.notes || "");
      const filled: Record<string, number | boolean> = {};
      for (const entry of existingLog.habitLogs) {
        filled[entry.habitId] = entry.completed ?? entry.value ?? "";
      }
      console.log("Log data filled from existing entry:", filled);
      setLogData(filled);
    } else {
      console.log("No log for selected date; clearing form");
      setNotes("");
      setLogData({});
    }
  }, [existingLog]);

  // Handle form submission
  const handleSubmit = async () => {
    setLoading(true);
    try {
      console.log("Submitting log with:", { selectedDate, notes, logData });
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
    } catch (err) {
      toast.error("Error saving log");
      console.error("Error submitting log:", err);
    } finally {
      setLoading(false);
    }
  };

  // Generate past 5 dates including today
  const recentDates = Array.from({ length: 5 }, (_, i) => {
    const d = subDays(startOfToday(), i);
    return format(d, "yyyy-MM-dd");
  });
  console.log("Recent selectable dates:", recentDates);

  return (
    <div className="p-6 space-y-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-semibold">Log Entry</h1>

      {/* Dropdown to select date */}
      <label className="block text-sm font-medium">Select Date</label>
      <select
        className="border px-3 py-2 rounded-md"
        value={selectedDate}
        onChange={(e) => {
          console.log("Date changed to:", e.target.value);
          setSelectedDate(e.target.value);
        }}
      >
        {recentDates.map((date) => (
          <option key={date} value={date}>
            {format(new Date(date + "T00:00:00"), "EEEE, MMMM d")}
            {date === today ? " (Today)" : ""}
          </option>
        ))}
      </select>

      {/* Render habits with matching input types */}
      {habits?.length === 0 && (
        <p className="text-sm text-muted">No habits found</p>
      )}
      {habits?.map((habit) => {
        console.log("Rendering habit:", habit);
        return (
          <div key={habit.id} className="flex items-center justify-between">
            <label className="mr-4">{habit.name}</label>
            {habit.habitType === "BOOLEAN" ? (
              <Switch
                checked={!!logData[habit.id]}
                onCheckedChange={(val) => {
                  console.log(`Switch toggled: ${habit.name} =`, val);
                  setLogData((d) => ({ ...d, [habit.id]: val }));
                }}
              />
            ) : (
              <Input
                type="number"
                className="w-24"
                value={logData[habit.id]?.toString() ?? ""}
                onChange={(e) => {
                  console.log(`Input changed: ${habit.name} =`, e.target.value);
                  setLogData((d) => ({
                    ...d,
                    [habit.id]: parseFloat(e.target.value),
                  }));
                }}
              />
            )}
          </div>
        );
      })}

      {/* Notes input */}
      <Textarea
        value={notes}
        onChange={(e) => {
          console.log("Notes changed:", e.target.value);
          setNotes(e.target.value);
        }}
        placeholder="Any notes for this day?"
        className="mt-4"
      />

      {/* Submit button */}
      <Button onClick={handleSubmit} disabled={loading} className="mt-4 w-full">
        {loading ? "Saving..." : "Save Log"}
      </Button>
    </div>
  );
}
