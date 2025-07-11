"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
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
import { toast } from "react-hot-toast";

interface Habit {
  id: string;
  name: string;
  description?: string;
  unit?: string;
  habitType: string;
}

interface EditHabitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  habit: Habit | null;
}

export default function EditHabitDialog({
  open,
  onOpenChange,
  habit,
}: EditHabitDialogProps) {
  const router = useRouter();
  const [formState, setFormState] = useState({
    name: "",
    description: "",
    unit: "",
    habitType: "BOOLEAN",
  });
  const [loading, setLoading] = useState(false);

  // Update form state when habit changes
  useEffect(() => {
    if (habit) {
      setFormState({
        name: habit.name,
        description: habit.description || "",
        unit: habit.unit || "",
        habitType: habit.habitType,
      });
    }
  }, [habit]);

  const handleChange = (field: string, value: any) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!habit || !formState.name.trim()) {
      toast.error("Please enter a habit name");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/habits/${habit.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formState),
      });

      if (!res.ok) throw new Error("Failed to update habit");

      toast.success("Habit updated successfully!");
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update habit");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  if (!habit) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Habit</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Habit Name *</label>
            <Input
              placeholder="Enter habit name"
              value={formState.name}
              onChange={(e) => handleChange("name", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              placeholder="Optional description"
              value={formState.description}
              onChange={(e) => handleChange("description", e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Unit</label>
            <Input
              placeholder="e.g. minutes, reps, pages"
              value={formState.unit}
              onChange={(e) => handleChange("unit", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Habit Type</label>
            <Select
              value={formState.habitType}
              onValueChange={(val) => handleChange("habitType", val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Habit Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BOOLEAN">Boolean (Yes/No)</SelectItem>
                <SelectItem value="NUMERIC">Numeric (Count/Amount)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Updating..." : "Update Habit"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
