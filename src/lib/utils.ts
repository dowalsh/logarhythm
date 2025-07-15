import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getPointsPerCompletion(scoredHabit: {
  weight: number;
  targetFrequency?: number;
}) {
  return scoredHabit.weight / (scoredHabit.targetFrequency || 1);
}
