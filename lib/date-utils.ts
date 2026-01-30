/**
 * Date Utility Functions
 *
 * Centralized date formatting helpers used across the app.
 */

/** Convert a Date to local YYYY-MM-DD string */
export function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Convert a Date to local HH:MM string */
export function toLocalTimeString(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/** Get today's date as YYYY-MM-DD string */
export function getTodayString(): string {
  return toLocalDateString(new Date());
}
