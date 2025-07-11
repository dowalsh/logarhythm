"use client";

import HabitList from "@/components/HabitList";
import ScoringSchemeBuilder from "@/components/ScoringSchemeBuilder";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, Repeat } from "lucide-react";

export default function HabitsPageContent() {
  return (
    <div className="p-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Habits & Scoring</h1>
      </div>

      {/* Tabs to organize content */}
      <Tabs defaultValue="scoring" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="scoring" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Scoring Schemes
          </TabsTrigger>
          <TabsTrigger value="habits" className="flex items-center gap-2">
            <Repeat className="h-4 w-4" />
            All Habits
          </TabsTrigger>
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
