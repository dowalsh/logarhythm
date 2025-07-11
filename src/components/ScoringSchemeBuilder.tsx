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
  Pencil,
  Info,
} from "lucide-react";
import { ScoringTypeBadge } from "./ScoringTypeBadge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Habit {
  id: string;
  name: string;
  description?: string;
  habitType: "BOOLEAN" | "NUMERIC";
  createdAt: string;
}

interface ScoredHabit {
  id: string;
  scoringSystemId: string;
  habitId: string;
  scoringType: string;
  weight: number;
  targetFrequency?: number;
  habit: Habit;
}

interface ScoringScheme {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  habits: ScoredHabit[];
}

interface EditableScoredHabit {
  id?: string; // undefined for new rows
  habitId: string;
  scoringType: string;
  targetFrequency?: number;
  weight: number;
  isNew?: boolean;
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
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editSchemeId, setEditSchemeId] = useState<string | null>(null);
  const [editSchemeName, setEditSchemeName] = useState("");

  // Editable scored habits for the active scheme
  const [editableHabits, setEditableHabits] = useState<EditableScoredHabit[]>(
    []
  );
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeScheme) {
      // Convert existing scored habits to editable format
      const editable = activeScheme.habits.map((sh) => ({
        id: sh.id,
        habitId: sh.habitId,
        scoringType: sh.scoringType,
        targetFrequency: sh.targetFrequency || 0,
        weight: sh.weight,
        isNew: false,
      }));
      setEditableHabits(editable);
    } else {
      setEditableHabits([]);
    }
  }, [activeScheme]);

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

  const addEmptyRow = () => {
    if (!activeScheme) return;

    const newRow: EditableScoredHabit = {
      habitId: "",
      scoringType: "LINEAR_POSITIVE_CAPPED",
      targetFrequency: 0,
      weight: 5,
      isNew: true,
    };

    setEditableHabits([...editableHabits, newRow]);
  };

  const updateEditableHabit = (
    index: number,
    field: keyof EditableScoredHabit,
    value: any
  ) => {
    const updated = [...editableHabits];
    updated[index] = { ...updated[index], [field]: value };
    setEditableHabits(updated);
  };

  const removeEditableHabit = (index: number) => {
    const habit = editableHabits[index];

    if (habit.id && !habit.isNew) {
      // Delete existing scored habit
      removeHabitFromScheme(habit.id);
    } else {
      // Remove from local state
      const updated = editableHabits.filter((_, i) => i !== index);
      setEditableHabits(updated);
    }
  };

  const saveEditableHabits = async () => {
    if (!activeScheme) return;

    try {
      // Save new habits and update existing ones
      for (const habit of editableHabits) {
        if (habit.habitId) {
          if (habit.isNew) {
            // Create new scored habit
            await fetch("/api/scored-habits", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                scoringSystemId: activeScheme.id,
                habitId: habit.habitId,
                scoringType: habit.scoringType,
                weight: habit.weight,
                targetFrequency: habit.targetFrequency,
              }),
            });
          } else if (habit.id) {
            // Update existing scored habit
            await fetch(`/api/scored-habits/${habit.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                scoringType: habit.scoringType,
                weight: habit.weight,
                targetFrequency: habit.targetFrequency,
              }),
            });
          }
        }
      }

      toast.success("Changes saved!");
      fetchData();
    } catch (error) {
      console.error("Error saving habits:", error);
      toast.error("Failed to save changes");
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

  const getHabitById = (habitId: string) => {
    return habits.find((h) => h.id === habitId);
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
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditSchemeId(scheme.id);
                        setEditSchemeName(scheme.name);
                        setEditDialogOpen(true);
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
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
                    {/* Delete button for inactive schemes */}
                    {!scheme.isActive && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Delete Scoring Scheme
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{scheme.name}"?
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={async () => {
                                try {
                                  const res = await fetch(
                                    `/api/scoring-systems/${scheme.id}`,
                                    {
                                      method: "DELETE",
                                    }
                                  );
                                  if (res.ok) {
                                    toast.success("Scoring scheme deleted!");
                                    fetchData();
                                  } else {
                                    throw new Error("Failed to delete scheme");
                                  }
                                } catch (error) {
                                  toast.error(
                                    "Failed to delete scoring scheme"
                                  );
                                }
                              }}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
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
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addEmptyRow}
                  disabled={!isEditing}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Habit
                </Button>
                {isEditing ? (
                  <Button
                    size="sm"
                    onClick={async () => {
                      await saveEditableHabits();
                      setIsEditing(false);
                    }}
                  >
                    Save Changes
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => setIsEditing(true)}>
                    Edit
                  </Button>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {editableHabits.length === 0 ? (
              <div className="text-center py-8">
                <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  No habits in this scheme
                </h3>
                <p className="text-muted-foreground mb-4">
                  Add habits to your scoring scheme to start tracking them with
                  weights and scoring types.
                </p>
                <Button onClick={addEmptyRow}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Habit
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground border-b pb-2">
                  <div className="col-span-4">Habit</div>
                  <div className="col-span-3">Scoring Type</div>
                  <div className="col-span-2">Target</div>
                  <div className="col-span-2">Weight</div>
                  <div className="col-span-1"></div>
                </div>

                {/* Table Rows */}
                {editableHabits.map((habit, index) => {
                  const habitData = getHabitById(habit.habitId);
                  return (
                    <div
                      key={index}
                      className="grid grid-cols-12 gap-4 items-center py-3 border-b"
                    >
                      {/* Habit Selection */}
                      <div className="col-span-4">
                        {isEditing ? (
                          <Select
                            value={habit.habitId}
                            onValueChange={(value) =>
                              updateEditableHabit(index, "habitId", value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select habit" />
                            </SelectTrigger>
                            <SelectContent>
                              {habits.map((h) => (
                                <SelectItem key={h.id} value={h.id}>
                                  <div className="flex items-center gap-2">
                                    <span>{h.name}</span>
                                    {h.description && (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Info className="w-3 h-3 text-muted-foreground" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p className="max-w-xs">
                                            {h.description}
                                          </p>
                                        </TooltipContent>
                                      </Tooltip>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {habitData?.name || "No habit selected"}
                            </span>
                            {habitData?.description && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="w-3 h-3 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-xs">
                                    {habitData.description}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Scoring Type */}
                      <div className="col-span-3">
                        {isEditing ? (
                          <Select
                            value={habit.scoringType}
                            onValueChange={(value) =>
                              updateEditableHabit(index, "scoringType", value)
                            }
                          >
                            <SelectTrigger>
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
                              <SelectItem value="ONE_OFF_BONUS">
                                One-Off Bonus
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <ScoringTypeBadge scoringType={habit.scoringType} />
                        )}
                      </div>

                      {/* Target Frequency */}
                      <div className="col-span-2">
                        {isEditing ? (
                          <Input
                            type="number"
                            value={habit.targetFrequency || ""}
                            onChange={(e) =>
                              updateEditableHabit(
                                index,
                                "targetFrequency",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            placeholder="0"
                            min="0"
                          />
                        ) : (
                          <span>{habit.targetFrequency || 0}</span>
                        )}
                      </div>

                      {/* Weight */}
                      <div className="col-span-2">
                        {isEditing ? (
                          <Input
                            type="number"
                            value={habit.weight}
                            onChange={(e) =>
                              updateEditableHabit(
                                index,
                                "weight",
                                parseInt(e.target.value) || 1
                              )
                            }
                            placeholder="5"
                            min="1"
                            max="10"
                          />
                        ) : (
                          <span>{habit.weight}</span>
                        )}
                      </div>

                      {/* Delete Button */}
                      <div className="col-span-1">
                        {isEditing && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeEditableHabit(index)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
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

      {/* Edit Scoring Scheme Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Scoring Scheme</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editSchemeName">Scheme Name</Label>
              <Input
                id="editSchemeName"
                value={editSchemeName}
                onChange={(e) => setEditSchemeName(e.target.value)}
                placeholder="Enter scoring scheme name"
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!editSchemeId || !editSchemeName.trim()) {
                    toast.error("Please enter a scheme name");
                    return;
                  }
                  try {
                    const res = await fetch(
                      `/api/scoring-systems/${editSchemeId}`,
                      {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ name: editSchemeName }),
                      }
                    );
                    if (res.ok) {
                      toast.success("Scoring scheme updated!");
                      setEditDialogOpen(false);
                      fetchData();
                    } else {
                      throw new Error("Failed to update scheme");
                    }
                  } catch (error) {
                    toast.error("Failed to update scoring scheme");
                  }
                }}
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
