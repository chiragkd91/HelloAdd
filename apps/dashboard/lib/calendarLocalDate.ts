/**
 * Calendar grid uses the viewer's local civil date (year / month index / day).
 * This produces a YYYY-MM-DD key without going through UTC (avoids day shifts).
 */
export function localCalendarDayKey(year: number, monthIndex0: number, day: number): string {
  const m = String(monthIndex0 + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

/** Group scheduled posts by the same calendar day in this IANA timezone (e.g. Asia/Kolkata). */
export function formatDateKeyInTimeZone(date: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export function isValidIanaTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}
