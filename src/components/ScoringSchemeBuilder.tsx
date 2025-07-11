"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { toast } from "react-hot-toast";
import {
  Plus,
  Trash2,
  CheckCircle,
  Circle,
  ChevronDown,
  ChevronRight,
  Target,
} from "lucide-react";
import { ScoringTypeBadge } from "./ScoringTypeBadge";

interface Habit {
  id: string;
  name: string;
  description?: string;
  unit?: string;
  habitType: "BOOLEAN" | "NUMERIC";
  createdAt: string;
}

interface ScoredHabit {
  id: string;
  scoringSystemId: string;
  habitId: string;
  scoringType: string;
  weight: number;
  habit: Habit;
}

interface ScoringScheme {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  habits: ScoredHabit[];
}

export default function ScoringSchemeBuilder() {
  const [scoringSchemes, setScoringSchemes] = useState<ScoringScheme[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeScheme, setActiveScheme] = useState<ScoringScheme | null>(null);
  const [expandedHabits, setExpandedHabits] = useState<Set<string>>(new Set());

  // Form states for creating/editing
  const [schemeName, setSchemeName] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showHabitDialog, setShowHabitDialog] = useState(false);
  const [selectedHabitId, setSelectedHabitId] = useState("");
  const [newHabitWeight, setNewHabitWeight] = useState(5);
  const [newHabitScoringType, setNewHabitScoringType] = useState(
    "LINEAR_POSITIVE_CAPPED"
  );

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [schemesRes, habitsRes] = await Promise.all([
        fetch("/api/scoring-systems"),
        fetch("/api/habits"),
      ]);

      if (schemesRes.ok && habitsRes.ok) {
        const schemesData = await schemesRes.json();
        const habitsData = await habitsRes.json();

        setScoringSchemes(schemesData);
        setHabits(habitsData);

        const active = schemesData.find((s: ScoringScheme) => s.isActive);
        setActiveScheme(active || null);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const createScoringScheme = async () => {
    if (!schemeName.trim()) {
      toast.error("Please enter a scheme name");
      return;
    }

    try {
      const res = await fetch("/api/scoring-systems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: schemeName,
          isActive: true, // New scheme becomes active
        }),
      });

      if (res.ok) {
        toast.success("Scoring scheme created!");
        setSchemeName("");
        setShowCreateDialog(false);
        fetchData();
      } else {
        throw new Error("Failed to create scheme");
      }
    } catch (error) {
      console.error("Error creating scheme:", error);
      toast.error("Failed to create scoring scheme");
    }
  };

  const activateScoringScheme = async (schemeId: string) => {
    try {
      // First, deactivate all schemes
      await Promise.all(
        scoringSchemes.map((scheme) =>
          fetch(`/api/scoring-systems/${scheme.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isActive: false }),
          })
        )
      );

      // Then activate the selected scheme
      const res = await fetch(`/api/scoring-systems/${schemeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      });

      if (res.ok) {
        toast.success("Scoring scheme activated!");
        fetchData();
      } else {
        throw new Error("Failed to activate scheme");
      }
    } catch (error) {
      console.error("Error activating scheme:", error);
      toast.error("Failed to activate scoring scheme");
    }
  };

  const addHabitToScheme = async () => {
    if (!activeScheme || !selectedHabitId) {
      toast.error("Please select a habit");
      return;
    }

    try {
      const res = await fetch("/api/scored-habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scoringSystemId: activeScheme.id,
          habitId: selectedHabitId,
          scoringType: newHabitScoringType,
          weight: newHabitWeight,
        }),
      });

      if (res.ok) {
        toast.success("Habit added to scoring scheme!");
        setSelectedHabitId("");
        setNewHabitWeight(5);
        setNewHabitScoringType("LINEAR_POSITIVE_CAPPED");
        setShowHabitDialog(false);
        fetchData();
      } else {
        throw new Error("Failed to add habit");
      }
    } catch (error) {
      console.error("Error adding habit:", error);
      toast.error("Failed to add habit to scoring scheme");
    }
  };

  const removeHabitFromScheme = async (scoredHabitId: string) => {
    try {
      const res = await fetch(`/api/scored-habits/${scoredHabitId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Habit removed from scoring scheme!");
        fetchData();
      } else {
        throw new Error("Failed to remove habit");
      }
    } catch (error) {
      console.error("Error removing habit:", error);
      toast.error("Failed to remove habit from scoring scheme");
    }
  };

  const toggleHabitExpansion = (habitId: string) => {
    const newExpanded = new Set(expandedHabits);
    if (newExpanded.has(habitId)) {
      newExpanded.delete(habitId);
    } else {
      newExpanded.add(habitId);
    }
    setExpandedHabits(newExpanded);
  };

  const getAvailableHabits = () => {
    if (!activeScheme) return habits;
    const usedHabitIds = new Set(activeScheme.habits.map((sh) => sh.habitId));
    return habits.filter((habit) => !usedHabitIds.has(habit.id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading scoring schemes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Scoring Schemes Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>Scoring Schemes</span>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Scheme
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {scoringSchemes.length === 0 ? (
            <div className="text-center py-8">
              <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                No scoring schemes yet
              </h3>
              <p className="text-muted-foreground mb-4">
                Create your first scoring scheme to start organizing your habits
                with weights and scoring types.
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Scheme
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {scoringSchemes.map((scheme) => (
                <div
                  key={scheme.id}
                  className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                    scheme.isActive
                      ? "bg-primary/5 border-primary/20 shadow-sm"
                      : "bg-muted/50 hover:bg-muted/70"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {scheme.isActive ? (
                      <CheckCircle className="w-5 h-5 text-primary" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground" />
                    )}
                    <div>
                      <h3 className="font-medium">{scheme.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {scheme.habits.length} habits • Created{" "}
                        {new Date(scheme.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!scheme.isActive && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => activateScoringScheme(scheme.id)}
                      >
                        Activate
                      </Button>
                    )}
                    <Badge variant={scheme.isActive ? "default" : "secondary"}>
                      {scheme.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Scoring Scheme Details */}
      {activeScheme && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                <span>Active Scheme: {activeScheme.name}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHabitDialog(true)}
                disabled={getAvailableHabits().length === 0}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Habit
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeScheme.habits.length === 0 ? (
              <div className="text-center py-8">
                <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  No habits in this scheme
                </h3>
                <p className="text-muted-foreground mb-4">
                  Add habits to your scoring scheme to start tracking them with
                  weights and scoring types.
                </p>
                <Button onClick={() => setShowHabitDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Habit
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {activeScheme.habits.map((scoredHabit) => (
                  <div
                    key={scoredHabit.id}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            toggleHabitExpansion(scoredHabit.habitId)
                          }
                        >
                          {expandedHabits.has(scoredHabit.habitId) ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </Button>
                        <div className="flex-1">
                          <h4 className="font-medium">
                            {scoredHabit.habit.name}
                          </h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <span className="font-medium">
                              Weight: {scoredHabit.weight}
                            </span>
                            <Separator orientation="vertical" className="h-4" />
                            <ScoringTypeBadge
                              scoringType={scoredHabit.scoringType}
                            />
                          </div>
                        </div>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Habit</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to remove "
                              {scoredHabit.habit.name}" from this scoring
                              scheme? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() =>
                                removeHabitFromScheme(scoredHabit.id)
                              }
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>

                    {expandedHabits.has(scoredHabit.habitId) && (
                      <div className="mt-4 pt-4 border-t">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              Description
                            </Label>
                            <p className="text-foreground mt-1">
                              {scoredHabit.habit.description ||
                                "No description"}
                            </p>
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              Unit
                            </Label>
                            <p className="text-foreground mt-1">
                              {scoredHabit.habit.unit || "None"}
                            </p>
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              Habit Type
                            </Label>
                            <Badge variant="outline" className="mt-1">
                              {scoredHabit.habit.habitType}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create Scoring Scheme Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Scoring Scheme</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="schemeName">Scheme Name</Label>
              <Input
                id="schemeName"
                value={schemeName}
                onChange={(e) => setSchemeName(e.target.value)}
                placeholder="Enter scoring scheme name"
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={createScoringScheme}>Create Scheme</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Habit to Scheme Dialog */}
      <Dialog open={showHabitDialog} onOpenChange={setShowHabitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Habit to Scoring Scheme</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="habitSelect">Select Habit</Label>
              <Select
                value={selectedHabitId}
                onValueChange={setSelectedHabitId}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choose a habit" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableHabits().map((habit) => (
                    <SelectItem key={habit.id} value={habit.id}>
                      {habit.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Weight: {newHabitWeight}</Label>
              <Slider
                min={1}
                max={10}
                step={1}
                value={[newHabitWeight]}
                onValueChange={(val) => setNewHabitWeight(val[0])}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="scoringType">Scoring Type</Label>
              <Select
                value={newHabitScoringType}
                onValueChange={setNewHabitScoringType}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LINEAR_POSITIVE_CAPPED">
                    Linear Positive Capped
                  </SelectItem>
                  <SelectItem value="LINEAR_NEGATIVE_CAPPED">
                    Linear Negative Capped
                  </SelectItem>
                  <SelectItem value="THRESHOLD_TARGET">
                    Threshold Target
                  </SelectItem>
                  <SelectItem value="ONE_OFF_BONUS">One-Off Bonus</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowHabitDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={addHabitToScheme}>Add Habit</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
