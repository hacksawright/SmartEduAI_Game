// Luật chơi Một nét vẽ (Ch.3). Reducer thuần: cùng chuỗi thao tác cho cùng kết quả,
// nên server có thể chấm lại bằng cách phát lại nhật ký thao tác (verify.ts).

import { analyzeEuler } from "../algorithms/euler";
import { degrees, inOutDegrees, type Graph, type VertexId } from "../graph";

export type OneStrokeAction =
  | { t: "tap"; v: VertexId }
  | { t: "undo" }
  | { t: "reset" }
  | { t: "claim"; disconnected: boolean; vertices: VertexId[] };

export interface OneStrokeState {
  /** các đỉnh bút đã đi qua; rỗng = chưa đặt bút */
  path: VertexId[];
  /** id các cạnh đã vẽ, theo thứ tự */
  used: string[];
  mistakes: number;
  /** chữ ký các lần bị kẹt đã tính lỗi (kẹt lại đúng chỗ cũ không bị trừ lần nữa) */
  stuckSeen: string[];
  status: "drawing" | "stuck" | "won" | "proved";
}

export type OneStrokeEvent =
  | { kind: "start"; v: VertexId }
  | { kind: "draw"; edge: string; from: VertexId; to: VertexId }
  | { kind: "invalid"; reason: "used" | "not-adjacent" | "no-edges" | "stuck" | "direction" }
  | { kind: "stuck"; counted: boolean }
  | { kind: "won" }
  | { kind: "undo" }
  | { kind: "reset" }
  | { kind: "claim-ok" }
  | { kind: "claim-wrong"; reason: string };

export const initialOneStroke = (): OneStrokeState => ({ path: [], used: [], mistakes: 0, stuckSeen: [], status: "drawing" });

/** Cạnh chưa vẽ đi được từ `from` tới `to` (có hướng: chỉ theo chiều mũi tên). */
export function availableEdge(g: Graph, used: string[], from: VertexId, to: VertexId): string | null {
  for (const e of g.edges) {
    if (used.includes(e.id)) continue;
    if (e.u === from && e.v === to) return e.id;
    if (!g.directed && e.v === from && e.u === to) return e.id;
  }
  return null;
}

export function movesFrom(g: Graph, used: string[], from: VertexId): string[] {
  return g.edges
    .filter((e) => !used.includes(e.id) && (e.u === from || (!g.directed && e.v === from)))
    .map((e) => e.id);
}

export function oneStrokeStep(
  g: Graph,
  s: OneStrokeState,
  a: OneStrokeAction,
): { state: OneStrokeState; event: OneStrokeEvent } {
  if (s.status === "won" || s.status === "proved") return { state: s, event: { kind: "invalid", reason: "stuck" } };

  switch (a.t) {
    case "reset":
      return { state: { ...s, path: [], used: [], status: "drawing" }, event: { kind: "reset" } };

    case "undo": {
      if (s.path.length <= 1) return { state: { ...s, path: [], used: [], status: "drawing" }, event: { kind: "undo" } };
      return {
        state: { ...s, path: s.path.slice(0, -1), used: s.used.slice(0, -1), status: "drawing" },
        event: { kind: "undo" },
      };
    }

    case "tap": {
      if (s.status === "stuck") return { state: s, event: { kind: "invalid", reason: "stuck" } };
      if (s.path.length === 0) {
        const touches = g.edges.some((e) => e.u === a.v || e.v === a.v);
        if (!touches) return { state: s, event: { kind: "invalid", reason: "no-edges" } };
        const started = { ...s, path: [a.v] };
        return afterMove(g, started, { kind: "start", v: a.v });
      }
      const from = s.path[s.path.length - 1];
      if (a.v === from) return { state: s, event: { kind: "invalid", reason: "not-adjacent" } };
      const edge = availableEdge(g, s.used, from, a.v);
      if (!edge) {
        const anyEdge = g.edges.some(
          (e) => (e.u === from && e.v === a.v) || (e.v === from && e.u === a.v),
        );
        const reverseOnly =
          g.directed && anyEdge && g.edges.some((e) => e.u === a.v && e.v === from && !s.used.includes(e.id));
        return {
          state: s,
          event: { kind: "invalid", reason: reverseOnly ? "direction" : anyEdge ? "used" : "not-adjacent" },
        };
      }
      const next = { ...s, path: [...s.path, a.v], used: [...s.used, edge] };
      return afterMove(g, next, { kind: "draw", edge, from, to: a.v });
    }

    case "claim": {
      const res = judgeImpossibleClaim(g, a.disconnected, a.vertices);
      if (res.correct) return { state: { ...s, status: "proved" }, event: { kind: "claim-ok" } };
      return { state: { ...s, mistakes: s.mistakes + 1 }, event: { kind: "claim-wrong", reason: res.reason } };
    }
  }
}

function afterMove(
  g: Graph,
  s: OneStrokeState,
  ev: OneStrokeEvent,
): { state: OneStrokeState; event: OneStrokeEvent } {
  if (s.used.length === g.edges.length) return { state: { ...s, status: "won" }, event: { kind: "won" } };
  const at = s.path[s.path.length - 1];
  if (movesFrom(g, s.used, at).length > 0) return { state: s, event: ev };
  const sig = `${s.path[0]}|${[...s.used].sort().join(",")}|${at}`;
  const counted = !s.stuckSeen.includes(sig);
  return {
    state: {
      ...s,
      status: "stuck",
      mistakes: s.mistakes + (counted ? 1 : 0),
      stuckSeen: counted ? [...s.stuckSeen, sig] : s.stuckSeen,
    },
    event: { kind: "stuck", counted },
  };
}

/** Chấm kết luận "Bất khả" kèm bằng chứng (GDD mục 5). */
export function judgeImpossibleClaim(
  g: Graph,
  disconnected: boolean,
  vertices: VertexId[],
): { correct: boolean; reason: string } {
  const an = analyzeEuler(g);
  if (an.kind !== "none") {
    return {
      correct: false,
      reason: g.directed
        ? "Hình này vẽ được một nét. Hãy so lại bán bậc vào và bán bậc ra ở từng đỉnh."
        : "Hình này vẽ được một nét. Hãy đếm lại số đỉnh bậc lẻ.",
    };
  }
  if (disconnected) {
    if (!an.connected) return { correct: true, reason: "" };
    return { correct: false, reason: "Các cạnh vẫn nằm trong một khối liên thông. Bằng chứng phải nằm ở bậc của đỉnh." };
  }
  if (!an.connected && (g.directed ? an.unbalanced.length === 0 : an.odd.length === 0)) {
    return { correct: false, reason: "Mọi đỉnh đều cân bằng, nên bằng chứng không nằm ở bậc. Nhìn lại xem các cạnh có nối liền với nhau không." };
  }
  const want = new Set(g.directed ? an.unbalanced : an.odd);
  const picked = new Set(vertices);
  const deg = degrees(g);
  const io = inOutDegrees(g);
  const extra = [...picked].find((v) => !want.has(v));
  if (extra) {
    return {
      correct: false,
      reason: g.directed
        ? `Đỉnh ${extra} có bán bậc vào = bán bậc ra = ${io.get(extra)!.in}, nên không phải bằng chứng.`
        : `Đỉnh ${extra} có bậc ${deg.get(extra)} (chẵn), nên không phải bằng chứng.`,
    };
  }
  const missing = [...want].filter((v) => !picked.has(v)).length;
  if (missing > 0) {
    return {
      correct: false,
      reason: g.directed
        ? `Còn thiếu ${missing} đỉnh có bán bậc vào khác bán bậc ra.`
        : `Còn thiếu ${missing} đỉnh bậc lẻ. Hãy chọn đủ mọi đỉnh bậc lẻ.`,
    };
  }
  return { correct: true, reason: "" };
}

/** Phát lại nhật ký thao tác. */
export function replayOneStroke(g: Graph, actions: OneStrokeAction[]): OneStrokeState {
  let s = initialOneStroke();
  for (const a of actions) s = oneStrokeStep(g, s, a).state;
  return s;
}
