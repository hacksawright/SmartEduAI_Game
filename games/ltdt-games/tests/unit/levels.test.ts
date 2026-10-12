// Kiểm tra dữ liệu mọi màn: đồ thị hợp lệ, vẽ rõ ràng, và đúng ý đồ thiết kế trong GDD.

import { describe, expect, it } from "vitest";
import { chromaticNumber, greedyColoring } from "../../src/core/algorithms/coloring";
import { analyzeEuler, findEulerTrail } from "../../src/core/algorithms/euler";
import { kruskal, prim } from "../../src/core/algorithms/spanningTree";
import { bfs } from "../../src/core/algorithms/traversal";
import { optimalCost } from "../../src/core/games/muddyCity";
import { makeGraph, vertexIds } from "../../src/core/graph";
import { allLevels, GAMES } from "../../src/core/registry";

const levels = allLevels();

function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

describe("dữ liệu chung", () => {
  it("id màn không trùng", () => {
    const ids = levels.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("số màn đúng GDD mục 10", () => {
    const count = (id: string) => GAMES.find((g) => g.id === id)!.levels.length;
    expect(count("traversal")).toBe(8);
    expect(count("dijkstra")).toBe(5);
    expect(count("one_stroke")).toBe(15);
    expect(count("muddy_city")).toBe(8);
    expect(count("greedy_order")).toBe(4);
    expect(count("matrix_translate")).toBe(5);
  });

  it("số thứ tự trong mỗi nhóm liên tục từ 1", () => {
    for (const g of GAMES) {
      for (const t of g.tracks) {
        const ns = g.levels.filter((l) => l.track === t.id).map((l) => l.n);
        expect(ns).toEqual(ns.map((_, i) => i + 1));
      }
    }
  });

  for (const lv of levels) {
    describe(lv.id, () => {
      const g = makeGraph(lv.graph);

      it("đỉnh cách nhau đủ xa và nằm trong khung", () => {
        for (const a of g.vertices) {
          expect(a.x).toBeGreaterThanOrEqual(40);
          expect(a.x).toBeLessThanOrEqual(820);
          expect(a.y).toBeGreaterThanOrEqual(30);
          expect(a.y).toBeLessThanOrEqual(470);
          for (const b of g.vertices) {
            if (a === b) continue;
            expect(Math.hypot(a.x - b.x, a.y - b.y), `${a.id}–${b.id}`).toBeGreaterThanOrEqual(100);
          }
        }
      });

      it("không cạnh nào đi sát qua đỉnh khác", () => {
        for (const e of g.edges) {
          const u = g.vertices.find((v) => v.id === e.u)!;
          const v = g.vertices.find((x) => x.id === e.v)!;
          for (const p of g.vertices) {
            if (p.id === e.u || p.id === e.v) continue;
            expect(segDist(p.x, p.y, u.x, u.y, v.x, v.y), `cạnh ${e.id} sát đỉnh ${p.id}`).toBeGreaterThanOrEqual(45);
          }
        }
      });

      it("không có cung ngược chiều trùng cặp đỉnh (khó nhìn)", () => {
        if (!g.directed) return;
        const set = new Set(g.edges.map((e) => `${e.u}>${e.v}`));
        for (const e of g.edges) expect(set.has(`${e.v}>${e.u}`), e.id).toBe(false);
      });
    });
  }
});

describe("Tôi là thuật toán", () => {
  for (const lv of levels) {
    if (lv.game !== "traversal") continue;
    it(`${lv.id}: đỉnh xuất phát có thật, đồ thị đủ lớn`, () => {
      const g = makeGraph(lv.graph);
      expect(vertexIds(g)).toContain(lv.start);
      expect(bfs(g, lv.start).order.length).toBeGreaterThanOrEqual(6);
    });
  }
});

describe("Một nét vẽ", () => {
  for (const lv of levels) {
    if (lv.game !== "one_stroke") continue;
    it(`${lv.id} (${lv.title}): loại đáp án đúng thiết kế`, () => {
      const g = makeGraph(lv.graph);
      const a = analyzeEuler(g);
      expect(a.kind).toBe(lv.expect);
      if (lv.expect !== "none") expect(findEulerTrail(g)).not.toBeNull();
      if (lv.show === "inout") expect(g.directed).toBe(true);
    });
  }

  it("màn 11 là bẫy: mọi đỉnh bậc chẵn nhưng không liên thông", () => {
    const lv = levels.find((l) => l.id === "ch3-l11")!;
    const a = analyzeEuler(makeGraph(lv.graph));
    expect(a.odd).toHaveLength(0);
    expect(a.connected).toBe(false);
  });

  it("màn 14 là bẫy: bỏ hướng thì vẽ được, có hướng thì không", () => {
    const lv = levels.find((l) => l.id === "ch3-l14")!;
    const g = makeGraph(lv.graph);
    expect(analyzeEuler({ ...g, directed: false }).kind).toBe("circuit");
    expect(analyzeEuler(g).kind).toBe("none");
  });

  it("hiện bậc đúng tiến trình mục 4.2", () => {
    const shows = levels.filter((l) => l.game === "one_stroke").map((l) => (l.game === "one_stroke" ? l.show : ""));
    expect(shows.slice(0, 4).every((s) => s === "none")).toBe(true);
    expect(shows.slice(4, 9).every((s) => s === "degree")).toBe(true);
    expect(shows.slice(9, 12).every((s) => s === "none")).toBe(true);
    expect(shows[12]).toBe("inout");
  });
});

describe("Thành phố bùn", () => {
  for (const lv of levels) {
    if (lv.game !== "muddy_city") continue;
    const g = makeGraph(lv.graph);
    it(`${lv.id}: mọi đường có chi phí, Kruskal = Prim`, () => {
      expect(g.edges.every((e) => typeof e.w === "number" && e.w > 0)).toBe(true);
      const rules = { forced: lv.locked ?? [], excluded: lv.broken ?? [] };
      expect(prim(g, g.vertices[0].id, rules).total).toBe(kruskal(g, rules).total);
      for (const id of [...(lv.locked ?? []), ...(lv.broken ?? [])]) expect(g.edges.map((e) => e.id)).toContain(id);
    });
  }

  it("M7: cạnh bắt buộc không nằm trong cây tối ưu khi không ràng buộc", () => {
    const lv = levels.find((l) => l.id === "ch7-l07")!;
    if (lv.game !== "muddy_city") throw new Error();
    const g = makeGraph(lv.graph);
    expect(kruskal(g).tree).not.toContain("B-E");
    expect(optimalCost(g, { locked: lv.locked!, broken: [] })).toBeGreaterThan(kruskal(g).total);
  });

  it("M8: đường khóa + đường hỏng đúng bằng cây khung nhỏ nhất của bản đồ gốc", () => {
    const lv = levels.find((l) => l.id === "ch7-l08")!;
    if (lv.game !== "muddy_city") throw new Error();
    const g = makeGraph(lv.graph);
    const mst = kruskal(g).tree.sort();
    expect([...lv.locked!, ...lv.broken!].sort()).toEqual(mst);
    expect(optimalCost(g, { locked: lv.locked!, broken: lv.broken! })).toBe(24);
  });

  it("M3 có nhiều cây tối ưu, các màn khác có một", () => {
    // đếm số cây khung tối ưu bằng cách thử loại từng cạnh của cây Kruskal
    const countOpt = (id: string) => {
      const lv = levels.find((l) => l.id === id)!;
      const g = makeGraph(lv.graph);
      const best = kruskal(g).total;
      return kruskal(g).tree.filter((e) => {
        const alt = kruskal(g, { excluded: [e] });
        return alt.tree.length === g.vertices.length - 1 && alt.total === best;
      }).length;
    };
    expect(countOpt("ch7-l03")).toBeGreaterThan(0);
    for (const id of ["ch7-l01", "ch7-l02", "ch7-l04", "ch7-l05", "ch7-l06"]) expect(countOpt(id), id).toBe(0);
  });
});

describe("Xếp thứ tự cho Greedy", () => {
  for (const lv of levels) {
    if (lv.game !== "greedy_order") continue;
    it(`${lv.id}: χ và số màu mặc định đúng như mô tả`, () => {
      const g = makeGraph(lv.graph);
      expect(chromaticNumber(g)).toBe(lv.chi);
      expect(greedyColoring(g, vertexIds(g)).count).toBe(lv.defaultColors);
      expect(lv.defaultColors).toBeGreaterThan(lv.chi);
    });
  }
});

describe("Dịch ma trận", () => {
  for (const lv of levels) {
    if (lv.game !== "matrix_translate") continue;
    it(`${lv.id}: đồ thị đơn, không khuyên`, () => {
      const g = makeGraph(lv.graph);
      const keys = g.edges.map((e) => (g.directed ? `${e.u}>${e.v}` : [e.u, e.v].sort().join("|")));
      expect(new Set(keys).size).toBe(keys.length);
      expect(g.edges.every((e) => e.u !== e.v)).toBe(true);
      expect(lv.par).toBeGreaterThan(0);
    });
  }
});
