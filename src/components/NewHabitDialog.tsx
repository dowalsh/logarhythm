"use client";

import { useState } from "react";
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

interface NewHabitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function NewHabitDialog({
  open,
  onOpenChange,
  onSuccess,
}: NewHabitDialogProps) {
  const router = useRouter();
  const [formState, setFormState] = useState({
    name: "",
    description: "",
    habitType: "BOOLEAN",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (field: string, value: any) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formState.name.trim()) {
      toast.error("Please enter a habit name");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formState),
      });

      if (!res.ok) throw new Error("Failed to create habit");

      toast.success("Habit created successfully!");
      setFormState({
        name: "",
        description: "",
        habitType: "BOOLEAN",
      });
      onOpenChange(false);
      router.refresh();
      onSuccess?.();
    } catch (err) {
      console.error(err);
      toast.error("Failed to create habit");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormState({ name: "", description: "", habitType: "BOOLEAN" });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Habit</DialogTitle>
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
              {loading ? "Creating..." : "Create Habit"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
