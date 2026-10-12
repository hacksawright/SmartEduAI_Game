// Dijkstra tham chiếu (bộ chấm của Tôi là Dijkstra). Có thể thay bằng bản của TV4.

import { adjacency, type Graph, type VertexId } from "../graph";

export interface DijkstraResult {
  d: Record<VertexId, number>;
  pred: Record<VertexId, VertexId | null>;
  /** một thứ tự cố định nhãn hợp lệ (hòa nhãn: chọn đỉnh có chỉ số nhỏ hơn) */
  fixedOrder: VertexId[];
}

export function dijkstra(g: Graph, s: VertexId): DijkstraResult {
  const adj = adjacency(g);
  const d: Record<VertexId, number> = {};
  const pred: Record<VertexId, VertexId | null> = {};
  for (const v of g.vertices) {
    d[v.id] = Infinity;
    pred[v.id] = null;
  }
  d[s] = 0;
  const fixed = new Set<VertexId>();
  const fixedOrder: VertexId[] = [];
  while (fixed.size < g.vertices.length) {
    let u: VertexId | null = null;
    for (const v of g.vertices) {
      if (fixed.has(v.id)) continue;
      if (u === null || d[v.id] < d[u]) u = v.id;
    }
    if (u === null || d[u] === Infinity) break;
    fixed.add(u);
    fixedOrder.push(u);
    for (const { v, edge } of adj.get(u)!) {
      if (fixed.has(v)) continue;
      const nd = d[u] + (edge.w ?? 1);
      if (nd < d[v]) {
        d[v] = nd;
        pred[v] = u;
      }
    }
  }
  return { d, pred, fixedOrder };
}
