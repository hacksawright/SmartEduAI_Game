// Logic phía giao diện của các game (gợi ý, cảnh báo), tách khỏi React để kiểm thử.

import { describe, expect, it } from "vitest";
import { chromaticNumber, greedyColoring, undirectedNeighbors } from "../../src/core/algorithms/coloring";
import { orderFromPicked } from "../../src/core/games/greedyOrder";
import { compareKeys, edgeKey, targetKeys, toggleKey } from "../../src/core/games/matrixTranslate";
import { analyzeMuddy, optimalCost } from "../../src/core/games/muddyCity";
import { makeGraph, vertexIds } from "../../src/core/graph";
import type { GreedyLevel, MatrixLevel, MuddyLevel } from "../../src/core/levels/types";
import { allLevels } from "../../src/core/registry";
import { findClique, firstOverflow, greedyHint, greedyTrace, hintPlan, optimalClasses } from "../../src/games/greedy/logic";
import { cellOn, diffKeys, diffText, drawnGraph, keyEnds, keyName, matrixHint } from "../../src/games/matrix/logic";
import { cheapestBridge, findCycle, improvingSwap, muddyHint } from "../../src/games/muddy/logic";

const muddy = allLevels().filter((l): l is MuddyLevel => l.game === "muddy_city");
const byId = (id: string) => muddy.find((l) => l.id === id)!;
const rulesOf = (l: MuddyLevel) => ({ locked: l.locked ?? [], broken: l.broken ?? [] });

describe("Thành phố bùn: vòng thừa và gợi ý", () => {
  const l1 = byId("ch7-l01");
  const g1 = makeGraph(l1.graph);
  const r1 = rulesOf(l1);

  it("tìm vòng chứa đường vừa lát", () => {
    const c = findCycle(g1, ["C-E", "A-C", "A-B", "B-C"]);
    expect(c).not.toBeNull();
    expect([...c!.vertices].sort()).toEqual(["A", "B", "C"]);
    expect([...c!.edges].sort()).toEqual(["A-B", "A-C", "B-C"]);
    expect(findCycle(g1, ["C-E", "A-C", "B-C"])).toBeNull();
  });

  it("gợi ý mức 2: bỏ đường đắt nhất trên vòng", () => {
    const h = muddyHint(g1, r1, ["C-E", "A-C", "A-B", "B-C"], 2);
    expect(h.highlight).toEqual(["A-B"]);
  });

  it("gợi ý mức 2: đường rẻ nhất nối hai nhóm nhà", () => {
    expect(cheapestBridge(g1, r1, [])?.id).toBe("C-E");
    expect(muddyHint(g1, r1, ["C-E"], 2).highlight).toEqual(["A-C"]);
  });

  it("cây khung chưa tối ưu: chỉ ra cặp đổi làm giảm chi phí", () => {
    const tree = ["A-B", "A-C", "C-D", "C-E"]; // 16, tối ưu 14
    expect(analyzeMuddy(g1, tree).spanning).toBe(true);
    const s = improvingSwap(g1, r1, tree);
    expect(s?.add.id).toBe("B-C");
    expect(s?.remove.id).toBe("A-B");
    expect(muddyHint(g1, r1, tree, 2).highlight).toEqual(["B-C"]);
  });

  it("cây khung tối ưu: không còn cặp đổi, gợi ý không tô sáng", () => {
    const best = ["C-E", "A-C", "B-C", "C-D"];
    expect(improvingSwap(g1, r1, best)).toBeNull();
    expect(muddyHint(g1, r1, best, 2).highlight).toBeUndefined();
  });

  it("màn đường hỏng: gợi ý đường thay thế rẻ nhất, không bao giờ là đường hỏng", () => {
    const l8 = byId("ch7-l08");
    const g8 = makeGraph(l8.graph);
    const r8 = rulesOf(l8);
    const b = cheapestBridge(g8, r8, r8.locked);
    expect(b?.id).toBe("D-F");
    expect(r8.broken).not.toContain(b?.id);
  });

  it("mọi màn: đổi cặp theo gợi ý từ một cây khung bất kỳ luôn về chi phí tối ưu", () => {
    for (const lv of muddy) {
      const g = makeGraph(lv.graph);
      const rules = rulesOf(lv);
      // cây khung "tệ": thêm đường đắt trước (vẫn giữ đường khóa, bỏ đường hỏng)
      let tree = [...rules.locked];
      const byCostDesc = [...g.edges].filter((e) => !rules.broken.includes(e.id)).sort((a, b) => (b.w ?? 0) - (a.w ?? 0));
      for (const e of byCostDesc) {
        if (tree.includes(e.id)) continue;
        if (!findCycle(g, [...tree, e.id])) tree.push(e.id);
      }
      expect(analyzeMuddy(g, tree).spanning, lv.id).toBe(true);
      for (let i = 0; i < 50; i++) {
        const s = improvingSwap(g, rules, tree);
        if (!s) break;
        tree = [...tree.filter((id) => id !== s.remove.id), s.add.id];
        expect(analyzeMuddy(g, tree).spanning, lv.id).toBe(true);
      }
      expect(analyzeMuddy(g, tree).cost, lv.id).toBe(optimalCost(g, rules));
    }
  });
});

const greedy = allLevels().filter((l): l is GreedyLevel => l.game === "greedy_order");

/** Sinh số giả ngẫu nhiên cố định để kiểm thử lặp lại được. */
function rng(seed: number) {
  let x = seed;
  return () => {
    x = (x * 1103515245 + 12345) % 2147483648;
    return x / 2147483648;
  };
}

describe("Xếp thứ tự cho Greedy: nhật ký và gợi ý", () => {
  it("nhật ký từng bước khớp greedyColoring", () => {
    for (const lv of greedy) {
      const g = makeGraph(lv.graph);
      const nb = undirectedNeighbors(g);
      const order = vertexIds(g);
      const { colorOf } = greedyColoring(g, order);
      const trace = greedyTrace(g, order);
      expect(trace.map((s) => s.v), lv.id).toEqual(order);
      for (const [i, s] of trace.entries()) {
        expect(s.color, lv.id).toBe(colorOf[s.v]);
        // chỉ các đỉnh kề đã tô trước
        for (const u of s.colored) {
          expect(nb.get(s.v)!.has(u)).toBe(true);
          expect(order.indexOf(u)).toBeLessThan(i);
        }
        expect(s.blocked).not.toContain(s.color);
        for (let c = 1; c < s.color; c++) expect(s.blocked).toContain(c);
      }
    }
  });

  it("thứ tự mặc định: chỉ ra đỉnh đầu tiên phải mở màu vượt χ", () => {
    for (const lv of greedy) {
      const g = makeGraph(lv.graph);
      const s = firstOverflow(greedyTrace(g, vertexIds(g)), lv.chi);
      expect(s, lv.id).not.toBeNull();
      expect(s!.color).toBe(lv.chi + 1);
      expect(s!.blocked.length).toBeGreaterThanOrEqual(lv.chi);
    }
  });

  it("chặn dưới: có bộ χ đỉnh đôi một kề nhau ở các màn χ = 3, không có bộ χ + 1", () => {
    for (const lv of greedy) {
      const g = makeGraph(lv.graph);
      const nb = undirectedNeighbors(g);
      const k = findClique(g, lv.chi);
      expect(k, lv.id).not.toBeNull();
      for (const a of k!) for (const b of k!) if (a !== b) expect(nb.get(a)!.has(b)).toBe(true);
      expect(findClique(g, lv.chi + 1), lv.id).toBeNull();
    }
  });

  it("các nhóm cùng màu tối ưu: đủ χ nhóm, phủ mọi đỉnh, trong nhóm không có cạnh", () => {
    for (const lv of greedy) {
      const g = makeGraph(lv.graph);
      const nb = undirectedNeighbors(g);
      const classes = optimalClasses(g);
      expect(classes.length, lv.id).toBe(chromaticNumber(g));
      expect(classes.flat().sort()).toEqual(vertexIds(g).sort());
      for (const c of classes) for (const a of c) for (const b of c) expect(nb.get(a)!.has(b)).toBe(false);
      // nhóm đông trước
      for (let i = 1; i < classes.length; i++) expect(classes[i - 1].length).toBeGreaterThanOrEqual(classes[i].length);
    }
  });

  it("làm theo gợi ý mức 2 từ mọi trạng thái luôn tới χ sau tối đa χ bước", () => {
    const rand = rng(7);
    for (const lv of greedy) {
      const g = makeGraph(lv.graph);
      const ids = vertexIds(g);
      for (let trial = 0; trial < 60; trial++) {
        // trạng thái đầu ngẫu nhiên: một số đỉnh đã chạm theo thứ tự bất kỳ
        let picked = [...ids].sort(() => rand() - 0.5).slice(0, Math.floor(rand() * (ids.length + 1)));
        for (let step = 0; step <= lv.chi; step++) {
          const plan = hintPlan(g, picked);
          if (!plan) break;
          expect(plan.cls.length).toBeGreaterThan(0);
          expect(plan.cls.some((v) => plan.before.includes(v))).toBe(false);
          // sinh viên làm đúng lời gợi ý
          picked = [...plan.before, ...plan.cls];
        }
        expect(greedyColoring(g, orderFromPicked(g, picked)).count, `${lv.id} ${picked.join(",")}`).toBe(lv.chi);
      }
    }
  });

  it("gợi ý mức 2 ở màn Hai tam giác bỏ qua nhóm 1, 2 đã nằm sẵn ở đầu thứ tự mặc định", () => {
    const lv = greedy.find((l) => l.id === "ch5-l02")!;
    const g = makeGraph(lv.graph);
    const h = greedyHint(g, [], 2);
    expect(h.highlight).toBeDefined();
    expect(h.highlight).not.toEqual(["1", "2"]);
    // đạt χ rồi thì không tô sáng nữa
    const plan = hintPlan(g, [])!;
    const done = [...plan.before, ...plan.cls];
    if (greedyColoring(g, orderFromPicked(g, done)).count === lv.chi) expect(greedyHint(g, done, 2).highlight).toBeUndefined();
  });
});

const matrix = allLevels().filter((l): l is MatrixLevel => l.game === "matrix_translate");

describe("Dịch ma trận: chênh lệch và gợi ý", () => {
  it("khóa cạnh: tách hai đầu, tên hiển thị, đồ thị đã vẽ", () => {
    expect(keyEnds("2|5")).toEqual(["2", "5"]);
    expect(keyEnds("3>1")).toEqual(["3", "1"]);
    expect(keyName("2|5")).toBe("2–5");
    expect(keyName("3>1")).toBe("3 → 1");
    const g = makeGraph(matrix[0].graph);
    const d = drawnGraph(g, ["1|2", "2|4"]);
    expect(d.vertices).toBe(g.vertices);
    expect(d.edges.map((e) => [e.id, e.u, e.v])).toEqual([
      ["1|2", "1", "2"],
      ["2|4", "2", "4"],
    ]);
  });

  it("ô ma trận: vô hướng đối xứng, có hướng thì không, đường chéo luôn 0", () => {
    const und = makeGraph(matrix.find((l) => !l.graph.directed)!.graph);
    expect(cellOn(und, ["1|3"], "1", "3")).toBe(true);
    expect(cellOn(und, ["1|3"], "3", "1")).toBe(true);
    expect(cellOn(und, ["1|3"], "1", "1")).toBe(false);
    const dir = makeGraph(matrix.find((l) => l.graph.directed)!.graph);
    expect(cellOn(dir, ["1>3"], "1", "3")).toBe(true);
    expect(cellOn(dir, ["1>3"], "3", "1")).toBe(false);
  });

  it("chênh lệch: thiếu và thừa theo thứ tự đỉnh, khớp với compareKeys", () => {
    const g = makeGraph(matrix[0].graph); // 1-2 1-3 2-3 2-4 3-5 4-5
    const d = diffKeys(g, ["1|2", "1|4", "4|5", "1|5"]);
    expect(d.missing).toEqual(["1|3", "2|3", "2|4", "3|5"]);
    expect(d.extra).toEqual(["1|4", "1|5"]);
    const c = compareKeys(g, ["1|2", "1|4", "4|5", "1|5"]);
    expect([c.missing, c.extra]).toEqual([4, 2]);
    expect(diffText(g, "adj-to-graph", 4, 2)).toBe("Đồ thị của bạn thiếu 4 cạnh, thừa 2 cạnh so với ma trận kề.");
    expect(diffText(g, "graph-to-adj", 0, 1)).toBe("Ma trận còn sai: 1 cặp ô điền 1 nhưng không có cạnh.");
  });

  it("gợi ý mức 2: chỉ đúng cặp đỉnh còn thiếu trước, rồi tới cặp thừa", () => {
    const l4 = matrix.find((l) => l.mode === "inc-to-graph")!;
    const g = makeGraph(l4.graph);
    const all = targetKeys(g);
    const h = matrixHint(l4, g, all.slice(1), 2);
    const [u, v] = keyEnds(diffKeys(g, all.slice(1)).missing[0]);
    expect(h.highlight).toEqual([u, v]);
    expect(h.text).toMatch(/^Cột e\d+ có số 1 ở hàng/);
    const extra = matrixHint(l4, g, [...all, "1|3"].sort(), 2);
    expect(extra.highlight).toEqual(["1", "3"]);
    expect(matrixHint(l4, g, all, 2).highlight).toBeUndefined();
  });

  it("mọi màn: làm theo gợi ý mức 2 từ bài làm bất kỳ luôn tới đáp án đúng", () => {
    const rand = rng(11);
    for (const lv of matrix) {
      const g = makeGraph(lv.graph);
      const ids = vertexIds(g);
      const pairs: string[] = [];
      for (const a of ids) for (const b of ids) if (a !== b) pairs.push(edgeKey(g, a, b));
      const universe = [...new Set(pairs)];
      for (let trial = 0; trial < 30; trial++) {
        let keys = universe.filter(() => rand() < 0.4).sort();
        for (let i = 0; i <= universe.length; i++) {
          const h = matrixHint(lv, g, keys, 2);
          if (!h.highlight) break;
          const [a, b] = h.highlight;
          keys = toggleKey(keys, edgeKey(g, a, b));
        }
        expect(compareKeys(g, keys).correct, lv.id).toBe(true);
      }
    }
  });
});
