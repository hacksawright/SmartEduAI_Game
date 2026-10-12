import { describe, expect, it } from "vitest";
import { chromaticNumber, greedyColoring, optimalGreedyOrder } from "../../src/core/algorithms/coloring";
import { analyzeEuler, findEulerTrail } from "../../src/core/algorithms/euler";
import { dijkstra } from "../../src/core/algorithms/shortestPath";
import { kruskal, prim } from "../../src/core/algorithms/spanningTree";
import { bfs, dfs } from "../../src/core/algorithms/traversal";
import { makeGraph } from "../../src/core/graph";

const sq = (edges: string, directed = false) =>
  makeGraph({
    directed,
    vertices: [
      ["1", 0, 0],
      ["2", 100, 0],
      ["3", 100, 100],
      ["4", 0, 100],
      ["5", 50, 200],
    ],
    edges,
  });

describe("makeGraph", () => {
  it("đánh id cho cạnh lặp", () => {
    const g = sq("1-2 1-2 2-3");
    expect(g.edges.map((e) => e.id)).toEqual(["1-2", "1-2~2", "2-3"]);
  });
  it("đọc trọng số", () => {
    const g = sq("1-2:5");
    expect(g.edges[0].w).toBe(5);
  });
  it("báo lỗi khi cạnh trỏ tới đỉnh không có", () => {
    expect(() => sq("1-9")).toThrow();
  });
});

describe("BFS / DFS", () => {
  const g = sq("1-2 1-4 2-3 3-4 3-5");
  it("BFS thăm theo lớp, đỉnh kề tăng dần", () => {
    const r = bfs(g, "1");
    expect(r.order).toEqual(["1", "2", "4", "3", "5"]);
    expect(r.dist).toEqual({ "1": 0, "2": 1, "4": 1, "3": 2, "5": 3 });
  });
  it("DFS trùng thứ tự đệ quy", () => {
    const r = dfs(g, "1");
    expect(r.order).toEqual(["1", "2", "3", "4", "5"]);
    expect(r.steps.filter((s) => s.kind === "pop")).toHaveLength(5);
  });
  it("có hướng: chỉ đi theo cung ra", () => {
    const d = sq("1-2 3-2 3-4", true);
    expect(bfs(d, "1").order).toEqual(["1", "2"]);
  });
});

describe("Dijkstra", () => {
  it("tính đúng d và pred", () => {
    const g = makeGraph({
      vertices: [
        ["A", 0, 0],
        ["B", 1, 0],
        ["C", 2, 0],
        ["D", 3, 0],
      ],
      edges: "A-B:4 A-C:1 C-B:2 B-D:5 C-D:8",
    });
    const r = dijkstra(g, "A");
    expect(r.d).toEqual({ A: 0, B: 3, C: 1, D: 8 });
    expect(r.pred.B).toBe("C");
    expect(r.fixedOrder).toEqual(["A", "C", "B", "D"]);
  });
});

describe("Euler", () => {
  it("phân loại chu trình / đường đi / không có", () => {
    expect(analyzeEuler(sq("1-2 2-3 3-4 4-1")).kind).toBe("circuit");
    expect(analyzeEuler(sq("1-2 2-3 3-4")).kind).toBe("path");
    expect(analyzeEuler(sq("1-2 1-3 1-4 2-3 2-4 3-4")).kind).toBe("none");
  });
  it("bỏ qua đỉnh cô lập khi xét liên thông", () => {
    expect(analyzeEuler(sq("1-2 2-3 3-1")).kind).toBe("circuit");
  });
  it("không liên thông thì không có", () => {
    const a = analyzeEuler(sq("1-2 1-2 3-4"));
    expect(a.connected).toBe(false);
  });
  it("có hướng: cặp +1/−1", () => {
    const a = analyzeEuler(sq("1-2 2-3 3-1 1-4", true));
    expect(a.kind).toBe("path");
    expect(a.starts).toEqual(["1"]);
    expect(a.ends).toEqual(["4"]);
  });
  it("Hierholzer đi hết mọi cạnh", () => {
    const g = sq("1-2 2-3 3-4 4-1 1-3 2-4 3-5 4-5");
    const t = findEulerTrail(g)!;
    expect(t.edges).toHaveLength(g.edges.length);
    expect(new Set(t.edges).size).toBe(g.edges.length);
  });
});

describe("Cây khung", () => {
  const g = makeGraph({
    vertices: [
      ["A", 0, 0],
      ["B", 1, 0],
      ["C", 2, 0],
      ["D", 3, 0],
    ],
    edges: "A-B:1 B-C:2 A-C:3 C-D:1 B-D:5",
  });
  it("Kruskal và Prim cho cùng tổng", () => {
    expect(kruskal(g).total).toBe(4);
    expect(prim(g, "A").total).toBe(4);
  });
  it("cạnh bắt buộc và cạnh bị loại", () => {
    expect(kruskal(g, { forced: ["B-D"] }).total).toBe(1 + 5 + 1);
    expect(kruskal(g, { excluded: ["B-C"] }).total).toBe(1 + 3 + 1);
    expect(prim(g, "D", { forced: ["B-D"] }).total).toBe(7);
  });
});

describe("Tô màu", () => {
  it("χ của chu trình lẻ là 3, chẵn là 2", () => {
    expect(chromaticNumber(sq("1-2 2-3 3-4 4-5 5-1"))).toBe(3);
    expect(chromaticNumber(sq("1-2 2-3 3-4 4-1"))).toBe(2);
  });
  it("thứ tự tối ưu giúp Greedy đạt χ", () => {
    const g = sq("1-2 2-3 3-4 4-5 5-1 1-3");
    expect(greedyColoring(g, optimalGreedyOrder(g)).count).toBe(chromaticNumber(g));
  });
});
