// Learning event gửi về API point transaction (mục 6 kế hoạch).

import type { GameId } from "./levels/types";
import type { Submission } from "./verify";

/** Điểm mock cho mỗi sao tăng thêm; con số thật do TV1/giảng viên quyết. */
export const POINTS_PER_STAR = 10;

export interface LearningEvent {
  event: "game_level_completed";
  idempotency_key: string;
  user_id: string;
  course_id: string;
  chapter_id: string;
  game_id: GameId;
  level_id: string;
  stars: number;
  score: number;
  hints_used: number;
  attempts: number;
  duration_ms: number;
  /** ISO 8601 kèm múi giờ, ví dụ 2026-10-20T09:15:00+07:00 */
  timestamp: string;
  /** nhật ký bài làm để server chấm lại */
  submission: Submission;
}

export const idempotencyKey = (userId: string, gameId: string, levelId: string, stars: number) =>
  `${userId}:${gameId}:${levelId}:${stars}`;

/** Chỉ cộng khi số sao cao hơn kỷ lục cũ; cộng phần chênh lệch. */
export function creditFor(prevBestStars: number, stars: number): number {
  return Math.max(0, stars - prevBestStars) * POINTS_PER_STAR;
}

/** Thời điểm theo giờ địa phương kèm độ lệch múi giờ (không dùng chữ Z). */
export function localIsoTimestamp(d = new Date()): string {
  const pad = (n: number) => String(Math.abs(n)).padStart(2, "0");
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? "+" : "-";
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` +
    `${sign}${pad(Math.trunc(off / 60))}:${pad(off % 60)}`
  );
}
