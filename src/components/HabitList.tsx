"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface Habit {
  id: string;
  name: string;
  description?: string;
  unit?: string;
  weight: number;
  targetFrequency: number;
  scoringType: string;
  createdAt: string;
}

export default function HabitList() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHabits = async () => {
      try {
        const res = await fetch("/api/habits");
        if (!res.ok) throw new Error("Failed to fetch habits");
        const data = await res.json();
        setHabits(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchHabits();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (habits.length === 0) {
    return <div className="text-center text-gray-500">No habits yet.</div>;
  }

  return (
    <div className="grid gap-4">
      {habits.map((habit) => (
        <Card key={habit.id}>
          <CardHeader className="font-semibold">{habit.name}</CardHeader>
          <CardContent className="space-y-1">
            {habit.description && <p>{habit.description}</p>}
            {habit.unit && <p>Unit: {habit.unit}</p>}
            <p>Weight: {habit.weight}</p>
            <p>Target: {habit.targetFrequency} per week</p>
            <p>Scoring Type: {habit.scoringType}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
