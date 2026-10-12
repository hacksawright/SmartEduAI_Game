// Tiến độ người chơi (lưu localStorage theo user_id). Hàm thuần: nhận state cũ, trả state mới.

import type { GameId } from "../core/levels/types";
import { getLevel, RACE_SUFFIX, getGame, prevLevel } from "../core/registry";
import type { Stars } from "../core/scoring";
import type { RemoteProgress } from "./points";
import { readJson, removeKey, writeJson } from "./storage";

export interface LevelRecord {
  bestStars: 0 | Stars;
  bestScore: number;
  completions: number;
  attempts: number;
  bestTimeMs?: number;
  lastPlayed?: string;
}

export interface ProgressState {
  version: 1;
  levels: Record<string, LevelRecord>;
  points: number;
  /** id huy hiệu → thời điểm nhận */
  badges: Record<string, string>;
  /** số màn hoàn thành liên tiếp không dùng gợi ý */
  noHintStreak: number;
  /** đã xem hướng dẫn của game */
  seenTutorial: Partial<Record<GameId, boolean>>;
}

export const emptyProgress = (): ProgressState => ({
  version: 1,
  levels: {},
  points: 0,
  badges: {},
  noHintStreak: 0,
  seenTutorial: {},
});

const key = (userId: string) => `smartedu-ltdt:progress:v1:${userId}`;

export function loadProgress(userId: string): ProgressState {
  const p = readJson<ProgressState | null>(key(userId), null);
  return p && p.version === 1 ? { ...emptyProgress(), ...p } : emptyProgress();
}

export function saveProgress(userId: string, p: ProgressState): void {
  writeJson(key(userId), p);
}

export function clearProgress(userId: string): void {
  removeKey(key(userId));
}

const rec = (p: ProgressState, id: string): LevelRecord =>
  p.levels[id] ?? { bestStars: 0, bestScore: 0, completions: 0, attempts: 0 };

export function recordStart(p: ProgressState, levelId: string): ProgressState {
  const r = rec(p, levelId);
  return {
    ...p,
    levels: { ...p.levels, [levelId]: { ...r, attempts: r.attempts + 1, lastPlayed: new Date().toISOString() } },
  };
}

export function recordComplete(
  p: ProgressState,
  levelId: string,
  res: { stars: Stars; score: number; hints: number; durationMs: number },
): ProgressState {
  const r = rec(p, levelId);
  const next: LevelRecord = {
    ...r,
    bestStars: Math.max(r.bestStars, res.stars) as LevelRecord["bestStars"],
    bestScore: Math.max(r.bestScore, res.score),
    completions: r.completions + 1,
    bestTimeMs: r.bestTimeMs === undefined ? res.durationMs : Math.min(r.bestTimeMs, res.durationMs),
  };
  return {
    ...p,
    levels: { ...p.levels, [levelId]: next },
    noHintStreak: res.hints === 0 ? p.noHintStreak + 1 : 0,
  };
}

/**
 * Gộp tiến độ trên server vào tiến độ trên máy: mỗi màn lấy số sao và điểm cao hơn, nên đổi máy vẫn giữ
 * màn đã mở. `points`: lấy tổng điểm của server (false khi vừa nộp bài lúc đang tải, số của server đã cũ).
 * Bỏ qua id màn không có trong game. Không có gì thay đổi thì trả lại đúng object cũ.
 */
export function mergeRemote(p: ProgressState, r: RemoteProgress, opts: { points: boolean }): ProgressState {
  const levels = { ...p.levels };
  let changed = false;
  for (const [id, s] of Object.entries(r.levels)) {
    if (!getLevel(id)) continue;
    const stars = Math.min(3, Math.max(0, Math.floor(Number(s?.best_stars) || 0)));
    const score = Math.max(0, Number(s?.best_score) || 0);
    const cur = rec(p, id);
    if (stars <= cur.bestStars && score <= cur.bestScore) continue;
    levels[id] = {
      ...cur,
      bestStars: Math.max(cur.bestStars, stars) as LevelRecord["bestStars"],
      bestScore: Math.max(cur.bestScore, score),
      completions: Math.max(cur.completions, stars > 0 ? 1 : 0),
    };
    changed = true;
  }
  const points = opts.points && Number.isFinite(r.total) ? r.total : p.points;
  if (!changed && points === p.points) return p;
  return { ...p, levels, points };
}

export function bestStars(p: ProgressState, levelId: string): number {
  return p.levels[levelId]?.bestStars ?? 0;
}

/** Màn mở khi: mở hết, hoặc là màn đầu nhóm, hoặc màn trước trong nhóm đạt ≥ 1 sao (GDD 2.1). */
export function isUnlocked(p: ProgressState, levelId: string, unlockAll = false): boolean {
  if (unlockAll) return true;
  const isRace = levelId.endsWith(RACE_SUFFIX);
  const level = getLevel(levelId);
  if (!level) return false;
  if (isRace) return bestStars(p, level.id) >= 1;
  const prev = prevLevel(level);
  return !prev || bestStars(p, prev.id) >= 1;
}

export function gameStats(p: ProgressState, gameId: GameId) {
  const g = getGame(gameId);
  const done = g.levels.filter((l) => bestStars(p, l.id) >= 1).length;
  const stars = g.levels.reduce((s, l) => s + bestStars(p, l.id), 0);
  return { done, total: g.levels.length, stars, maxStars: g.levels.length * 3 };
}
