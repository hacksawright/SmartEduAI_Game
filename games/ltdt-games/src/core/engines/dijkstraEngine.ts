import { dijkstra } from "../algorithms/shortestPath";
import { adjacency, type Graph, type VertexId } from "../graph";
import type { Hint, PredictionEngine, Verdict } from "./types";

export type DijkstraAnswer =
  | { type: "select"; v: VertexId }
  /** nhãn mới của các đỉnh kề chưa cố định; đỉnh không có trong `values` = giữ nguyên */
  | { type: "relax"; values: Record<VertexId, number> };

export interface DijkstraState {
  d: Record<VertexId, number>;
  pred: Record<VertexId, VertexId | null>;
  fixed: VertexId[];
  /** đỉnh vừa cố định, đang cập nhật nhãn các đỉnh kề */
  current: VertexId | null;
  phase: "select" | "relax" | "done";
  /** đỉnh có nhãn vừa giảm ở lần cập nhật gần nhất */
  changed: VertexId[];
  answered: number;
}

export const fmtD = (x: number) => (x === Infinity ? "∞" : String(x));

const NB = "\u00a0";

export function createDijkstraEngine(g: Graph, source: VertexId): PredictionEngine<DijkstraState, DijkstraAnswer> & {
  /** đỉnh kề chưa cố định của `current` và trọng số nhỏ nhất của cạnh nối tới */
  relaxTargets(s: DijkstraState): Map<VertexId, number>;
} {
  const adj = adjacency(g);
  const ref = dijkstra(g, source);
  const order = g.vertices.map((v) => v.id);

  const unfixedMin = (s: DijkstraState) => {
    let best = Infinity;
    for (const v of order) if (!s.fixed.includes(v)) best = Math.min(best, s.d[v]);
    return best;
  };
  const candidates = (s: DijkstraState) => {
    const m = unfixedMin(s);
    return m === Infinity ? [] : order.filter((v) => !s.fixed.includes(v) && s.d[v] === m);
  };

  const relaxTargets = (s: DijkstraState) => {
    const t = new Map<VertexId, number>();
    if (!s.current) return t;
    for (const { v, edge } of adj.get(s.current)!) {
      if (s.fixed.includes(v)) continue;
      const w = edge.w ?? 1;
      t.set(v, Math.min(t.get(v) ?? Infinity, w));
    }
    return t;
  };

  const expectedRelax = (s: DijkstraState) => {
    const du = s.d[s.current!];
    const out: Record<VertexId, number> = {};
    for (const [v, w] of relaxTargets(s)) out[v] = Math.min(s.d[v], du + w);
    return out;
  };

  const nextPhase = (s: DijkstraState): DijkstraState["phase"] => (candidates(s).length ? "select" : "done");

  const expected = (s: DijkstraState): DijkstraAnswer | null => {
    if (s.phase === "select") return { type: "select", v: candidates(s)[0] };
    if (s.phase === "relax") return { type: "relax", values: expectedRelax(s) };
    return null;
  };

  const check = (s: DijkstraState, a: DijkstraAnswer): Verdict<DijkstraAnswer> => {
    const exp = expected(s)!;
    if (exp.type === "select") {
      const cands = candidates(s);
      const m = s.d[cands[0]];
      const tie = cands.length > 1 ? ` (hòa nhãn: ${cands.join(", ")} đều được)` : "";
      if (a.type !== "select") return { correct: false, expected: exp, explain: "Đang ở bước chọn đỉnh cố định nhãn." };
      if (cands.includes(a.v)) return { correct: true, expected: { type: "select", v: a.v }, explain: "" };
      const why = s.fixed.includes(a.v)
        ? `Đỉnh ${a.v} đã cố định nhãn từ trước.`
        : `d[${a.v}] = ${fmtD(s.d[a.v])} lớn hơn ${fmtD(m)}.`;
      return {
        correct: false,
        expected: exp,
        explain: `${why} Đỉnh được cố định là đỉnh chưa cố định có nhãn nhỏ nhất: d = ${fmtD(m)} ở ${cands[0]}${tie}.`,
      };
    }
    const u = s.current!;
    const du = s.d[u];
    const want = (exp as Extract<DijkstraAnswer, { type: "relax" }>).values;
    const got = a.type === "relax" ? a.values : {};
    const lines: string[] = [];
    let correct = a.type === "relax";
    for (const [v, w] of relaxTargets(s)) {
      const given = got[v] ?? s.d[v];
      const ok = given === want[v];
      if (!ok) correct = false;
      const sum = du + w;
      const mark = ok ? "✓" : "✗";
      if (sum < s.d[v]) {
        // khoảng trắng không ngắt để "d[v] = …" và "pred = u" không bị xuống dòng giữa chừng
        lines.push(`${mark} ${v}: ${fmtD(du)} + ${w} = ${fmtD(sum)} < ${fmtD(s.d[v])} → d[${v}]${NB}=${NB}${fmtD(sum)}, pred${NB}=${NB}${u}`);
      } else {
        lines.push(`${mark} ${v}: ${fmtD(du)} + ${w} = ${fmtD(sum)} ≥ ${fmtD(s.d[v])} → giữ${NB}nguyên`);
      }
    }
    return { correct, expected: exp, explain: lines.join("\n") };
  };

  const apply = (s: DijkstraState, a: DijkstraAnswer): DijkstraState => {
    if (a.type === "select") {
      const next: DijkstraState = {
        ...s,
        fixed: [...s.fixed, a.v],
        current: a.v,
        phase: "relax",
        changed: [],
        answered: s.answered + 1,
      };
      // không còn đỉnh kề chưa cố định: bỏ qua bước cập nhật (GDD mục 4)
      if (relaxTargets(next).size === 0) return { ...next, current: null, phase: nextPhase(next) };
      return next;
    }
    const u = s.current!;
    const d = { ...s.d };
    const pred = { ...s.pred };
    const changed: VertexId[] = [];
    for (const [v, nv] of Object.entries(expectedRelax(s))) {
      if (nv < d[v]) {
        d[v] = nv;
        pred[v] = u;
        changed.push(v);
      }
    }
    const next: DijkstraState = { ...s, d, pred, changed, current: null, answered: s.answered + 1, phase: "select" };
    return { ...next, phase: nextPhase(next) };
  };

  const hint = (s: DijkstraState, level: 1 | 2): Hint => {
    if (s.phase === "select") {
      return level === 1
        ? { text: "Trong các đỉnh chưa cố định nhãn, đỉnh nào đang có nhãn d nhỏ nhất? Vì sao không thể có đường nào ngắn hơn tới đỉnh đó?" }
        : {
            text: "Các đỉnh chưa cố định có nhãn nhỏ nhất đang được tô sáng. Nếu có nhiều đỉnh cùng nhãn, chọn đỉnh nào cũng đúng.",
            highlight: candidates(s),
          };
    }
    const u = s.current!;
    if (level === 1) {
      return {
        text: `Với mỗi đỉnh kề v chưa cố định của ${u}, so sánh d[${u}] + w(${u}, v) với d[v] hiện tại. Khi nào thì nhãn của v giảm?`,
      };
    }
    const want = expectedRelax(s);
    const improving = Object.keys(want).filter((v) => want[v] < s.d[v]);
    return improving.length
      ? { text: `Những đỉnh có nhãn sẽ giảm đang được tô sáng. Tính d[${u}] + w cho từng đỉnh đó.`, highlight: improving }
      : { text: `Lần này không đỉnh kề nào có nhãn giảm. Kiểm tra lại từng phép so sánh rồi xác nhận mà không sửa gì.` };
  };

  const refQuestions = (() => {
    // số câu hỏi khi chạy theo trace tham chiếu: mỗi đỉnh 1 câu chọn + 1 câu cập nhật (nếu có đỉnh kề chưa cố định)
    const fixed = new Set<VertexId>();
    let n = 0;
    for (const u of ref.fixedOrder) {
      fixed.add(u);
      n++;
      if (adj.get(u)!.some(({ v }) => !fixed.has(v))) n++;
    }
    return n;
  })();

  return {
    init: () => {
      const d: Record<VertexId, number> = {};
      const pred: Record<VertexId, VertexId | null> = {};
      for (const v of order) {
        d[v] = Infinity;
        pred[v] = null;
      }
      d[source] = 0;
      return { d, pred, fixed: [], current: null, phase: "select", changed: [], answered: 0 };
    },
    isDone: (s) => s.phase === "done",
    expected,
    check,
    apply,
    progress: (s) => ({
      step: s.phase === "done" ? ref.fixedOrder.length : Math.min(ref.fixedOrder.length, s.fixed.length + (s.phase === "relax" ? 0 : 1)),
      total: ref.fixedOrder.length,
    }),
    hint,
    referenceQuestionCount: () => refQuestions,
    relaxTargets,
  };
}
