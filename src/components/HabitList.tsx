"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Trash2, Pencil } from "lucide-react";
import { ScoringTypeBadge } from "@/components/ScoringTypeBadge";

interface Habit {
  id: string;
  name: string;
  description?: string;
  unit?: string;
  weight: number;
  targetFrequency: number;
  scoringType: string;
  habitType: string;
  createdAt: string;
}

export default function HabitList() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchHabits();
  }, []);

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

  const handleDelete = async () => {
    if (!selectedHabit) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/habits/${selectedHabit.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete habit");
      await fetchHabits();
      setSelectedHabit(null);
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (habits.length === 0) {
    return <div className="text-center text-gray-500">No habits yet.</div>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {habits.map((habit) => (
        <Card key={habit.id} className="relative">
          <CardHeader className="font-semibold">{habit.name}</CardHeader>

          {/* Edit & Delete icons */}
          <div className="absolute top-3 right-3 flex gap-2">
            <Link href={`/habits/edit/${habit.id}`}>
              <Button variant="ghost" size="icon" className="hover:bg-muted">
                <Pencil className="w-4 h-4 text-primary" />
              </Button>
            </Link>

            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hover:bg-destructive/20 text-destructive"
                  onClick={() => setSelectedHabit(habit)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </DialogTrigger>

              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirm Delete</DialogTitle>
                </DialogHeader>
                <p>
                  Are you sure you want to delete <b>{habit.name}</b>?
                </p>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedHabit(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deleteLoading}
                  >
                    {deleteLoading ? "Deleting..." : "Delete"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <CardContent className="space-y-2 text-sm">
            {/* Description with clamp + tooltip */}
            {habit.description && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="text-muted-foreground line-clamp-2 cursor-help min-h-[3rem]">
                    {habit.description ?? ""}
                  </p>
                </TooltipTrigger>
                <TooltipContent>{habit.description}</TooltipContent>
              </Tooltip>
            )}

            {/* Metadata grid */}
            <div className="grid grid-cols-2 gap-y-1">
              <div className="font-medium">Unit:</div>
              <div>{habit.unit ?? "-"}</div>

              <div className="font-medium">Weight:</div>
              <div>{habit.weight}</div>

              <div className="font-medium">Target:</div>
              <div>{habit.targetFrequency} per week</div>
              <div className="font-medium">Habit Type:</div>
              <div>{habit.habitType} </div>
              <div className="font-medium">Scoring Type:</div>
              <div>
                <ScoringTypeBadge scoringType={habit.scoringType} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
