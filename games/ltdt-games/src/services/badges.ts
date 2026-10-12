// Huy hiệu (mục 6 kế hoạch, GDD 2.6).

import { CHAPTERS, GAMES } from "../core/registry";
import { bestStars, type ProgressState } from "./progress";

export interface BadgeDef {
  id: string;
  title: string;
  desc: string;
  kind: "complete" | "stars" | "nohint";
  /** tiến độ hiện tại / mục tiêu */
  progress(p: ProgressState): { have: number; need: number };
}

export const NO_HINT_TARGET = 10;

export const BADGES: BadgeDef[] = [
  ...GAMES.map<BadgeDef>((g) => ({
    id: `complete:${g.id}`,
    title: `Hoàn thành mọi màn`,
    desc: `${g.title}: qua mọi màn (ít nhất 1 sao).`,
    kind: "complete",
    progress: (p) => ({ have: g.levels.filter((l) => bestStars(p, l.id) >= 1).length, need: g.levels.length }),
  })),
  ...CHAPTERS.filter((c) => c.games.length > 0).map<BadgeDef>((c) => {
    const levels = GAMES.filter((g) => c.games.includes(g.id)).flatMap((g) => g.levels);
    return {
      id: `stars3:${c.id}`,
      title: `3 sao toàn bộ – Chương ${c.n}`,
      desc: `Đạt 3 sao ở mọi màn của chương ${c.n} (${c.title}).`,
      kind: "stars",
      progress: (p) => ({ have: levels.filter((l) => bestStars(p, l.id) === 3).length, need: levels.length }),
    };
  }),
  {
    id: "nohint:10",
    title: "Không cần gợi ý",
    desc: `Qua ${NO_HINT_TARGET} màn liên tiếp không dùng gợi ý.`,
    kind: "nohint",
    progress: (p) => ({ have: Math.min(p.noHintStreak, NO_HINT_TARGET), need: NO_HINT_TARGET }),
  },
];

export function badgeTitle(b: BadgeDef): string {
  if (b.kind !== "complete") return b.title;
  const g = GAMES.find((x) => `complete:${x.id}` === b.id)!;
  return `${b.title} – ${g.title}`;
}

/** Trả về state mới và danh sách huy hiệu vừa đạt. */
export function awardBadges(p: ProgressState, now = new Date()): { state: ProgressState; earned: BadgeDef[] } {
  const earned = BADGES.filter((b) => {
    if (p.badges[b.id]) return false;
    const { have, need } = b.progress(p);
    return have >= need;
  });
  if (!earned.length) return { state: p, earned };
  const badges = { ...p.badges };
  for (const b of earned) badges[b.id] = now.toISOString();
  return { state: { ...p, badges }, earned };
}
