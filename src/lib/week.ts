export const POINTS_PER_CORRECT = 20;

export const DEFAULT_WEEKLY_PRIZE =
  "Quà tuần sẽ được giảng viên công bố. Hạng 1 trên bảng này là người nhận giải.";

export function currentWeekStart(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  const utc = new Date(Date.UTC(year, month - 1, day));
  const weekday = utc.getUTCDay();
  const delta = weekday === 0 ? 6 : weekday - 1;
  utc.setUTCDate(utc.getUTCDate() - delta);
  return utc.toISOString().slice(0, 10);
}

export function weekRangeLabel(weekStart: string): string {
  const start = new Date(`${weekStart}T00:00:00Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  const format = (date: Date) =>
    date.toLocaleDateString("vi-VN", { timeZone: "UTC", day: "2-digit", month: "2-digit" });
  return `${format(start)} – ${format(end)}`;
}

export function displayName(fullName: string | null | undefined): string {
  const name = fullName?.trim();
  return name || "Học sinh";
}
