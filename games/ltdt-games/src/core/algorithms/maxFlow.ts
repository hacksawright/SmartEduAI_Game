// Luồng cực đại (Ch.8): mạng có hướng, dung lượng là trọng số cung. Đồ thị thặng dư, đường tăng luồng,
// Edmonds–Karp (Ford–Fulkerson với đường tăng ngắn nhất tìm bằng BFS) và lát cắt.

import { indexMap, type Graph, type VertexId } from "../graph";

/** lưu lượng theo id cung; thiếu nghĩa là 0 */
export type Flow = Record<string, number>;

export interface ResidualArc {
  from: VertexId;
  to: VertexId;
  /** cung gốc của mạng */
  edge: string;
  /** true: đi xuôi cung còn chỗ trống; false: đẩy ngược (trả lại nước trên cung đang có luồng) */
  forward: boolean;
  /** lượng còn đẩy được */
  cap: number;
}

export const capOf = (g: Graph, edgeId: string) => g.edges.find((e) => e.id === edgeId)?.w ?? 0;
export const flowOn = (flow: Flow, edgeId: string) => flow[edgeId] ?? 0;

/** Các cung thặng dư đi ra từ `from`, theo chỉ số đỉnh đích tăng dần. */
export function residualArcs(g: Graph, flow: Flow, from: VertexId): ResidualArc[] {
  const idx = indexMap(g);
  const out: ResidualArc[] = [];
  for (const e of g.edges) {
    const f = flowOn(flow, e.id);
    const c = e.w ?? 0;
    if (e.u === from && c - f > 0) out.push({ from, to: e.v, edge: e.id, forward: true, cap: c - f });
    if (e.v === from && f > 0) out.push({ from, to: e.u, edge: e.id, forward: false, cap: f });
  }
  return out.sort((a, b) => idx.get(a.to)! - idx.get(b.to)! || Number(b.forward) - Number(a.forward));
}

/** Cung thặng dư từ u tới v (ưu tiên đi xuôi), hoặc null. */
export function residualArc(g: Graph, flow: Flow, u: VertexId, v: VertexId): ResidualArc | null {
  return residualArcs(g, flow, u).find((a) => a.to === v) ?? null;
}

/** Đường tăng luồng ngắn nhất (BFS trên đồ thị thặng dư), hoặc null nếu luồng đã cực đại. */
export function findAugmentingPath(g: Graph, flow: Flow, s: VertexId, t: VertexId): ResidualArc[] | null {
  const prev = new Map<VertexId, ResidualArc | null>([[s, null]]);
  const queue = [s];
  for (let qi = 0; qi < queue.length; qi++) {
    const u = queue[qi];
    if (u === t) break;
    for (const a of residualArcs(g, flow, u)) {
      if (prev.has(a.to)) continue;
      prev.set(a.to, a);
      queue.push(a.to);
    }
  }
  if (!prev.has(t)) return null;
  const path: ResidualArc[] = [];
  for (let a = prev.get(t)!; a; a = prev.get(a.from)!) path.unshift(a);
  return path;
}

export const bottleneck = (path: ResidualArc[]) => Math.min(...path.map((a) => a.cap));

/** Tăng luồng `amount` dọc đường thặng dư (không kiểm tra; gọi sau khi đã kiểm tra). */
export function augment(flow: Flow, path: ResidualArc[], amount: number): Flow {
  const next = { ...flow };
  for (const a of path) next[a.edge] = flowOn(next, a.edge) + (a.forward ? amount : -amount);
  return next;
}

/** Giá trị luồng: tổng ra khỏi s trừ tổng vào s. */
export function flowValue(g: Graph, flow: Flow, s: VertexId): number {
  let v = 0;
  for (const e of g.edges) {
    if (e.u === s) v += flowOn(flow, e.id);
    if (e.v === s) v -= flowOn(flow, e.id);
  }
  return v;
}

/** Lượng vào trừ lượng ra tại mỗi đỉnh (đỉnh trung gian của luồng hợp lệ luôn bằng 0). */
export function netInflow(g: Graph, flow: Flow): Record<VertexId, number> {
  const net: Record<VertexId, number> = Object.fromEntries(g.vertices.map((v) => [v.id, 0]));
  for (const e of g.edges) {
    const f = flowOn(flow, e.id);
    net[e.u] -= f;
    net[e.v] += f;
  }
  return net;
}

/** Vi phạm ràng buộc dung lượng (0 ≤ f ≤ c) và bảo toàn luồng. */
export function flowViolations(g: Graph, flow: Flow, s: VertexId, t: VertexId): { capacity: string[]; conservation: VertexId[] } {
  const capacity = g.edges.filter((e) => flowOn(flow, e.id) < 0 || flowOn(flow, e.id) > (e.w ?? 0)).map((e) => e.id);
  const net = netInflow(g, flow);
  const conservation = g.vertices.filter((v) => v.id !== s && v.id !== t && net[v.id] !== 0).map((v) => v.id);
  return { capacity, conservation };
}

/** Các đỉnh đi tới được từ s trên đồ thị thặng dư. */
export function residualReachable(g: Graph, flow: Flow, s: VertexId): Set<VertexId> {
  const seen = new Set<VertexId>([s]);
  const queue = [s];
  for (let qi = 0; qi < queue.length; qi++)
    for (const a of residualArcs(g, flow, queue[qi]))
      if (!seen.has(a.to)) {
        seen.add(a.to);
        queue.push(a.to);
      }
  return seen;
}

/** Các cung đi từ phía S sang phía T của lát cắt (S, T). */
export function cutEdges(g: Graph, S: Iterable<VertexId>): string[] {
  const set = new Set(S);
  return g.edges.filter((e) => set.has(e.u) && !set.has(e.v)).map((e) => e.id);
}

export function cutCapacity(g: Graph, S: Iterable<VertexId>): number {
  return cutEdges(g, S).reduce((sum, id) => sum + capOf(g, id), 0);
}

export interface MaxFlowResult {
  value: number;
  flow: Flow;
  /** các đường tăng luồng theo thứ tự Edmonds–Karp tìm được */
  paths: { vertices: VertexId[]; amount: number }[];
  /** phía S của một lát cắt nhỏ nhất: các đỉnh tới được từ s trên đồ thị thặng dư cuối cùng */
  minCut: VertexId[];
}

export function edmondsKarp(g: Graph, s: VertexId, t: VertexId, start: Flow = {}): MaxFlowResult {
  let flow: Flow = { ...start };
  const paths: MaxFlowResult["paths"] = [];
  for (let path = findAugmentingPath(g, flow, s, t); path; path = findAugmentingPath(g, flow, s, t)) {
    const amount = bottleneck(path);
    flow = augment(flow, path, amount);
    paths.push({ vertices: [s, ...path.map((a) => a.to)], amount });
  }
  const reach = residualReachable(g, flow, s);
  return {
    value: flowValue(g, flow, s),
    flow,
    paths,
    minCut: g.vertices.map((v) => v.id).filter((v) => reach.has(v)),
  };
}
