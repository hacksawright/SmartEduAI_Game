// Cách tính điểm của Luyện tập theo chương và Bảng xếp hạng tuần.
//
// Các hàm ở đây tách nguyên văn từ _app.practice.tsx và _app.leaderboard.tsx (trước khi thiết kế
// lại giao diện) để test được. Không đổi quy tắc:
// - mỗi câu đúng POINTS_PER_CORRECT điểm;
// - trong một tuần, mỗi chương lấy lần điểm cao nhất; điểm tuần = tổng các chương;
// - XP của một lần làm = phần vượt điểm cao nhất cũ của chương (không âm);
// - xếp hạng theo điểm giảm dần, bằng điểm thì theo tên (tiếng Việt).
import type { GraphChapter } from "@/lib/graph-chapters";
import { POINTS_PER_CORRECT, displayName } from "@/lib/week";

export interface AttemptPoints {
  chapter_key: string;
  points: number;
}

export interface StudentAttempt extends AttemptPoints {
  student_id: string;
}

export interface RankProfile {
  id: string;
  full_name: string | null;
  level: number | null;
}

export interface RankedStudent {
  id: string;
  full_name: string | null;
  level: number;
  points: number;
  chaptersDone: number;
}

export function chapterMaxPoints(chapter: GraphChapter): number {
  return chapter.questions.length * POINTS_PER_CORRECT;
}

/** Điểm cao nhất của từng chương trong các lần làm (của một học sinh, trong một tuần). */
export function bestByChapter(rows: readonly AttemptPoints[]): Record<string, number> {
  const best: Record<string, number> = {};
  for (const row of rows) {
    best[row.chapter_key] = Math.max(best[row.chapter_key] ?? 0, row.points);
  }
  return best;
}

export function weekPoints(best: Record<string, number>): number {
  return Object.values(best).reduce((sum, points) => sum + points, 0);
}

export function attemptXp(finalPoints: number, previousBest: number): number {
  return Math.max(0, finalPoints - previousBest);
}

/** Chuỗi ngày học: hôm nay đã học thì giữ, hôm qua có học thì +1, còn lại bắt đầu lại từ 1. */
export function nextStreak(
  lastActiveDate: string | null,
  streakCurrent: number,
  today: string,
  yesterday: string,
): number {
  if (lastActiveDate === today) return streakCurrent;
  if (lastActiveDate === yesterday) return streakCurrent + 1;
  return 1;
}

/** Lần làm này có được tính vào bảng xếp hạng tuần không (đạt hoặc vượt điểm cao nhất cũ). */
export function isCountedForWeek(savedPoints: number | null, previousBest: number): boolean {
  return savedPoints !== null && savedPoints >= previousBest;
}

export function rankWeeklyAttempts(
  attempts: readonly StudentAttempt[],
  profiles: readonly RankProfile[],
): RankedStudent[] {
  const byStudent = new Map<string, Map<string, number>>();
  for (const attempt of attempts) {
    const chapters = byStudent.get(attempt.student_id) ?? new Map<string, number>();
    chapters.set(
      attempt.chapter_key,
      Math.max(chapters.get(attempt.chapter_key) ?? 0, attempt.points),
    );
    byStudent.set(attempt.student_id, chapters);
  }

  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));

  return [...byStudent.entries()]
    .map(([id, chapters]) => {
      const profile = profileMap.get(id);
      const points = [...chapters.values()].reduce((sum, value) => sum + value, 0);
      return {
        id,
        full_name: profile?.full_name ?? null,
        level: profile?.level ?? 1,
        points,
        chaptersDone: [...chapters.values()].filter((value) => value > 0).length,
      };
    })
    .sort(
      (a, b) =>
        b.points - a.points ||
        displayName(a.full_name).localeCompare(displayName(b.full_name), "vi"),
    );
}

/**
 * Các dòng "Quanh vị trí của bạn" (chỉ khi bạn ngoài top 3), kèm hạng thật của từng người.
 * Giữ đúng công thức cũ: lấy rest.slice(myIdx - 5, myIdx + 2) với rest = phần sau top 3, tức là
 * tối đa 2 người ngay trên bạn, bạn, và tối đa 4 người dưới (không lặp lại top 3).
 */
export function rankingWindow(
  ranking: readonly RankedStudent[],
  myIdx: number,
): { student: RankedStudent; rank: number }[] {
  if (myIdx < 3) return [];
  const rest = ranking.slice(3);
  const start = Math.max(0, myIdx - 5);
  return rest.slice(start, myIdx + 2).map((student, index) => ({
    student,
    rank: start + index + 4,
  }));
}

/** Người ngay trên bạn và số điểm còn thiếu (0 = bằng điểm, xếp sau theo tên). */
export function gapToNextRank(
  ranking: readonly RankedStudent[],
  myIdx: number,
): { above: RankedStudent; rank: number; gap: number } | null {
  if (myIdx <= 0) return null;
  const above = ranking[myIdx - 1];
  return { above, rank: myIdx, gap: above.points - ranking[myIdx].points };
}

/** Chữ cái đại diện: chữ đầu của tên gọi (từ cuối trong họ tên tiếng Việt). */
export function initialOf(name: string): string {
  const last = name.trim().split(/\s+/).pop() ?? "";
  return (last[0] ?? "?").toLocaleUpperCase("vi");
}
