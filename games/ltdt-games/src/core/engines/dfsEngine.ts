import { dfs } from "../algorithms/traversal";
import { adjacency, type Graph, type VertexId } from "../graph";
import type { Hint, PredictionEngine, Verdict } from "./types";

export type DfsAnswer = { type: "push"; v: VertexId } | { type: "pop" };

export interface DfsState {
  stack: VertexId[];
  /** thứ tự thăm (thứ tự được đẩy vào ngăn xếp) */
  visited: VertexId[];
  /** đã lấy ra khỏi ngăn xếp (đã xét xong) */
  done: VertexId[];
  pred: Record<VertexId, VertexId | null>;
  phase: "step" | "done";
  answered: number;
}

export function createDfsEngine(g: Graph, start: VertexId): PredictionEngine<DfsState, DfsAnswer> {
  const adj = adjacency(g);
  const ref = dfs(g, start);

  const top = (s: DfsState) => s.stack[s.stack.length - 1];
  const unvisitedNeighbors = (s: DfsState, u: VertexId) =>
    [...new Set(adj.get(u)!.map((a) => a.v))].filter((v) => !s.visited.includes(v));

  const expected = (s: DfsState): DfsAnswer | null => {
    if (s.phase === "done") return null;
    const next = unvisitedNeighbors(s, top(s))[0];
    return next ? { type: "push", v: next } : { type: "pop" };
  };

  const check = (s: DfsState, a: DfsAnswer): Verdict<DfsAnswer> => {
    const exp = expected(s)!;
    const t = top(s);
    if (exp.type === "pop") {
      return {
        correct: a.type === "pop",
        expected: exp,
        explain: `Đỉnh ${t} không còn đỉnh kề nào chưa thăm, nên phải lấy ${t} ra khỏi ngăn xếp (quay lui).`,
      };
    }
    if (a.type === "pop") {
      return {
        correct: false,
        expected: exp,
        explain: `Đỉnh ${t} vẫn còn đỉnh kề chưa thăm nên chưa được lấy ra. Đẩy ${exp.v} vào ngăn xếp.`,
      };
    }
    const correct = a.v === exp.v;
    const nb = new Set(adj.get(t)!.map((x) => x.v));
    let explain: string;
    if (s.visited.includes(a.v)) explain = `Đỉnh ${a.v} đã được thăm. Đỉnh cần đẩy là ${exp.v}.`;
    else if (!nb.has(a.v)) explain = `Đỉnh ${a.v} không kề với đỉnh trên cùng ngăn xếp (${t}). Đỉnh cần đẩy là ${exp.v}.`;
    else explain = `Theo quy ước, chọn đỉnh kề chưa thăm có chỉ số nhỏ nhất của ${t}: đó là ${exp.v}.`;
    return { correct, expected: exp, explain };
  };

  const apply = (s: DfsState, a: DfsAnswer): DfsState => {
    if (a.type === "push") {
      return {
        ...s,
        stack: [...s.stack, a.v],
        visited: [...s.visited, a.v],
        pred: { ...s.pred, [a.v]: top(s) },
        answered: s.answered + 1,
      };
    }
    const stack = s.stack.slice(0, -1);
    return {
      ...s,
      stack,
      done: [...s.done, top(s)],
      phase: stack.length ? "step" : "done",
      answered: s.answered + 1,
    };
  };

  const hint = (s: DfsState, level: 1 | 2): Hint => {
    const t = top(s);
    if (level === 1) {
      return {
        text: `Đỉnh trên cùng ngăn xếp là ${t}. Nó còn đỉnh kề nào chưa được thăm không? Nếu có, đỉnh có chỉ số nhỏ nhất là đỉnh nào?`,
      };
    }
    const cands = unvisitedNeighbors(s, t);
    return cands.length
      ? { text: `Các đỉnh kề chưa thăm của ${t} đang được tô sáng. Chọn đỉnh có chỉ số nhỏ nhất.`, highlight: cands }
      : { text: `Đỉnh ${t} không còn đỉnh kề nào chưa thăm. Khi đó thuật toán làm gì?`, highlight: [t] };
  };

  return {
    init: () => ({ stack: [start], visited: [start], done: [], pred: { [start]: null }, phase: "step", answered: 0 }),
    isDone: (s) => s.phase === "done",
    expected,
    check,
    apply,
    progress: (s) => ({ step: Math.min(ref.steps.length, s.answered + 1), total: ref.steps.length }),
    hint,
    referenceQuestionCount: () => ref.steps.length,
  };
}
