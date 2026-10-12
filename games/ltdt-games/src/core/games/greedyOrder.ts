// Luật chơi Xếp thứ tự cho Greedy (Ch.5).

import { greedyColoring, type GreedyResult } from "../algorithms/coloring";
import { vertexIds, type Graph, type VertexId } from "../graph";

/** Các đỉnh đã chạm đứng đầu theo thứ tự chạm, phần còn lại giữ thứ tự 1..n. */
export function orderFromPicked(g: Graph, picked: VertexId[]): VertexId[] {
  const rest = vertexIds(g).filter((v) => !picked.includes(v));
  return [...picked, ...rest];
}

export function togglePicked(picked: VertexId[], v: VertexId): VertexId[] {
  return picked.includes(v) ? picked.filter((x) => x !== v) : [...picked, v];
}

export function runGreedy(g: Graph, order: VertexId[]): GreedyResult {
  return greedyColoring(g, order);
}

/** Một thứ tự hợp lệ phải là hoán vị của tập đỉnh. */
export function isPermutation(g: Graph, order: VertexId[]): boolean {
  const ids = vertexIds(g);
  return order.length === ids.length && new Set(order).size === ids.length && order.every((v) => ids.includes(v));
}
