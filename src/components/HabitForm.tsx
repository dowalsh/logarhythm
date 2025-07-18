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
    habitType: string;
  };
}

export default function HabitForm({ initialData }: HabitFormProps) {
  const router = useRouter();
  const [formState, setFormState] = useState({
    name: initialData?.name ?? "",
    description: initialData?.description ?? "",
    habitType: initialData?.habitType ?? "BOOLEAN",
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

      <Button onClick={handleSubmit} disabled={loading}>
        {loading ? "Saving..." : initialData ? "Update Habit" : "Create Habit"}
      </Button>
    </div>
  );
}
