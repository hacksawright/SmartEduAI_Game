// Luật chơi Thành phố bùn (Ch.7): chọn đường cần lát sao cho mọi nhà nối với nhau, chi phí nhỏ nhất.

import { kruskal } from "../algorithms/spanningTree";
import { components, edgeMap, sumWeights, type Graph, type VertexId } from "../graph";

export interface MuddyRules {
  /** đường đã lát sẵn và không được gỡ (cạnh bắt buộc, hoặc phần cây cũ còn tốt) */
  locked: string[];
  /** đường hỏng, không lát được */
  broken: string[];
}

export interface MuddyAnalysis {
  count: number;
  need: number;
  cost: number;
  /** số nhóm nhà đã nối với nhau */
  groups: number;
  spanning: boolean;
}

export function analyzeMuddy(g: Graph, paved: string[]): MuddyAnalysis {
  const m = edgeMap(g);
  const edges = paved.map((id) => m.get(id)!).filter(Boolean);
  const groups = components(g, edges).length;
  const need = g.vertices.length - 1;
  return { count: edges.length, need, cost: sumWeights(g, paved), groups, spanning: edges.length === need && groups === 1 };
}

/**
 * Nếu cạnh `edgeId` nối hai nhà đã đi tới nhau được bằng các đường lát khác,
 * trả về vòng tạo thành (danh sách đỉnh, khép kín). Ngược lại trả về null.
 */
export function cycleThrough(g: Graph, paved: string[], edgeId: string): VertexId[] | null {
  const m = edgeMap(g);
  const e = m.get(edgeId);
  if (!e) return null;
  const others = paved.filter((id) => id !== edgeId).map((id) => m.get(id)!);
  const adj = new Map<VertexId, VertexId[]>(g.vertices.map((v) => [v.id, []]));
  for (const x of others) {
    adj.get(x.u)!.push(x.v);
    adj.get(x.v)!.push(x.u);
  }
  const prev = new Map<VertexId, VertexId | null>([[e.u, null]]);
  const queue = [e.u];
  while (queue.length) {
    const x = queue.shift()!;
    if (x === e.v) break;
    for (const y of adj.get(x)!) {
      if (prev.has(y)) continue;
      prev.set(y, x);
      queue.push(y);
    }
  }
  if (!prev.has(e.v)) return null;
  const path: VertexId[] = [];
  for (let x: VertexId | null = e.v; x !== null; x = prev.get(x)!) path.push(x);
  path.reverse(); // u ... v
  return [...path, e.u];
}

export function optimalCost(g: Graph, rules: MuddyRules): number {
  return kruskal(g, { forced: rules.locked, excluded: rules.broken }).total;
}

/** Tập đường hợp lệ để chấm: chứa mọi đường khóa, không chứa đường hỏng, không lặp. */
export function validatePaved(g: Graph, rules: MuddyRules, paved: string[]): string | null {
  const ids = new Set(g.edges.map((e) => e.id));
  if (new Set(paved).size !== paved.length) return "Có đường bị lặp.";
  for (const id of paved) if (!ids.has(id)) return `Không có đường ${id}.`;
  for (const id of rules.broken) if (paved.includes(id)) return "Không thể lát đường đã hỏng.";
  for (const id of rules.locked) if (!paved.includes(id)) return "Thiếu đường bắt buộc.";
  return null;
}
