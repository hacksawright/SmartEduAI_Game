import { describe, expect, it } from "vitest";
import { chapterByKey } from "@/lib/graph-chapters";
import { DEFAULT_WEEKLY_PRIZE } from "@/lib/week";
import {
  chapterBestKey,
  fetchChapterBest,
  fetchWeeklyLeaderboard,
  saveChapterAttempt,
  weeklyLeaderboardKey,
  type QuizClient,
} from "./api";

interface Call {
  table: string;
  action?: "select" | "insert" | "update";
  payload?: unknown;
  columns?: string;
  filters: [string, string, unknown][];
  modifier?: "single" | "maybeSingle";
}

type Respond = (call: Call) => { data: unknown; error: unknown };

/** Client giả: ghi lại từng lệnh PostgREST và trả kết quả theo hàm respond. */
function fakeClient(respond: Respond) {
  const calls: Call[] = [];
  const client = {
    from(table: string) {
      const call: Call = { table, filters: [] };
      calls.push(call);
      const builder = {
        select(columns: string) {
          call.action ??= "select";
          call.columns = columns;
          return builder;
        },
        insert(payload: unknown) {
          call.action = "insert";
          call.payload = payload;
          return builder;
        },
        update(payload: unknown) {
          call.action = "update";
          call.payload = payload;
          return builder;
        },
        eq(column: string, value: unknown) {
          call.filters.push(["eq", column, value]);
          return builder;
        },
        in(column: string, value: unknown) {
          call.filters.push(["in", column, value]);
          return builder;
        },
        single() {
          call.modifier = "single";
          return builder;
        },
        maybeSingle() {
          call.modifier = "maybeSingle";
          return builder;
        },
        then<T>(resolve: (value: { data: unknown; error: unknown }) => T) {
          return Promise.resolve(respond(call)).then(resolve);
        },
      };
      return builder;
    },
  };
  return { client: client as unknown as QuizClient, calls };
}

const chapter = chapterByKey("chuong-1")!;
const NOW = new Date("2026-10-12T03:00:00Z");

describe("saveChapterAttempt", () => {
  const profileRow = {
    xp_total: 80,
    streak_current: 2,
    streak_longest: 3,
    last_active_date: "2026-10-11",
  };
  const respond: Respond = (call) =>
    call.table === "profiles" && call.action === "select"
      ? { data: profileRow, error: null }
      : { data: null, error: null };

  it("ghi lần làm, XP, hồ sơ và bảng tin theo đúng thứ tự cũ khi đạt điểm tối đa", async () => {
    const { client, calls } = fakeClient(respond);
    const result = await saveChapterAttempt(client, {
      userId: "u1",
      chapter,
      correctCount: 5,
      weekStart: "2026-10-12",
      previousBest: 60,
      now: NOW,
    });

    expect(result).toEqual({ saved: true, points: 100, xp: 40 });
    expect(calls.map((c) => `${c.action} ${c.table}`)).toEqual([
      "insert chapter_quiz_attempts",
      "insert student_xp_log",
      "select profiles",
      "update profiles",
      "insert social_feed_events",
    ]);
    expect(calls[0].payload).toEqual({
      student_id: "u1",
      chapter_key: "chuong-1",
      correct_count: 5,
      question_count: 5,
      points: 100,
      week_start: "2026-10-12",
    });
    expect(calls[1].payload).toEqual({ student_id: "u1", xp_amount: 40, reason: "check_correct" });
    expect(calls[2]).toMatchObject({
      columns: "xp_total, streak_current, streak_longest, last_active_date",
      filters: [["eq", "id", "u1"]],
      modifier: "single",
    });
    expect(calls[3]).toMatchObject({
      payload: {
        xp_total: 120,
        level: 2,
        streak_current: 3,
        streak_longest: 3,
        last_active_date: "2026-10-12",
      },
      filters: [["eq", "id", "u1"]],
    });
    expect(calls[4].payload).toEqual({
      student_id: "u1",
      event_type: "chapter_complete",
      event_data_json: { title: chapter.title },
    });
  });

  it("không vượt điểm cũ: không ghi XP, vẫn cập nhật hồ sơ, không đăng bảng tin", async () => {
    const { client, calls } = fakeClient(respond);
    const result = await saveChapterAttempt(client, {
      userId: "u1",
      chapter,
      correctCount: 3,
      weekStart: "2026-10-12",
      previousBest: 80,
      now: NOW,
    });
    expect(result).toEqual({ saved: true, points: 60, xp: 0 });
    expect(calls.map((c) => `${c.action} ${c.table}`)).toEqual([
      "insert chapter_quiz_attempts",
      "select profiles",
      "update profiles",
    ]);
    expect(calls[2].payload).toMatchObject({ xp_total: 80, level: 1, streak_current: 3 });
  });

  it("ghi lần làm lỗi (chưa chạy migration): dừng ngay, không ghi gì thêm", async () => {
    const { client, calls } = fakeClient((call) =>
      call.table === "chapter_quiz_attempts"
        ? { data: null, error: { message: "relation does not exist" } }
        : { data: null, error: null },
    );
    const result = await saveChapterAttempt(client, {
      userId: "u1",
      chapter,
      correctCount: 5,
      weekStart: "2026-10-12",
      previousBest: 0,
      now: NOW,
    });
    expect(result).toEqual({ saved: false, points: 100, xp: 0 });
    expect(calls).toHaveLength(1);
  });
});

describe("đọc điểm", () => {
  it("fetchChapterBest lọc theo học sinh và tuần, lấy điểm cao nhất từng chương", async () => {
    const { client, calls } = fakeClient(() => ({
      data: [
        { chapter_key: "chuong-1", points: 40 },
        { chapter_key: "chuong-1", points: 80 },
      ],
      error: null,
    }));
    await expect(fetchChapterBest(client, "u1", "2026-10-12")).resolves.toEqual({
      "chuong-1": 80,
    });
    expect(calls[0]).toMatchObject({
      table: "chapter_quiz_attempts",
      columns: "chapter_key, points",
      filters: [
        ["eq", "student_id", "u1"],
        ["eq", "week_start", "2026-10-12"],
      ],
    });
  });

  it("fetchChapterBest báo lỗi để giao diện hiện thông báo migration", async () => {
    const { client } = fakeClient(() => ({ data: null, error: { message: "missing" } }));
    await expect(fetchChapterBest(client, "u1", "2026-10-12")).rejects.toEqual({
      message: "missing",
    });
  });

  it("fetchWeeklyLeaderboard ghép hồ sơ và dùng giải mặc định khi tuần chưa có giải", async () => {
    const { client, calls } = fakeClient((call) => {
      if (call.table === "chapter_quiz_attempts") {
        return {
          data: [
            { student_id: "a", chapter_key: "chuong-1", points: 100 },
            { student_id: "b", chapter_key: "chuong-1", points: 60 },
            { student_id: "a", chapter_key: "chuong-2", points: 20 },
          ],
          error: null,
        };
      }
      if (call.table === "weekly_prizes") return { data: null, error: null };
      return {
        data: [
          { id: "a", full_name: "An", level: 2 },
          { id: "b", full_name: "Bình", level: 4 },
        ],
        error: null,
      };
    });
    const board = await fetchWeeklyLeaderboard(client, "2026-10-12");
    expect(board.prizeTitle).toBe("Giải tuần");
    expect(board.prizeDescription).toBe(DEFAULT_WEEKLY_PRIZE);
    expect(board.ranking.map((s) => [s.id, s.full_name, s.points, s.level])).toEqual([
      ["a", "An", 120, 2],
      ["b", "Bình", 60, 4],
    ]);
    expect(calls.find((c) => c.table === "weekly_prizes")?.modifier).toBe("maybeSingle");
    expect(calls.find((c) => c.table === "profiles")?.filters).toEqual([["in", "id", ["a", "b"]]]);
  });

  it("tuần chưa có lần làm nào thì không truy vấn hồ sơ", async () => {
    const { client, calls } = fakeClient((call) =>
      call.table === "weekly_prizes"
        ? { data: { title: "Áo SmartEdu", description: "Quà cho hạng 1" }, error: null }
        : { data: [], error: null },
    );
    const board = await fetchWeeklyLeaderboard(client, "2026-10-12");
    expect(board).toEqual({
      ranking: [],
      prizeTitle: "Áo SmartEdu",
      prizeDescription: "Quà cho hạng 1",
    });
    expect(calls.some((c) => c.table === "profiles")).toBe(false);
  });

  it("khóa cache giữ nguyên như trước", () => {
    expect(chapterBestKey("u1", "2026-10-12")).toEqual(["chapter-best", "u1", "2026-10-12"]);
    expect(weeklyLeaderboardKey("2026-10-12")).toEqual(["weekly-leaderboard", "2026-10-12"]);
  });
});
