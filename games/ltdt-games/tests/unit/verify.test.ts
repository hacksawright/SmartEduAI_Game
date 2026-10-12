import { describe, expect, it } from "vitest";
import { optimalGreedyOrder } from "../../src/core/algorithms/coloring";
import { findEulerTrail, analyzeEuler } from "../../src/core/algorithms/euler";
import { kruskal } from "../../src/core/algorithms/spanningTree";
import { createBfsEngine, type BfsAnswer } from "../../src/core/engines/bfsEngine";
import { createDijkstraEngine, type DijkstraAnswer } from "../../src/core/engines/dijkstraEngine";
import { creditFor, idempotencyKey, localIsoTimestamp } from "../../src/core/events";
import { initialOneStroke, oneStrokeStep, type OneStrokeAction } from "../../src/core/games/oneStroke";
import { targetKeys } from "../../src/core/games/matrixTranslate";
import { makeGraph, vertexIds } from "../../src/core/graph";
import { getLevel } from "../../src/core/registry";
import { algoOutcome, muddyOutcome, oneStrokeOutcome } from "../../src/core/scoring";
import { verifySubmission } from "../../src/core/verify";

function perfectBfs(levelId: string): BfsAnswer[] {
  const lv = getLevel(levelId)!;
  if (lv.game !== "traversal") throw new Error();
  const e = createBfsEngine(makeGraph(lv.graph), lv.start);
  const out: BfsAnswer[] = [];
  let s = e.init();
  while (!e.isDone(s)) {
    const a = e.expected(s)!;
    out.push(a);
    s = e.apply(s, a);
  }
  return out;
}

describe("scoring", () => {
  it("sao theo lỗi và gợi ý", () => {
    expect(algoOutcome({ questions: 12, mistakes: 0, hints: 0 })).toEqual({ stars: 3, score: 1000 });
    expect(algoOutcome({ questions: 12, mistakes: 1, hints: 0 }).stars).toBe(2);
    expect(algoOutcome({ questions: 12, mistakes: 0, hints: 1 }).stars).toBe(2);
    expect(algoOutcome({ questions: 12, mistakes: 2, hints: 2 }).stars).toBe(1);
    expect(oneStrokeOutcome({ mistakes: 3, hints: 0 }).stars).toBe(1);
  });
  it("Thành phố bùn: ngưỡng 10%", () => {
    expect(muddyOutcome({ cost: 20, optimal: 20, hints: 0 }).stars).toBe(3);
    expect(muddyOutcome({ cost: 22, optimal: 20, hints: 0 }).stars).toBe(2);
    expect(muddyOutcome({ cost: 23, optimal: 20, hints: 0 }).stars).toBe(1);
    expect(muddyOutcome({ cost: 20, optimal: 20, hints: 1 }).stars).toBe(2);
  });
});

describe("verifySubmission", () => {
  it("BFS chơi hoàn hảo → 3 sao", () => {
    const r = verifySubmission("ch2-bfs-01", { kind: "traversal", answers: perfectBfs("ch2-bfs-01"), hints: 0 });
    expect(r).toMatchObject({ ok: true, stars: 3, score: 1000 });
  });

  it("BFS sai 1 câu → 2 sao; sai 3 câu → hết mạng", () => {
    const ans = perfectBfs("ch2-bfs-01");
    const one = [{ type: "dequeue", v: "6" } as BfsAnswer, ...ans.slice(1)];
    expect(verifySubmission("ch2-bfs-01", { kind: "traversal", answers: one, hints: 0 })).toMatchObject({ ok: true, stars: 2 });
    const three = ans.map((a, i) => (i < 6 && a.type === "dequeue" ? ({ type: "dequeue", v: "9" } as BfsAnswer) : a));
    expect(verifySubmission("ch2-bfs-01", { kind: "traversal", answers: three, hints: 0 }).ok).toBe(false);
  });

  it("không cho gửi bài chưa xong hoặc sai loại game", () => {
    const ans = perfectBfs("ch2-bfs-01");
    expect(verifySubmission("ch2-bfs-01", { kind: "traversal", answers: ans.slice(0, 5), hints: 0 }).ok).toBe(false);
    expect(verifySubmission("ch2-bfs-01", { kind: "muddy_city", paved: [], hints: 0 }).ok).toBe(false);
    expect(verifySubmission("khong-co", { kind: "muddy_city", paved: [], hints: 0 }).ok).toBe(false);
  });

  it("chế độ đua phải thắng máy", () => {
    const answers = perfectBfs("ch2-bfs-01");
    expect(verifySubmission("ch2-bfs-01-race", { kind: "traversal", answers, hints: 0 }).ok).toBe(false);
    expect(
      verifySubmission("ch2-bfs-01-race", { kind: "traversal", answers, hints: 0, race: { won: true, elapsedMs: 30000 } }).ok,
    ).toBe(true);
  });

  it("Dijkstra hòa nhãn: chọn đỉnh nào cũng 3 sao", () => {
    const lv = getLevel("ch6-l02")!;
    if (lv.game !== "dijkstra") throw new Error();
    const e = createDijkstraEngine(makeGraph(lv.graph), lv.source);
    const answers: DijkstraAnswer[] = [];
    let s = e.init();
    while (!e.isDone(s)) {
      let a = e.expected(s)!;
      // luôn chọn đỉnh hòa nhãn có chỉ số LỚN nhất
      if (a.type === "select") {
        const m = Math.min(...Object.entries(s.d).filter(([v]) => !s.fixed.includes(v)).map(([, d]) => d));
        const cands = Object.keys(s.d).filter((v) => !s.fixed.includes(v) && s.d[v] === m);
        a = { type: "select", v: cands[cands.length - 1] };
      }
      answers.push(a);
      s = e.apply(s, e.check(s, a).expected);
    }
    expect(verifySubmission("ch6-l02", { kind: "dijkstra", answers, hints: 0 })).toMatchObject({ ok: true, stars: 3 });
  });

  it("Một nét vẽ: vẽ đúng đường Euler → 3 sao; bị kẹt rồi vẽ lại → 2 sao", () => {
    const lv = getLevel("ch3-l01")!;
    const g = makeGraph(lv.graph);
    const trail = findEulerTrail(g)!;
    const good: OneStrokeAction[] = trail.vertices.map((v) => ({ t: "tap", v }));
    expect(verifySubmission(lv.id, { kind: "one_stroke", actions: good, hints: 0 })).toMatchObject({ ok: true, stars: 3 });
    const stuck: OneStrokeAction[] = [{ t: "tap", v: "1" }, { t: "tap", v: "2" }, { t: "tap", v: "3" }, { t: "tap", v: "4" }];
    let s = initialOneStroke();
    for (const a of stuck) s = oneStrokeStep(g, s, a).state;
    expect(s.status).toBe("stuck");
    // kẹt lại đúng chỗ cũ không bị trừ thêm
    s = oneStrokeStep(g, s, { t: "undo" }).state;
    s = oneStrokeStep(g, s, { t: "tap", v: "4" }).state;
    expect(s.mistakes).toBe(1);
    const retry: OneStrokeAction[] = [...stuck, { t: "reset" }, ...good];
    expect(verifySubmission(lv.id, { kind: "one_stroke", actions: retry, hints: 0 })).toMatchObject({ ok: true, stars: 2 });
  });

  it("Một nét vẽ: Bất khả cần đúng bằng chứng", () => {
    const k4 = getLevel("ch3-l05")!;
    const odd = analyzeEuler(makeGraph(k4.graph)).odd;
    const wrong: OneStrokeAction = { t: "claim", disconnected: false, vertices: odd.slice(0, 2) };
    const right: OneStrokeAction = { t: "claim", disconnected: false, vertices: odd };
    expect(verifySubmission(k4.id, { kind: "one_stroke", actions: [right], hints: 0 })).toMatchObject({ ok: true, stars: 3 });
    expect(verifySubmission(k4.id, { kind: "one_stroke", actions: [wrong, right], hints: 0 })).toMatchObject({ ok: true, stars: 2 });
    const star = getLevel("ch3-l11")!;
    expect(verifySubmission(star.id, { kind: "one_stroke", actions: [{ t: "claim", disconnected: true, vertices: [] }], hints: 0 }).ok).toBe(true);
    const drawable = getLevel("ch3-l03")!;
    expect(verifySubmission(drawable.id, { kind: "one_stroke", actions: [{ t: "claim", disconnected: false, vertices: [] }], hints: 0 }).ok).toBe(false);
  });

  it("Thành phố bùn: cây Kruskal → 3 sao, thiếu đường khóa thì bị từ chối", () => {
    const lv = getLevel("ch7-l01")!;
    const g = makeGraph(lv.graph);
    const paved = kruskal(g).tree;
    expect(verifySubmission(lv.id, { kind: "muddy_city", paved, hints: 0 })).toMatchObject({ ok: true, stars: 3, score: 1000 });
    expect(verifySubmission(lv.id, { kind: "muddy_city", paved: paved.slice(1), hints: 0 }).ok).toBe(false);
    const m7 = getLevel("ch7-l07")!;
    const t7 = kruskal(makeGraph(m7.graph)).tree;
    expect(verifySubmission(m7.id, { kind: "muddy_city", paved: t7, hints: 0 }).ok).toBe(false);
  });

  it("Greedy: đếm số lần chạy tới khi đạt χ", () => {
    const lv = getLevel("ch5-l01")!;
    const g = makeGraph(lv.graph);
    const bad = vertexIds(g);
    const good = optimalGreedyOrder(g);
    expect(verifySubmission(lv.id, { kind: "greedy_order", runs: [good], hints: 0 })).toMatchObject({ ok: true, stars: 3 });
    expect(verifySubmission(lv.id, { kind: "greedy_order", runs: [bad, good], hints: 0 })).toMatchObject({ ok: true, stars: 2 });
    expect(verifySubmission(lv.id, { kind: "greedy_order", runs: [bad], hints: 0 }).ok).toBe(false);
    expect(verifySubmission(lv.id, { kind: "greedy_order", runs: [["1", "1"]], hints: 0 }).ok).toBe(false);
  });

  it("Dịch ma trận: đúng lần đầu, kịp giờ → 3 sao; quá giờ → 2 sao", () => {
    const lv = getLevel("ch1-l01")!;
    const answer = targetKeys(makeGraph(lv.graph));
    expect(verifySubmission(lv.id, { kind: "matrix_translate", checks: [{ answer, elapsedMs: 30000 }], hints: 0 })).toMatchObject({ ok: true, stars: 3 });
    expect(verifySubmission(lv.id, { kind: "matrix_translate", checks: [{ answer, elapsedMs: 90000 }], hints: 0 })).toMatchObject({ ok: true, stars: 2 });
    expect(verifySubmission(lv.id, { kind: "matrix_translate", checks: [{ answer: [], elapsedMs: 1 }], hints: 0 }).ok).toBe(false);
  });
});

describe("events", () => {
  it("idempotency key và cộng phần chênh lệch sao", () => {
    expect(idempotencyKey("u1", "one_stroke", "ch3-l07", 3)).toBe("u1:one_stroke:ch3-l07:3");
    expect(creditFor(0, 2)).toBe(20);
    expect(creditFor(2, 3)).toBe(10);
    expect(creditFor(3, 3)).toBe(0);
    expect(creditFor(3, 1)).toBe(0);
  });
  it("timestamp có múi giờ", () => {
    expect(localIsoTimestamp()).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d[+-]\d\d:\d\d$/);
  });
});
