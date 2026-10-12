import { describe, expect, it } from "vitest";
import { GRAPH_CHAPTERS } from "@/lib/graph-chapters";
import {
  attemptXp,
  bestByChapter,
  chapterMaxPoints,
  gapToNextRank,
  initialOf,
  isCountedForWeek,
  nextStreak,
  rankWeeklyAttempts,
  rankingWindow,
  weekPoints,
  type RankedStudent,
} from "./scoring";

describe("điểm chương và điểm tuần", () => {
  it("mỗi chương 5 câu × 20 điểm, cả tuần tối đa 800", () => {
    expect(GRAPH_CHAPTERS).toHaveLength(8);
    for (const chapter of GRAPH_CHAPTERS) expect(chapterMaxPoints(chapter)).toBe(100);
    expect(GRAPH_CHAPTERS.reduce((sum, c) => sum + chapterMaxPoints(c), 0)).toBe(800);
  });

  it("mỗi chương chỉ lấy lần điểm cao nhất, điểm tuần là tổng", () => {
    const best = bestByChapter([
      { chapter_key: "chuong-1", points: 60 },
      { chapter_key: "chuong-1", points: 100 },
      { chapter_key: "chuong-1", points: 40 },
      { chapter_key: "chuong-2", points: 0 },
      { chapter_key: "chuong-3", points: 80 },
    ]);
    expect(best).toEqual({ "chuong-1": 100, "chuong-2": 0, "chuong-3": 80 });
    expect(weekPoints(best)).toBe(180);
    expect(weekPoints({})).toBe(0);
  });

  it("XP chỉ tính phần vượt điểm cao nhất cũ", () => {
    expect(attemptXp(80, 0)).toBe(80);
    expect(attemptXp(80, 60)).toBe(20);
    expect(attemptXp(60, 80)).toBe(0);
    expect(attemptXp(80, 80)).toBe(0);
  });

  it("lần làm được tính khi đạt hoặc vượt điểm cao nhất cũ", () => {
    expect(isCountedForWeek(80, 60)).toBe(true);
    expect(isCountedForWeek(60, 60)).toBe(true);
    expect(isCountedForWeek(40, 60)).toBe(false);
    expect(isCountedForWeek(null, 0)).toBe(false);
  });

  it("chuỗi ngày: giữ nếu hôm nay đã học, +1 nếu hôm qua có học, còn lại về 1", () => {
    expect(nextStreak("2026-10-12", 4, "2026-10-12", "2026-10-11")).toBe(4);
    expect(nextStreak("2026-10-11", 4, "2026-10-12", "2026-10-11")).toBe(5);
    expect(nextStreak("2026-10-01", 4, "2026-10-12", "2026-10-11")).toBe(1);
    expect(nextStreak(null, 0, "2026-10-12", "2026-10-11")).toBe(1);
  });
});

describe("xếp hạng tuần", () => {
  const attempts = [
    { student_id: "a", chapter_key: "chuong-1", points: 100 },
    { student_id: "a", chapter_key: "chuong-1", points: 40 },
    { student_id: "a", chapter_key: "chuong-2", points: 0 },
    { student_id: "b", chapter_key: "chuong-1", points: 60 },
    { student_id: "b", chapter_key: "chuong-2", points: 40 },
    { student_id: "c", chapter_key: "chuong-3", points: 100 },
    { student_id: "d", chapter_key: "chuong-4", points: 20 },
  ];
  const profiles = [
    { id: "a", full_name: "Trần Bình", level: 3 },
    { id: "b", full_name: "Lê An", level: 2 },
    { id: "c", full_name: "  ", level: null },
  ];

  it("cộng điểm cao nhất từng chương, sắp giảm dần, bằng điểm thì theo tên tiếng Việt", () => {
    const ranking = rankWeeklyAttempts(attempts, profiles);
    // cùng 100 điểm: "Học sinh" (tên trống của c) < "Lê An" < "Trần Bình"
    expect(ranking.map((s) => [s.id, s.points, s.chaptersDone])).toEqual([
      ["c", 100, 1],
      ["b", 100, 2],
      ["a", 100, 1],
      ["d", 20, 1],
    ]);
    expect(ranking.find((s) => s.id === "c")?.level).toBe(1);
    expect(ranking.find((s) => s.id === "d")?.full_name).toBeNull();
  });

  it("không có lần làm nào thì bảng trống", () => {
    expect(rankWeeklyAttempts([], profiles)).toEqual([]);
  });

  const many: RankedStudent[] = Array.from({ length: 12 }, (_, i) => ({
    id: `s${i}`,
    full_name: `Học sinh ${i}`,
    level: 1,
    points: 600 - i * 40,
    chaptersDone: 1,
  }));

  it("'Quanh vị trí của bạn' giữ đúng công thức cũ và hạng thật", () => {
    expect(rankingWindow(many, -1)).toEqual([]);
    expect(rankingWindow(many, 2)).toEqual([]);
    // bạn hạng 8 (myIdx 7): 2 người trên, bạn, 4 người dưới
    expect(rankingWindow(many, 7).map((r) => [r.student.id, r.rank])).toEqual([
      ["s5", 6],
      ["s6", 7],
      ["s7", 8],
      ["s8", 9],
      ["s9", 10],
      ["s10", 11],
      ["s11", 12],
    ]);
    // hạng thật luôn bằng vị trí trong bảng + 1
    for (let myIdx = 3; myIdx < many.length; myIdx++) {
      for (const { student, rank } of rankingWindow(many, myIdx)) {
        expect(many.indexOf(student) + 1).toBe(rank);
      }
    }
  });

  it("khoảng cách tới người ngay trên", () => {
    expect(gapToNextRank(many, 0)).toBeNull();
    expect(gapToNextRank(many, -1)).toBeNull();
    expect(gapToNextRank(many, 3)).toEqual({ above: many[2], rank: 3, gap: 40 });
  });

  it("chữ cái đại diện lấy từ tên gọi", () => {
    expect(initialOf("Nguyễn Văn An")).toBe("A");
    expect(initialOf("đạt")).toBe("Đ");
    expect(initialOf("  ")).toBe("?");
  });
});
