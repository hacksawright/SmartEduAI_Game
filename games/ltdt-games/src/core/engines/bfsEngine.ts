import { bfs } from "../algorithms/traversal";
import { adjacency, type Graph, type VertexId } from "../graph";
import type { Hint, PredictionEngine, Verdict } from "./types";

export type BfsAnswer = { type: "dequeue"; v: VertexId } | { type: "enqueue"; vs: VertexId[] };

export interface BfsState {
  queue: VertexId[];
  /** thứ tự được đánh dấu đã thăm (= thứ tự vào hàng đợi) */
  visited: VertexId[];
  /** đã lấy ra và xét xong */
  done: VertexId[];
  pred: Record<VertexId, VertexId | null>;
  /** đỉnh vừa lấy ra, đang xét đỉnh kề */
  current: VertexId | null;
  phase: "dequeue" | "enqueue" | "done";
  answered: number;
}

const fmtList = (vs: VertexId[]) => (vs.length ? vs.join(", ") : "không có đỉnh nào");

export function createBfsEngine(g: Graph, start: VertexId): PredictionEngine<BfsState, BfsAnswer> {
  const adj = adjacency(g);
  const ref = bfs(g, start);

  const neighborsOf = (u: VertexId) => [...new Set(adj.get(u)!.map((a) => a.v))];
  const toEnqueue = (s: BfsState) => neighborsOf(s.current!).filter((v) => !s.visited.includes(v));

  const expected = (s: BfsState): BfsAnswer | null => {
    if (s.phase === "dequeue") return { type: "dequeue", v: s.queue[0] };
    if (s.phase === "enqueue") return { type: "enqueue", vs: toEnqueue(s) };
    return null;
  };

  const check = (s: BfsState, a: BfsAnswer): Verdict<BfsAnswer> => {
    const exp = expected(s)!;
    if (exp.type === "dequeue") {
      const correct = a.type === "dequeue" && a.v === exp.v;
      return {
        correct,
        expected: exp,
        explain: `Hàng đợi lấy ra theo nguyên tắc vào trước – ra trước (FIFO). Đỉnh ${exp.v} đứng đầu hàng nên được lấy ra.`,
      };
    }
    const want = (exp as Extract<BfsAnswer, { type: "enqueue" }>).vs;
    const got = a.type === "enqueue" ? a.vs : [];
    const correct = a.type === "enqueue" && got.length === want.length && got.every((v, i) => v === want[i]);
    const u = s.current!;
    const nb = neighborsOf(u);
    let reason: string;
    const notAdjacent = got.find((v) => !nb.includes(v));
    const alreadyVisited = got.find((v) => s.visited.includes(v));
    const missing = want.filter((v) => !got.includes(v));
    if (notAdjacent) reason = `Đỉnh ${notAdjacent} không kề với ${u}.`;
    else if (alreadyVisited) reason = `Đỉnh ${alreadyVisited} đã được đánh dấu thăm từ trước nên không vào hàng đợi lần nữa.`;
    else if (missing.length) reason = `Còn thiếu ${fmtList(missing)}: đỉnh kề của ${u} chưa được thăm.`;
    else reason = `Đúng các đỉnh nhưng sai thứ tự: đỉnh kề được xét theo chỉ số tăng dần.`;
    return { correct, expected: exp, explain: `${reason} Đáp án: ${fmtList(want)}.` };
  };

  const apply = (s: BfsState, a: BfsAnswer): BfsState => {
    if (a.type === "dequeue") {
      return { ...s, queue: s.queue.slice(1), current: a.v, phase: "enqueue", answered: s.answered + 1 };
    }
    const u = s.current!;
    const pred = { ...s.pred };
    for (const v of a.vs) pred[v] = u;
    const queue = [...s.queue, ...a.vs];
    return {
      ...s,
      queue,
      visited: [...s.visited, ...a.vs],
      done: [...s.done, u],
      pred,
      current: null,
      phase: queue.length ? "dequeue" : "done",
      answered: s.answered + 1,
    };
  };

  const hint = (s: BfsState, level: 1 | 2): Hint => {
    if (s.phase === "dequeue") {
      return level === 1
        ? { text: "Hàng đợi lấy ra theo nguyên tắc nào: vào trước ra trước, hay vào sau ra trước? Đỉnh nào đang đứng ở đầu hàng?" }
        : { text: `Nhìn ô ngoài cùng bên trái của hàng đợi, ô có nhãn "Đầu". Đỉnh đó vào hàng sớm nhất.`, highlight: [s.queue[0]] };
    }
    const u = s.current!;
    return level === 1
      ? { text: `Liệt kê các đỉnh kề với ${u}. Đỉnh nào trong số đó chưa từng vào hàng đợi? Xét chúng theo thứ tự nào?` }
      : {
          text: `Các đỉnh kề với ${u} đang được tô sáng. Bỏ đi những đỉnh đã thăm, rồi chọn phần còn lại theo chỉ số tăng dần.`,
          highlight: neighborsOf(u),
        };
  };

  return {
    init: () => ({
      queue: [start],
      visited: [start],
      done: [],
      pred: { [start]: null },
      current: null,
      phase: "dequeue",
      answered: 0,
    }),
    isDone: (s) => s.phase === "done",
    expected,
    check,
    apply,
    progress: (s) => ({
      step: s.phase === "done" ? ref.order.length : Math.min(ref.order.length, s.done.length + 1),
      total: ref.order.length,
    }),
    hint,
    referenceQuestionCount: () => ref.order.length * 2,
  };
}
