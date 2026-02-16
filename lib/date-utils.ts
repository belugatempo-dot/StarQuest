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

/**
 * Format a date string for display with locale support.
 * Replaces duplicated formatDate helpers across components.
 */
export function formatDateTime(
  dateString: string | null,
  locale: string,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };
  return date.toLocaleString(
    locale === "zh-CN" ? "zh-CN" : "en-US",
    options ?? defaultOptions
  );
}

/**
 * Combine a YYYY-MM-DD date string with the current time.
 * Replaces the fragile `new Date(date + "T" + new Date().toTimeString().split(" ")[0])` pattern.
 */
export function combineDateWithCurrentTime(dateString: string): Date {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  return new Date(`${dateString}T${hours}:${minutes}:${seconds}`);
}

/**
 * Format a date string for display (date only, no time).
 */
export function formatDateOnly(
  dateString: string | null,
  locale: string
): string {
  return formatDateTime(dateString, locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
