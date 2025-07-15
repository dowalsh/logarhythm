import { parseISO, format } from "date-fns";

// Parse a date-only string (YYYY-MM-DD) to a Date at local midnight
export function parseDateOnly(dateStr: string): Date {
  return parseISO(dateStr);
}

// Convert a Date to a YYYY-MM-DD string (local date)
export function toDateString(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

// Compare two dates by day (local date)
export function isSameDate(a: Date, b: Date): boolean {
  return toDateString(a) === toDateString(b);
}
