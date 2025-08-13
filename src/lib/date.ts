// lib/date.

import { parseISO, format } from "date-fns";
import { startOfWeek } from "date-fns";

// Existing code...
export function parseDateOnly(dateStr: string): Date {
  return parseISO(dateStr);
}

export function toDateString(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function isSameDate(a: Date, b: Date): boolean {
  return toDateString(a) === toDateString(b);
}

// ✅ New function to determine start of week (Monday)
export function getStartOfWeek(dateStr: string): string {
  const date = parseDateOnly(dateStr); // Local midnight
  const start = startOfWeek(date, { weekStartsOn: 1 }); // Monday
  return toDateString(start); // 'YYYY-MM-DD'
}
