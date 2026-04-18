export function formatDateShort(input: Date | string, locale = "en-IN") {
  const d = typeof input === "string" ? new Date(input) : input;
  return d.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
}
