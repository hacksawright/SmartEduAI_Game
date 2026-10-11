// XP / Level system theo spec

const LEVEL_THRESHOLDS: number[] = [];
{
  let total = 0;
  for (let lvl = 1; lvl <= 20; lvl++) {
    LEVEL_THRESHOLDS.push(total);
    const xpForThisLevel =
      lvl <= 5 ? 100 : lvl <= 10 ? 200 : lvl <= 15 ? 350 : 500;
    total += xpForThisLevel;
  }
}

export function getLevelFromXp(xp: number): number {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) level = i + 1;
  }
  return Math.min(level, 20);
}

export function getXpForLevel(level: number): number {
  return LEVEL_THRESHOLDS[Math.min(level, 20) - 1] ?? 0;
}

export function getXpForNextLevel(level: number): number {
  if (level >= 20) return LEVEL_THRESHOLDS[19];
  return LEVEL_THRESHOLDS[level] ?? LEVEL_THRESHOLDS[19];
}

export function getLevelProgress(xp: number): { level: number; current: number; needed: number; pct: number } {
  const level = getLevelFromXp(xp);
  const cur = getXpForLevel(level);
  const next = getXpForNextLevel(level);
  const inLevel = xp - cur;
  const span = Math.max(next - cur, 1);
  return { level, current: inLevel, needed: span, pct: Math.min(100, (inLevel / span) * 100) };
}

const LEVEL_TITLES: Record<number, string> = {
  1: "Học trò mới",
  2: "Tập tành",
  3: "Bước đầu",
  4: "Có tiến bộ",
  5: "Nhận ra đồ thị",
  6: "Đi được DFS",
  7: "Đi được BFS",
  8: "Thấy đường Euler",
  9: "Nhìn ra hai phía",
  10: "Tô được màu",
  11: "Tính đường ngắn",
  12: "Dựng được cây",
  13: "Chọn cây khung",
  14: "Đẩy được luồng",
  15: "Nắm lát cắt",
  16: "Kết nối bản đồ",
  17: "Sắc bén thuật toán",
  18: "Thông thạo đồ thị",
  19: "Bậc thầy đồ thị",
  20: "Huyền thoại đồ thị",
};

export function getLevelTitle(level: number): string {
  return LEVEL_TITLES[Math.min(Math.max(level, 1), 20)] ?? "Học trò mới";
}

export function vnGreeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 11) return "buổi sáng";
  if (h < 14) return "buổi trưa";
  if (h < 18) return "buổi chiều";
  return "buổi tối";
}

export function relativeTimeVi(dateStr: string | Date): string {
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "vừa xong";
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`;
  return d.toLocaleDateString("vi-VN");
}
