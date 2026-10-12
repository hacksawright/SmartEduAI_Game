import { describe, expect, it } from "vitest";
import { createBfsEngine } from "../../src/core/engines/bfsEngine";
import { createDfsEngine } from "../../src/core/engines/dfsEngine";
import { createDijkstraEngine } from "../../src/core/engines/dijkstraEngine";
import type { PredictionEngine } from "../../src/core/engines/types";
import { makeGraph } from "../../src/core/graph";
import { dijkstraLevels } from "../../src/core/levels/dijkstra";
import { traversalLevels } from "../../src/core/levels/traversal";
import { dijkstra } from "../../src/core/algorithms/shortestPath";
import { bfs, dfs } from "../../src/core/algorithms/traversal";

/** Chạy engine bằng chính đáp án chuẩn của nó. */
function autoplay<S, A>(e: PredictionEngine<S, A>) {
  let s = e.init();
  let n = 0;
  while (!e.isDone(s)) {
    const a = e.expected(s)!;
    const v = e.check(s, a);
    expect(v.correct).toBe(true);
    s = e.apply(s, v.expected);
    if (++n > 500) throw new Error("vòng lặp vô hạn");
  }
  return { s, n };
}

describe("BFS engine", () => {
  for (const lv of traversalLevels.filter((l) => l.algo === "bfs")) {
    it(`${lv.id}: tự chơi khớp thứ tự BFS tham chiếu`, () => {
      const g = makeGraph(lv.graph);
      const e = createBfsEngine(g, lv.start);
      const { s, n } = autoplay(e);
      expect(s.done).toEqual(bfs(g, lv.start).order);
      expect(n).toBe(e.referenceQuestionCount());
    });
  }

  it("BFS 1: bắt lỗi thứ tự và đỉnh đã thăm", () => {
    const lv = traversalLevels[0];
    const e = createBfsEngine(makeGraph(lv.graph), lv.start);
    let s = e.init();
    expect(e.check(s, { type: "dequeue", v: "2" }).correct).toBe(false);
    s = e.apply(s, { type: "dequeue", v: "1" });
    const wrongOrder = e.check(s, { type: "enqueue", vs: ["3", "2"] });
    expect(wrongOrder.correct).toBe(false);
    expect(wrongOrder.explain).toContain("thứ tự");
    s = e.apply(s, { type: "enqueue", vs: ["2", "3"] });
    s = e.apply(s, { type: "dequeue", v: "2" });
    s = e.apply(s, { type: "enqueue", vs: ["4"] });
    s = e.apply(s, { type: "dequeue", v: "3" });
    const visited = e.check(s, { type: "enqueue", vs: ["4", "5"] });
    expect(visited.correct).toBe(false);
    expect(visited.explain).toContain("đã được đánh dấu");
    expect(e.hint(s, 2).highlight).toEqual(["1", "4", "5"]);
  });

  it("BFS 4 (có hướng): không đưa đỉnh qua cung đi vào", () => {
    const lv = traversalLevels.find((l) => l.id === "ch2-bfs-04")!;
    const g = makeGraph(lv.graph);
    const e = createBfsEngine(g, lv.start);
    let s = e.init();
    while (!(s.phase === "enqueue" && s.current === "7")) s = e.apply(s, e.expected(s)!);
    expect(e.expected(s)).toEqual({ type: "enqueue", vs: ["9"] });
    expect(e.check(s, { type: "enqueue", vs: ["9", "11"] }).correct).toBe(false);
  });
});

describe("DFS engine", () => {
  for (const lv of traversalLevels.filter((l) => l.algo === "dfs")) {
    it(`${lv.id}: tự chơi khớp thứ tự DFS tham chiếu`, () => {
      const g = makeGraph(lv.graph);
      const e = createDfsEngine(g, lv.start);
      const { s, n } = autoplay(e);
      expect(s.visited).toEqual(dfs(g, lv.start).order);
      expect(n).toBe(e.referenceQuestionCount());
    });
  }

  it("DFS 4: đỉnh 11 không tới được", () => {
    const lv = traversalLevels.find((l) => l.id === "ch2-dfs-04")!;
    const e = createDfsEngine(makeGraph(lv.graph), lv.start);
    const { s } = autoplay(e);
    expect(s.visited).not.toContain("11");
    expect(s.visited).toHaveLength(11);
  });

  it("lấy ra sớm là sai", () => {
    const lv = traversalLevels.find((l) => l.id === "ch2-dfs-01")!;
    const e = createDfsEngine(makeGraph(lv.graph), lv.start);
    const v = e.check(e.init(), { type: "pop" });
    expect(v.correct).toBe(false);
    expect(v.expected).toEqual({ type: "push", v: "2" });
  });
});

describe("Dijkstra engine", () => {
  for (const lv of dijkstraLevels) {
    it(`${lv.id}: tự chơi ra đúng nhãn cuối`, () => {
      const g = makeGraph(lv.graph);
      const e = createDijkstraEngine(g, lv.source);
      const { s, n } = autoplay(e);
      const ref = dijkstra(g, lv.source);
      for (const v of g.vertices) expect(s.d[v.id]).toBe(ref.d[v.id]);
      expect(n).toBe(e.referenceQuestionCount());
    });
  }

  it("D2: hòa nhãn thì chấp nhận mọi lựa chọn và đi theo lựa chọn của SV", () => {
    const lv = dijkstraLevels.find((l) => l.id === "ch6-l02")!;
    const g = makeGraph(lv.graph);
    const e = createDijkstraEngine(g, lv.source);
    let s = e.init();
    s = e.apply(s, { type: "select", v: "A" });
    s = e.apply(s, e.expected(s)!);
    const v = e.check(s, { type: "select", v: "C" });
    expect(v.correct).toBe(true);
    s = e.apply(s, v.expected);
    expect(s.current).toBe("C");
    expect(e.check(s, { type: "select", v: "B" }).correct).toBe(false); // đang ở bước cập nhật
  });

  it("cập nhật: bỏ trống = giữ nguyên, sai thì có lời giải từng dòng", () => {
    const lv = dijkstraLevels[0];
    const e = createDijkstraEngine(makeGraph(lv.graph), lv.source);
    let s = e.init();
    s = e.apply(s, { type: "select", v: "A" });
    expect(e.check(s, { type: "relax", values: { B: 4, C: 1 } }).correct).toBe(true);
    const bad = e.check(s, { type: "relax", values: { B: 4 } });
    expect(bad.correct).toBe(false);
    expect(bad.explain.replace(/\u00a0/g, " ")).toContain("0 + 1 = 1 < ∞ → d[C] = 1, pred = A");
  });

  it("bỏ qua bước cập nhật khi không còn đỉnh kề chưa cố định", () => {
    const lv = dijkstraLevels[0];
    const e = createDijkstraEngine(makeGraph(lv.graph), lv.source);
    let s = e.init();
    while (!e.isDone(s)) {
      const before = s.fixed.length;
      s = e.apply(s, e.expected(s)!);
      if (s.fixed.length > before && s.fixed.at(-1) === "E") expect(s.phase).toBe("done");
    }
  });
});
