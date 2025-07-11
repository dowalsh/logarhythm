"use client";

import { useState } from "react";
import HabitList from "@/components/HabitList";
import ScoringSchemeBuilder from "@/components/ScoringSchemeBuilder";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import NewHabitDialog from "@/components/NewHabitDialog";

export default function HabitsPageContent() {
  const [showNewHabit, setShowNewHabit] = useState(false);

  return (
    <div className="p-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Habits & Scoring</h1>
        <Button
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded"
          onClick={() => setShowNewHabit(true)}
        >
          + New Habit
        </Button>
        <NewHabitDialog open={showNewHabit} onOpenChange={setShowNewHabit} />
      </div>

      {/* Tabs to organize content */}
      <Tabs defaultValue="scoring" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="scoring">Scoring Schemes</TabsTrigger>
          <TabsTrigger value="habits">All Habits</TabsTrigger>
        </TabsList>

        <TabsContent value="scoring" className="space-y-4">
          <ScoringSchemeBuilder />
        </TabsContent>

        <TabsContent value="habits" className="space-y-4">
          <HabitList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
