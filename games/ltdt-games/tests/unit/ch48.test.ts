// Chương 4 (Gỡ rối, Chia đội) và Chương 8 (Ống nước & nút thắt): thuật toán, luật chơi, dữ liệu màn và chấm lại.

import { describe, expect, it } from "vitest";
import { bipartition, judgeOddCycle } from "../../src/core/algorithms/bipartite";
import {
  cutCapacity,
  edmondsKarp,
  findAugmentingPath,
  flowValue,
  flowViolations,
  residualArcs,
  type Flow,
} from "../../src/core/algorithms/maxFlow";
import {
  conflictCount,
  conflicts,
  findTriangle,
  judgeProof,
  segmentsIntersect,
  validProofs,
  type Positions,
} from "../../src/core/algorithms/planarity";
import { flowStep, initialFlowState, type FlowAction } from "../../src/core/games/maxFlow";
import { teamsStep, initialTeams, type TeamsAction } from "../../src/core/games/twoTeams";
import { faceCount, FRAME, initialUntangle, MIN_GAP, untangleStep, type UntangleAction } from "../../src/core/games/untangle";
import { makeGraph, type Graph, type VertexId } from "../../src/core/graph";
import type { MaxFlowLevel, TwoTeamsLevel, UntangleLevel } from "../../src/core/levels/types";
import { allLevels, GAMES } from "../../src/core/registry";
import { verifySubmission } from "../../src/core/verify";

const untangle = allLevels().filter((l): l is UntangleLevel => l.game === "untangle");
const teams = allLevels().filter((l): l is TwoTeamsLevel => l.game === "two_teams");
const flows = allLevels().filter((l): l is MaxFlowLevel => l.game === "max_flow");

const solutionPos = (lv: UntangleLevel): Positions =>
  Object.fromEntries(Object.entries(lv.solution!).map(([v, [x, y]]) => [v, { x, y }]));

/** Lời giải chuẩn của Gỡ rối: dời từng đỉnh về cách vẽ mẫu rồi trả lời số mặt, hoặc đưa bằng chứng đầu tiên. */
function perfectUntangle(lv: UntangleLevel): UntangleAction[] {
  const g = makeGraph(lv.graph);
  if (lv.expect === "nonplanar") return [{ t: "claim", proof: validProofs(g)[0] }];
  const moves: UntangleAction[] = g.vertices.map((v) => ({ t: "move", v: v.id, x: lv.solution![v.id][0], y: lv.solution![v.id][1] }));
  return [...moves, { t: "faces", n: faceCount(g) }];
}

function perfectTeams(lv: TwoTeamsLevel): TeamsAction[] {
  const g = makeGraph(lv.graph);
  const b = bipartition(g);
  if (!b.ok) return [{ t: "claim", cycle: b.oddCycle }];
  return [...g.vertices.map<TeamsAction>((v) => ({ t: "assign", v: v.id, team: b.side[v.id] === 0 ? "X" : "Y" })), { t: "check" }];
}

/** Lời giải chuẩn của Ống nước: bơm theo từng đường Edmonds–Karp, báo cực đại, chọn lát cắt nhỏ nhất. */
function perfectFlow(lv: MaxFlowLevel): FlowAction[] {
  const g = makeGraph(lv.graph);
  const r = edmondsKarp(g, lv.source, lv.sink, lv.initialFlow);
  return [
    ...r.paths.map<FlowAction>((p) => ({ t: "push", path: p.vertices, amount: p.amount })),
    { t: "claim" },
    { t: "cut", side: r.minCut },
  ];
}

/** Có đường tăng luồng chỉ đi xuôi chiều ống không. */
function forwardPathExists(g: Graph, flow: Flow, s: VertexId, t: VertexId): boolean {
  const seen = new Set([s]);
  const queue = [s];
  for (let i = 0; i < queue.length; i++)
    for (const a of residualArcs(g, flow, queue[i]))
      if (a.forward && !seen.has(a.to)) {
        seen.add(a.to);
        queue.push(a.to);
      }
  return seen.has(t);
}

describe("số màn", () => {
  it("Chương 4 có 8 + 6 màn, Chương 8 có 5 màn", () => {
    expect(GAMES.find((g) => g.id === "untangle")!.levels).toHaveLength(8);
    expect(GAMES.find((g) => g.id === "two_teams")!.levels).toHaveLength(6);
    expect(GAMES.find((g) => g.id === "max_flow")!.levels).toHaveLength(5);
  });
});

describe("hình học giao cắt", () => {
  it("đoạn thẳng cắt nhau, chạm nhau, rời nhau", () => {
    const p = (x: number, y: number) => ({ x, y });
    expect(segmentsIntersect(p(0, 0), p(10, 10), p(0, 10), p(10, 0))).toBe(true);
    expect(segmentsIntersect(p(0, 0), p(10, 0), p(5, 0), p(5, 5))).toBe(true);
    expect(segmentsIntersect(p(0, 0), p(10, 0), p(0, 1), p(10, 1))).toBe(false);
    expect(segmentsIntersect(p(0, 0), p(4, 0), p(5, 0), p(9, 0))).toBe(false);
  });

  it("K₄ vẽ trên hình vuông có đúng 1 chỗ cắt; đỉnh nằm trên cạnh bị tính là chạm", () => {
    const g = makeGraph({ vertices: [["1", 0, 0], ["2", 200, 0], ["3", 200, 200], ["4", 0, 200]], edges: "1-2 2-3 3-4 4-1 1-3 2-4" });
    const pos: Positions = { 1: { x: 0, y: 0 }, 2: { x: 200, y: 0 }, 3: { x: 200, y: 200 }, 4: { x: 0, y: 200 } };
    const c = conflicts(g, pos);
    expect(c.crossings).toHaveLength(1);
    expect(c.crossings[0].at).toEqual({ x: 100, y: 100 });
    const flat = conflicts(g, { ...pos, 4: { x: 100, y: 100 } });
    expect(flat.touches.some((t) => t.v === "4")).toBe(true);
  });
});

describe("bằng chứng không phẳng", () => {
  it("chấm từng loại bằng chứng", () => {
    const k5 = makeGraph(untangle[3].graph);
    const k33 = makeGraph(untangle[4].graph);
    expect(judgeProof(k5, { kind: "edges" }).correct).toBe(true);
    expect(judgeProof(k33, { kind: "edges" }).correct).toBe(false);
    expect(judgeProof(k33, { kind: "edges-no-triangle" }).correct).toBe(true);
    expect(judgeProof(k5, { kind: "edges-no-triangle" }).reason).toMatch(/tam giác/);
    expect(judgeProof(k5, { kind: "k5", vertices: ["1", "2", "3", "4"] }).correct).toBe(false);
    expect(judgeProof(k5, { kind: "k5", vertices: ["1", "2", "3", "4", "5"] }).correct).toBe(true);
    expect(judgeProof(k33, { kind: "k33", a: ["1", "2", "3"], b: ["4", "5", "6"] }).correct).toBe(true);
    expect(judgeProof(k33, { kind: "k33", a: ["1", "4", "3"], b: ["2", "5", "6"] }).correct).toBe(false);
    expect(findTriangle(k33)).toBeNull();
  });
});

describe("Gỡ rối: dữ liệu màn", () => {
  for (const lv of untangle) {
    const g = makeGraph(lv.graph);
    it(`${lv.id} (${lv.title}): ban đầu có giao cắt, đúng loại ${lv.expect}`, () => {
      expect(conflictCount(conflicts(g, initialUntangle(g).pos))).toBeGreaterThan(0);
      if (lv.expect === "planar") {
        // có cách vẽ không giao cắt, trong khung, đỉnh không quá sát nhau
        const sol = solutionPos(lv);
        expect(Object.keys(sol).sort()).toEqual(g.vertices.map((v) => v.id).sort());
        expect(conflictCount(conflicts(g, sol))).toBe(0);
        for (const [a, p] of Object.entries(sol)) {
          expect(p.x).toBeGreaterThanOrEqual(FRAME.minX);
          expect(p.x).toBeLessThanOrEqual(FRAME.maxX);
          expect(p.y).toBeGreaterThanOrEqual(FRAME.minY);
          expect(p.y).toBeLessThanOrEqual(FRAME.maxY);
          for (const [b, q] of Object.entries(sol)) if (a !== b) expect(Math.hypot(p.x - q.x, p.y - q.y)).toBeGreaterThanOrEqual(MIN_GAP);
        }
        // mặt ngoài là một chu trình của đồ thị
        const outer = lv.outer!;
        for (let i = 0; i < outer.length; i++) {
          const u = outer[i];
          const v = outer[(i + 1) % outer.length];
          expect(g.edges.some((e) => (e.u === u && e.v === v) || (e.u === v && e.v === u)), `${u}–${v}`).toBe(true);
        }
        // đồ thị phẳng: không bằng chứng nào được chấm đúng
        expect(validProofs(g)).toEqual([]);
        expect(g.edges.length).toBeLessThanOrEqual(3 * g.vertices.length - 6);
      } else {
        expect(validProofs(g).length).toBeGreaterThan(0);
        expect(lv.solution).toBeUndefined();
      }
    });
  }

  it("tiến trình bằng chứng: K₅ đếm cạnh, K₃,₃ cần chặn 2n − 4, màn 7 phải tìm K₃,₃", () => {
    const kinds = (i: number) => validProofs(makeGraph(untangle[i].graph)).map((p) => p.kind);
    expect(kinds(3)[0]).toBe("edges");
    expect(kinds(4)).toEqual(["edges-no-triangle", "k33"]);
    expect(kinds(6)).toEqual(["k33"]);
  });

  it("bát diện có đúng 3n − 6 cạnh", () => {
    const g = makeGraph(untangle[5].graph);
    expect(g.edges.length).toBe(3 * g.vertices.length - 6);
  });
});

describe("Gỡ rối: luật chơi", () => {
  it("không cho đặt đỉnh quá sát đỉnh khác; gỡ xong thì khóa bàn và hỏi số mặt", () => {
    const lv = untangle[0];
    const g = makeGraph(lv.graph);
    let s = initialUntangle(g);
    const p2 = s.pos["2"];
    const r = untangleStep(g, s, { t: "move", v: "1", x: p2.x + 10, y: p2.y });
    expect(r.event).toMatchObject({ kind: "invalid", reason: "too-close", near: "2" });
    for (const a of perfectUntangle(lv).slice(0, -1)) s = untangleStep(g, s, a).state;
    expect(s.status).toBe("untangled");
    expect(untangleStep(g, s, { t: "move", v: "1", x: 400, y: 250 }).event).toMatchObject({ kind: "invalid", reason: "locked" });
    const wrong = untangleStep(g, s, { t: "faces", n: 4 });
    expect(wrong.state.mistakes).toBe(1);
    expect(untangleStep(g, wrong.state, { t: "faces", n: 5 }).state.status).toBe("won");
  });

  it("chấm lại: chơi chuẩn → 3 sao; một bằng chứng sai → 2 sao; chưa xong → từ chối", () => {
    for (const lv of untangle)
      expect(verifySubmission(lv.id, { kind: "untangle", actions: perfectUntangle(lv), hints: 0 }), lv.id).toMatchObject({ ok: true, stars: 3 });
    const k33 = untangle[4];
    const wrong: UntangleAction = { t: "claim", proof: { kind: "edges" } };
    expect(verifySubmission(k33.id, { kind: "untangle", actions: [wrong, ...perfectUntangle(k33)], hints: 0 })).toMatchObject({
      ok: true,
      stars: 2,
    });
    const planar = untangle[0];
    expect(verifySubmission(planar.id, { kind: "untangle", actions: perfectUntangle(planar).slice(0, -1), hints: 0 }).ok).toBe(false);
    expect(verifySubmission(planar.id, { kind: "untangle", actions: [{ t: "claim", proof: { kind: "edges" } }], hints: 0 }).ok).toBe(false);
  });
});

describe("Chia đội", () => {
  for (const lv of teams) {
    it(`${lv.id} (${lv.title}): ${lv.expect}`, () => {
      const g = makeGraph(lv.graph);
      const b = bipartition(g);
      expect(b.ok).toBe(lv.expect === "bipartite");
      if (b.ok) {
        for (const e of g.edges) expect(b.side[e.u]).not.toBe(b.side[e.v]);
      } else {
        expect(b.oddCycle.length % 2).toBe(1);
        expect(judgeOddCycle(g, b.oddCycle).correct).toBe(true);
      }
    });
  }

  it("màn 6: đường chéo 1–9 tạo chu trình lẻ, đường chéo 3–6 thì không", () => {
    const g = makeGraph(teams[5].graph);
    expect(judgeOddCycle(g, ["1", "9", "4", "3", "2"]).correct).toBe(true);
    expect(judgeOddCycle(g, ["3", "6", "7", "2"]).correct).toBe(false);
    expect(bipartition({ ...g, edges: g.edges.filter((e) => e.id !== "1-9") }).ok).toBe(true);
  });

  it("chu trình sai: không kề, lặp đỉnh, độ dài chẵn", () => {
    const g = makeGraph(teams[2].graph);
    expect(judgeOddCycle(g, ["1", "2", "4"]).reason).toMatch(/không có đường nối/);
    expect(judgeOddCycle(g, ["1", "2", "1"]).correct).toBe(false);
    const sq = makeGraph(teams[3].graph);
    expect(judgeOddCycle(sq, ["1", "2", "3", "4"]).reason).toMatch(/chẵn/);
  });

  it("kiểm tra khi chưa xếp đủ thì không tính lỗi; còn cặp cùng đội thì tính 1 lỗi", () => {
    const lv = teams[0];
    const g = makeGraph(lv.graph);
    let s = initialTeams();
    expect(teamsStep(g, s, { t: "check" }).event.kind).toBe("incomplete");
    for (const v of g.vertices) s = teamsStep(g, s, { t: "assign", v: v.id, team: "X" }).state;
    const r = teamsStep(g, s, { t: "check" });
    expect(r.event).toMatchObject({ kind: "conflicts" });
    expect(r.state.mistakes).toBe(1);
  });

  it("chấm lại: chơi chuẩn → 3 sao; kiểm tra sai một lần → 2 sao", () => {
    for (const lv of teams)
      expect(verifySubmission(lv.id, { kind: "two_teams", actions: perfectTeams(lv), hints: 0 }), lv.id).toMatchObject({ ok: true, stars: 3 });
    const lv = teams[1];
    const g = makeGraph(lv.graph);
    const allX: TeamsAction[] = g.vertices.map((v) => ({ t: "assign", v: v.id, team: "X" }));
    expect(
      verifySubmission(lv.id, { kind: "two_teams", actions: [...allX, { t: "check" }, ...perfectTeams(lv)], hints: 0 }),
    ).toMatchObject({ ok: true, stars: 2 });
    expect(verifySubmission(teams[2].id, { kind: "two_teams", actions: [{ t: "check" }], hints: 0 }).ok).toBe(false);
  });
});

describe("Ống nước & nút thắt", () => {
  for (const lv of flows) {
    it(`${lv.id} (${lv.title}): luồng cực đại ${lv.maxFlow} = lát cắt nhỏ nhất`, () => {
      const g = makeGraph(lv.graph);
      expect(g.directed).toBe(true);
      expect(g.edges.every((e) => Number.isInteger(e.w) && e.w! > 0)).toBe(true);
      const start = lv.initialFlow ?? {};
      expect(flowViolations(g, start, lv.source, lv.sink)).toEqual({ capacity: [], conservation: [] });
      const r = edmondsKarp(g, lv.source, lv.sink, start);
      expect(r.value).toBe(lv.maxFlow);
      expect(cutCapacity(g, r.minCut)).toBe(lv.maxFlow);
      expect(flowViolations(g, r.flow, lv.source, lv.sink)).toEqual({ capacity: [], conservation: [] });
      expect(flowValue(g, start, lv.source)).toBeLessThan(lv.maxFlow);
    });
  }

  it("màn 3: luồng có sẵn chặn hết đường xuôi, phải đẩy ngược trên a → b", () => {
    const lv = flows[2];
    const g = makeGraph(lv.graph);
    expect(forwardPathExists(g, lv.initialFlow!, "s", "t")).toBe(false);
    const p = findAugmentingPath(g, lv.initialFlow!, "s", "t")!;
    expect(p.some((a) => !a.forward && a.edge === "a-b")).toBe(true);
  });

  it("màn 5: sau đường xuôi duy nhất, chỉ còn đường phải đẩy ngược", () => {
    const lv = flows[4];
    const g = makeGraph(lv.graph);
    let s = initialFlowState(lv);
    s = flowStep(g, lv, s, { t: "push", path: ["s", "a", "b", "t"], amount: 1 }).state;
    expect(forwardPathExists(g, s.flow, "s", "t")).toBe(false);
    expect(findAugmentingPath(g, s.flow, "s", "t")).not.toBeNull();
  });

  it("luật chơi: không bơm quá chỗ trống, báo cực đại sớm bị tính lỗi, lát cắt phải tách s và t", () => {
    const lv = flows[0];
    const g = makeGraph(lv.graph);
    let s = initialFlowState(lv);
    expect(flowStep(g, lv, s, { t: "push", path: ["s", "a", "t"], amount: 3 }).event.kind).toBe("invalid");
    expect(flowStep(g, lv, s, { t: "push", path: ["s", "b", "a"], amount: 1 }).event.kind).toBe("invalid");
    s = flowStep(g, lv, s, { t: "push", path: ["s", "a", "t"], amount: 2 }).state;
    const early = flowStep(g, lv, s, { t: "claim" });
    expect(early.event).toMatchObject({ kind: "not-max", value: 2 });
    expect(early.state.mistakes).toBe(1);
    s = flowStep(g, lv, early.state, { t: "push", path: ["s", "b", "t"], amount: 2 }).state;
    s = flowStep(g, lv, s, { t: "claim" }).state;
    expect(s.phase).toBe("cut");
    expect(flowStep(g, lv, s, { t: "cut", side: ["a"] }).event.kind).toBe("invalid");
    const bad = flowStep(g, lv, s, { t: "cut", side: ["s"] });
    expect(bad.event).toMatchObject({ kind: "cut-wrong", capacity: 5, value: 4 });
    expect(flowStep(g, lv, bad.state, { t: "cut", side: ["s", "a"] }).state.phase).toBe("won");
  });

  it("chấm lại: chơi chuẩn → 3 sao; thiếu lát cắt → từ chối", () => {
    for (const lv of flows)
      expect(verifySubmission(lv.id, { kind: "max_flow", actions: perfectFlow(lv), hints: 0 }), lv.id).toMatchObject({ ok: true, stars: 3 });
    const lv = flows[3];
    expect(verifySubmission(lv.id, { kind: "max_flow", actions: perfectFlow(lv).slice(0, -1), hints: 0 }).ok).toBe(false);
    expect(verifySubmission(lv.id, { kind: "max_flow", actions: perfectFlow(lv), hints: 1 })).toMatchObject({ ok: true, stars: 2 });
  });
});
