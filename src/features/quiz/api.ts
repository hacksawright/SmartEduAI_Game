// Đọc/ghi Supabase của Luyện tập theo chương và Bảng xếp hạng tuần.
// Thứ tự và nội dung các lệnh giữ nguyên như trước khi thiết kế lại giao diện; client được truyền
// vào để test kiểm tra được từng lệnh.
import type { supabase } from "@/integrations/supabase/client";
import type { GraphChapter } from "@/lib/graph-chapters";
import { getLevelFromXp } from "@/lib/math-utils";
import { DEFAULT_WEEKLY_PRIZE, POINTS_PER_CORRECT } from "@/lib/week";
import {
  attemptXp,
  bestByChapter,
  chapterMaxPoints,
  nextStreak,
  rankWeeklyAttempts,
  type RankedStudent,
} from "./scoring";

export type QuizClient = typeof supabase;

export const chapterBestKey = (userId: string | undefined, weekStart: string) =>
  ["chapter-best", userId, weekStart] as const;

export const weeklyLeaderboardKey = (weekStart: string) =>
  ["weekly-leaderboard", weekStart] as const;

export async function fetchChapterBest(
  client: QuizClient,
  userId: string,
  weekStart: string,
): Promise<Record<string, number>> {
  const { data, error } = await client
    .from("chapter_quiz_attempts")
    .select("chapter_key, points")
    .eq("student_id", userId)
    .eq("week_start", weekStart);
  if (error) throw error;
  return bestByChapter(data ?? []);
}

export interface WeeklyLeaderboard {
  ranking: RankedStudent[];
  prizeTitle: string;
  prizeDescription: string;
}

export async function fetchWeeklyLeaderboard(
  client: QuizClient,
  weekStart: string,
): Promise<WeeklyLeaderboard> {
  const [{ data: attempts, error: attemptError }, { data: prize }] = await Promise.all([
    client
      .from("chapter_quiz_attempts")
      .select("student_id, chapter_key, points")
      .eq("week_start", weekStart),
    client
      .from("weekly_prizes")
      .select("title, description")
      .eq("week_start", weekStart)
      .maybeSingle(),
  ]);
  if (attemptError) throw attemptError;

  const ids = [...new Set((attempts ?? []).map((attempt) => attempt.student_id))];
  const { data: profiles } = ids.length
    ? await client.from("profiles").select("id, full_name, level").in("id", ids)
    : { data: [] };

  return {
    ranking: rankWeeklyAttempts(attempts ?? [], profiles ?? []),
    prizeTitle: prize?.title ?? "Giải tuần",
    prizeDescription: prize?.description ?? DEFAULT_WEEKLY_PRIZE,
  };
}

export interface SaveAttemptInput {
  userId: string;
  chapter: GraphChapter;
  correctCount: number;
  weekStart: string;
  previousBest: number;
  /** Mặc định là lúc gọi; test truyền vào để cố định ngày. */
  now?: Date;
}

export interface SaveAttemptResult {
  saved: boolean;
  points: number;
  xp: number;
}

/**
 * Lưu một lần làm chương: ghi lần làm, cộng XP nếu vượt điểm cao nhất cũ, cập nhật hồ sơ
 * (XP, cấp, chuỗi ngày), và đăng bảng tin khi đạt điểm tối đa.
 */
export async function saveChapterAttempt(
  client: QuizClient,
  { userId, chapter, correctCount, weekStart, previousBest, now = new Date() }: SaveAttemptInput,
): Promise<SaveAttemptResult> {
  const finalPoints = correctCount * POINTS_PER_CORRECT;
  const { error } = await client.from("chapter_quiz_attempts").insert({
    student_id: userId,
    chapter_key: chapter.key,
    correct_count: correctCount,
    question_count: chapter.questions.length,
    points: finalPoints,
    week_start: weekStart,
  });
  if (error) return { saved: false, points: finalPoints, xp: 0 };

  const xp = attemptXp(finalPoints, previousBest);
  if (xp > 0) {
    await client.from("student_xp_log").insert({
      student_id: userId,
      xp_amount: xp,
      reason: "check_correct",
    });
  }

  const { data: profile } = await client
    .from("profiles")
    .select("xp_total, streak_current, streak_longest, last_active_date")
    .eq("id", userId)
    .single();
  if (profile) {
    const today = now.toISOString().slice(0, 10);
    const yesterday = new Date(now.getTime() - 86400000).toISOString().slice(0, 10);
    const streak = nextStreak(profile.last_active_date, profile.streak_current, today, yesterday);
    const xpTotal = (profile.xp_total ?? 0) + xp;
    await client
      .from("profiles")
      .update({
        xp_total: xpTotal,
        level: getLevelFromXp(xpTotal),
        streak_current: streak,
        streak_longest: Math.max(profile.streak_longest ?? 0, streak),
        last_active_date: today,
      })
      .eq("id", userId);
  }

  if (finalPoints === chapterMaxPoints(chapter)) {
    await client.from("social_feed_events").insert({
      student_id: userId,
      event_type: "chapter_complete",
      event_data_json: { title: chapter.title },
    });
  }

  return { saved: true, points: finalPoints, xp };
}
