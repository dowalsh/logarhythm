// /app/log/page.tsx

"use client";

import { useEffect, useState } from "react";
import { format, subDays, startOfToday } from "date-fns";
import useSWR from "swr";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import { fetcher } from "@/lib/swr";
import { Pencil } from "lucide-react";

// TODO: colours are broken on dark mode, fix this later
// TODO: arrows on left and right to go back and forward a day
// TODO: live score calculations
// TODO: calendar style drop down

interface Habit {
  id: string;
  name: string;
  habitType: "BOOLEAN" | "NUMERIC";
}

export default function LogPage() {
  const today = format(startOfToday(), "yyyy-MM-dd");
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  const { data: habits } = useSWR<Habit[]>("/api/habits", fetcher);
  const [logData, setLogData] = useState<Record<string, number | boolean>>({});
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: existingLog, mutate } = useSWR(
    selectedDate ? `/api/logs?date=${selectedDate}` : null,
    fetcher
  );

  useEffect(() => {
    if (existingLog) {
      setNotes(existingLog.notes || "");
      const filled: Record<string, number | boolean> = {};
      for (const entry of existingLog.habitLogs) {
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

  return (
    <div
      className={`p-6 space-y-6 max-w-xl mx-auto rounded-md border shadow-sm ${
        hasExistingLog ? "bg-white/80" : "bg-green-50"
      }`}
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Log Entry</h1>
        {hasExistingLog && (
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="text-sm text-blue-500 hover:text-blue-700"
          >
            <Pencil className="w-4 h-4 inline mr-1" />{" "}
            {isEditing ? "Cancel" : "Edit"}
          </button>
        )}
      </div>

      <label className="block text-sm font-medium">Select Date</label>
      <select
        className="border px-3 py-2 rounded-md"
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

      {habits?.length === 0 && (
        <p className="text-sm text-muted">No habits found</p>
      )}
      {habits?.map((habit) => (
        <div key={habit.id} className="flex items-center justify-between">
          <label className="mr-4">{habit.name}</label>
          {habit.habitType === "BOOLEAN" ? (
            <Switch
              checked={!!logData[habit.id]}
              onCheckedChange={(val) =>
                isEditing && setLogData((d) => ({ ...d, [habit.id]: val }))
              }
              disabled={!isEditing}
            />
          ) : (
            <Input
              type="number"
              className="w-24"
              value={logData[habit.id]?.toString() ?? ""}
              onChange={(e) =>
                isEditing &&
                setLogData((d) => ({
                  ...d,
                  [habit.id]: parseFloat(e.target.value),
                }))
              }
              disabled={!isEditing}
            />
          )}
        </div>
      ))}

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
          className="mt-4 w-full"
        >
          {hasExistingLog
            ? loading
              ? "Saving..."
              : "Save Changes"
            : loading
            ? "Logging..."
            : "Log"}
        </Button>
      )}
    </div>
  );
}
