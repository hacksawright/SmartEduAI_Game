// Dịch vụ phía client khi nối với SmartEduAI: gộp tiến độ từ server, gọi API kèm token xác thực.

import { afterEach, describe, expect, it, vi } from "vitest";
import { httpSink } from "../../src/services/analytics";
import { SocraticHintProvider } from "../../src/services/hints";
import { HttpPointsClient } from "../../src/services/points";
import { emptyProgress, isUnlocked, mergeRemote, recordComplete } from "../../src/services/progress";

describe("gộp tiến độ từ server (đổi máy)", () => {
  it("lấy số sao và điểm cao hơn của mỗi màn, nhờ đó mở màn kế tiếp", () => {
    const local = recordComplete(emptyProgress(), "ch6-l01", { stars: 1, score: 400, hints: 2, durationMs: 1000 });
    const merged = mergeRemote(
      local,
      {
        total: 70,
        levels: { "ch6-l01": { best_stars: 3, best_score: 950 }, "ch6-l02": { best_stars: 2, best_score: 700 } },
      },
      { points: true },
    );
    expect(merged.levels["ch6-l01"]).toMatchObject({ bestStars: 3, bestScore: 950, completions: 1 });
    expect(merged.levels["ch6-l02"]).toMatchObject({ bestStars: 2, bestScore: 700, completions: 1, attempts: 0 });
    expect(merged.points).toBe(70);
    expect(isUnlocked(local, "ch6-l03")).toBe(false);
    expect(isUnlocked(merged, "ch6-l03")).toBe(true);
    expect(isUnlocked(merged, "ch6-l02-race")).toBe(true);
  });

  it("không hạ số sao trên máy; bỏ qua id lạ và giá trị ngoài khoảng", () => {
    const local = recordComplete(emptyProgress(), "ch3-l01", { stars: 3, score: 1000, hints: 0, durationMs: 1000 });
    const merged = mergeRemote(
      local,
      {
        total: 30,
        levels: {
          "ch3-l01": { best_stars: 1, best_score: 300 },
          "khong-co-man-nay": { best_stars: 3, best_score: 1000 },
          "ch3-l02": { best_stars: 9, best_score: -5 },
        },
      },
      { points: true },
    );
    expect(merged.levels["ch3-l01"]).toEqual(local.levels["ch3-l01"]);
    expect(merged.levels["khong-co-man-nay"]).toBeUndefined();
    expect(merged.levels["ch3-l02"]).toMatchObject({ bestStars: 3, bestScore: 0 });
  });

  it("giữ tổng điểm trên máy khi số của server đã cũ; không đổi gì thì trả lại object cũ", () => {
    const local = { ...emptyProgress(), points: 40 };
    expect(mergeRemote(local, { total: 30, levels: {} }, { points: false })).toBe(local);
    expect(mergeRemote(local, { total: 40, levels: {} }, { points: true })).toBe(local);
    expect(mergeRemote(local, { total: 50, levels: {} }, { points: true }).points).toBe(50);
  });
});

describe("gọi API kèm token xác thực", () => {
  afterEach(() => vi.unstubAllGlobals());

  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

  it("GET /progress gửi token, mã hóa user_id và đọc tiến độ", async () => {
    const levels = { "ch6-l01": { best_stars: 2, best_score: 800 } };
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => json({ points_total: 20, levels }));
    vi.stubGlobal("fetch", fetchMock);
    const client = new HttpPointsClient("/api/v1/", "sv 01", () => "tok");
    await expect(client.fetchProgress()).resolves.toEqual({ total: 20, levels });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/progress?user_id=sv%2001");
    expect(init?.headers).toEqual({ Authorization: "Bearer tok" });
  });

  it("GET /progress lỗi, sai dạng hoặc mất mạng thì trả null (game vẫn chạy bằng tiến độ trên máy)", async () => {
    const client = new HttpPointsClient("/api/v1", "sv-01");
    vi.stubGlobal("fetch", vi.fn(async () => json({}, 500)));
    expect(await client.fetchProgress()).toBeNull();
    vi.stubGlobal("fetch", vi.fn(async () => json({ levels: {} })));
    expect(await client.fetchProgress()).toBeNull();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("offline");
      }),
    );
    expect(await client.fetchProgress()).toBeNull();
  });

  it("gợi ý Socratic và analytics cũng gắn token", async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => json({ text: "Đỉnh nào đang có nhãn nhỏ nhất?" }));
    vi.stubGlobal("fetch", fetchMock);
    const hint = await new SocraticHintProvider("/hint", async () => "tok").getHint({
      courseId: "LTDT",
      chapterId: "ch6",
      gameId: "dijkstra",
      levelId: "ch6-l01",
      hintLevel: 1,
      state: "",
      fallback: { text: "gợi ý tĩnh" },
    });
    expect(hint.text).toBe("Đỉnh nào đang có nhãn nhỏ nhất?");
    expect(fetchMock.mock.calls[0][1]?.headers).toEqual({ "Content-Type": "application/json", Authorization: "Bearer tok" });

    httpSink("/api/v1/", () => "tok")("game_hint_used", { level_id: "ch6-l01" });
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe("/api/v1/analytics");
    expect(init?.headers).toEqual({ "Content-Type": "application/json", Authorization: "Bearer tok" });
    expect(JSON.parse(String(init?.body))).toMatchObject({ event: "game_hint_used", level_id: "ch6-l01" });
  });

  it("không có token thì không gửi header Authorization", async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => json({ points_total: 0, levels: {} }));
    vi.stubGlobal("fetch", fetchMock);
    await new HttpPointsClient("/api/v1", "sv-01").fetchProgress();
    expect(fetchMock.mock.calls[0][1]?.headers).toEqual({});
  });
});
