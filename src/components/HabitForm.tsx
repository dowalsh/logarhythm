"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface HabitFormProps {
  initialData?: {
    id: string;
    name: string;
    description?: string;
    unit?: string;
    weight: number;
    targetFrequency: number;
    habitType: string;
    scoringType: string;
  };
}

export default function HabitForm({ initialData }: HabitFormProps) {
  const router = useRouter();
  const [formState, setFormState] = useState({
    name: initialData?.name ?? "",
    description: initialData?.description ?? "",
    unit: initialData?.unit ?? "",
    weight: initialData?.weight ?? 5,
    targetFrequency: initialData?.targetFrequency ?? 7,
    habitType: initialData?.habitType ?? "BOOLEAN",
    scoringType: initialData?.scoringType ?? "LINEAR_POSITIVE_CAPPED",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (field: string, value: any) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const url = initialData ? `/api/habits/${initialData.id}` : `/api/habits`;

      const method = initialData ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formState),
      });

      if (!res.ok) throw new Error("Failed to save habit");

      router.refresh();
      router.push("/habits"); // redirect after save
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-semibold">
        {initialData ? "Edit Habit" : "Create New Habit"}
      </h1>

      <div className="space-y-2">
        <Input
          placeholder="Habit name"
          value={formState.name}
          onChange={(e) => handleChange("name", e.target.value)}
        />
        <Textarea
          placeholder="Description (optional)"
          value={formState.description}
          onChange={(e) => handleChange("description", e.target.value)}
        />
        <Input
          placeholder="Unit (e.g. minutes, reps, pages)"
          value={formState.unit}
          onChange={(e) => handleChange("unit", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <label className="font-medium">Weight ({formState.weight})</label>
        <Slider
          min={1}
          max={10}
          step={1}
          value={[formState.weight]}
          onValueChange={(val) => handleChange("weight", val[0])}
        />
      </div>

      <div className="space-y-2">
        <label className="font-medium">Target Frequency (per week)</label>
        <Input
          type="number"
          min={1}
          max={14}
          value={formState.targetFrequency}
          onChange={(e) =>
            handleChange("targetFrequency", parseInt(e.target.value) || 0)
          }
        />
      </div>
      <div className="space-y-2">
        <label className="font-medium">Habit Type</label>
        <Select
          value={formState.habitType}
          onValueChange={(val) => handleChange("habitType", val)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select Habit Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="BOOLEAN">Boolean</SelectItem>
            <SelectItem value="NUMERIC">Numeric</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <label className="font-medium">Scoring Type</label>
        <Select
          value={formState.scoringType}
          onValueChange={(val) => handleChange("scoringType", val)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select Scoring Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="LINEAR_POSITIVE_CAPPED">
              Linear Positive Capped
            </SelectItem>
            <SelectItem value="LINEAR_NEGATIVE_CAPPED">
              Linear Negative Capped
            </SelectItem>
            <SelectItem value="THRESHOLD_TARGET">Threshold Target</SelectItem>
            <SelectItem value="ONE_OFF_BONUS">One-Off Bonus</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button onClick={handleSubmit} disabled={loading}>
        {loading ? "Saving..." : initialData ? "Update Habit" : "Create Habit"}
      </Button>
    </div>
  );
}
