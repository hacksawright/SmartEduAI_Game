// Luật chơi Ống nước & nút thắt (Ch.8 – Luồng cực đại). Hai bước:
// 1) Bơm nước: chọn một đường từ s tới t trên đồ thị thặng dư (được đi ngược ống đang có nước) và bơm thêm.
//    Bơm theo đường nên luồng luôn thỏa ràng buộc dung lượng và bảo toàn. Khi tin là đã cực đại thì báo.
// 2) Tìm nút thắt: chọn phía S của một lát cắt có dung lượng bằng giá trị luồng (định lý luồng cực đại – lát cắt nhỏ nhất).
// Reducer thuần, phát lại được.

import {
  augment,
  bottleneck,
  cutCapacity,
  findAugmentingPath,
  flowValue,
  residualArc,
  type Flow,
  type ResidualArc,
} from "../algorithms/maxFlow";
import type { Graph, VertexId } from "../graph";

export type FlowAction =
  | { t: "push"; path: VertexId[]; amount: number }
  | { t: "reset" }
  | { t: "claim" }
  | { t: "cut"; side: VertexId[] };

export interface FlowState {
  flow: Flow;
  pushes: number;
  mistakes: number;
  phase: "flow" | "cut" | "won";
}

export type FlowEvent =
  | { kind: "pushed"; amount: number; value: number }
  | { kind: "reset" }
  | { kind: "invalid"; reason: string }
  | { kind: "max-ok"; value: number }
  | { kind: "not-max"; value: number }
  | { kind: "cut-ok"; capacity: number }
  | { kind: "cut-wrong"; capacity: number; value: number };

export interface FlowRules {
  source: VertexId;
  sink: VertexId;
  initialFlow?: Flow;
}

export const initialFlowState = (r: FlowRules): FlowState => ({
  flow: { ...(r.initialFlow ?? {}) },
  pushes: 0,
  mistakes: 0,
  phase: "flow",
});

/** Đổi dãy đỉnh thành các cung thặng dư; null kèm lý do nếu có bước không đi được. */
export function pathArcs(
  g: Graph,
  flow: Flow,
  r: FlowRules,
  path: VertexId[],
): { arcs: ResidualArc[] } | { reason: string } {
  if (!Array.isArray(path) || path.length < 2) return { reason: "Đường cần đi từ s tới t." };
  if (path[0] !== r.source || path[path.length - 1] !== r.sink)
    return { reason: `Đường phải bắt đầu ở ${r.source} và kết thúc ở ${r.sink}.` };
  if (new Set(path).size !== path.length) return { reason: "Đường không được đi qua một đỉnh hai lần." };
  const arcs: ResidualArc[] = [];
  for (let i = 0; i + 1 < path.length; i++) {
    const a = residualArc(g, flow, path[i], path[i + 1]);
    if (!a) return { reason: `Không còn chỗ để nước đi từ ${path[i]} sang ${path[i + 1]}.` };
    arcs.push(a);
  }
  return { arcs };
}

export function flowStep(g: Graph, r: FlowRules, s: FlowState, a: FlowAction): { state: FlowState; event: FlowEvent } {
  if (s.phase === "won") return { state: s, event: { kind: "invalid", reason: "Màn đã xong." } };
  switch (a.t) {
    case "push": {
      if (s.phase !== "flow") return { state: s, event: { kind: "invalid", reason: "Đang ở bước tìm nút thắt." } };
      const res = pathArcs(g, s.flow, r, a.path);
      if ("reason" in res) return { state: s, event: { kind: "invalid", reason: res.reason } };
      const amount = Math.floor(Number(a.amount));
      const most = bottleneck(res.arcs);
      if (!(amount >= 1 && amount <= most))
        return { state: s, event: { kind: "invalid", reason: `Đường này chỉ bơm thêm được từ 1 tới ${most}.` } };
      const flow = augment(s.flow, res.arcs, amount);
      return {
        state: { ...s, flow, pushes: s.pushes + 1 },
        event: { kind: "pushed", amount, value: flowValue(g, flow, r.source) },
      };
    }
    case "reset":
      if (s.phase !== "flow") return { state: s, event: { kind: "invalid", reason: "Đang ở bước tìm nút thắt." } };
      return { state: { ...s, flow: { ...(r.initialFlow ?? {}) } }, event: { kind: "reset" } };
    case "claim": {
      if (s.phase !== "flow") return { state: s, event: { kind: "invalid", reason: "Đã xác nhận luồng cực đại." } };
      const value = flowValue(g, s.flow, r.source);
      if (findAugmentingPath(g, s.flow, r.source, r.sink))
        return { state: { ...s, mistakes: s.mistakes + 1 }, event: { kind: "not-max", value } };
      return { state: { ...s, phase: "cut" }, event: { kind: "max-ok", value } };
    }
    case "cut": {
      if (s.phase !== "cut") return { state: s, event: { kind: "invalid", reason: "Hãy tìm luồng cực đại trước." } };
      const side = Array.isArray(a.side) ? a.side : [];
      if (!side.includes(r.source) || side.includes(r.sink))
        return { state: s, event: { kind: "invalid", reason: `Phía S phải chứa ${r.source} và không chứa ${r.sink}.` } };
      const capacity = cutCapacity(g, side);
      const value = flowValue(g, s.flow, r.source);
      if (capacity === value) return { state: { ...s, phase: "won" }, event: { kind: "cut-ok", capacity } };
      return { state: { ...s, mistakes: s.mistakes + 1 }, event: { kind: "cut-wrong", capacity, value } };
    }
  }
}

export function replayFlow(g: Graph, r: FlowRules, actions: FlowAction[]): FlowState {
  let s = initialFlowState(r);
  for (const a of actions) s = flowStep(g, r, s, a).state;
  return s;
}
