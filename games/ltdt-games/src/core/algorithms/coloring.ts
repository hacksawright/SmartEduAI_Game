// Tô màu tham lam (Greedy) và số màu χ(G) chính xác cho đồ thị nhỏ.

import { type Graph, type VertexId } from "../graph";

/** Đỉnh kề bỏ qua hướng, không lặp. */
export function undirectedNeighbors(g: Graph): Map<VertexId, Set<VertexId>> {
  const m = new Map<VertexId, Set<VertexId>>(g.vertices.map((v) => [v.id, new Set()]));
  for (const e of g.edges) {
    if (e.u === e.v) continue;
    m.get(e.u)!.add(e.v);
    m.get(e.v)!.add(e.u);
  }
  return m;
}

export interface GreedyResult {
  /** màu 1..k của từng đỉnh */
  colorOf: Record<VertexId, number>;
  count: number;
}

/** Greedy: lần lượt theo `order`, tô màu nhỏ nhất chưa bị đỉnh kề đã tô dùng. */
export function greedyColoring(g: Graph, order: VertexId[]): GreedyResult {
  const nb = undirectedNeighbors(g);
  const colorOf: Record<VertexId, number> = {};
  let count = 0;
  for (const v of order) {
    const used = new Set<number>();
    for (const u of nb.get(v)!) if (colorOf[u]) used.add(colorOf[u]);
    let c = 1;
    while (used.has(c)) c++;
    colorOf[v] = c;
    count = Math.max(count, c);
  }
  return { colorOf, count };
}

/** χ(G) bằng quay lui (đủ nhanh cho n ≤ 14). */
export function chromaticNumber(g: Graph): number {
  const n = g.vertices.length;
  if (n === 0) return 0;
  const nb = undirectedNeighbors(g);
  // tô đỉnh bậc cao trước để cắt nhánh sớm
  const order = [...g.vertices.map((v) => v.id)].sort((a, b) => nb.get(b)!.size - nb.get(a)!.size);
  const color = new Map<VertexId, number>();
  const tryK = (k: number, i: number): boolean => {
    if (i === order.length) return true;
    const v = order[i];
    const banned = new Set<number>();
    for (const u of nb.get(v)!) if (color.has(u)) banned.add(color.get(u)!);
    const maxUsed = Math.max(0, ...color.values());
    for (let c = 1; c <= Math.min(k, maxUsed + 1); c++) {
      if (banned.has(c)) continue;
      color.set(v, c);
      if (tryK(k, i + 1)) return true;
      color.delete(v);
    }
    return false;
  };
  for (let k = 1; k <= n; k++) {
    color.clear();
    if (tryK(k, 0)) return k;
  }
  return n;
}

/**
 * Một thứ tự giúp Greedy đạt χ(G): sắp đỉnh theo lớp màu của một cách tô tối ưu
 * (Tính chất 5.15). Dùng cho gợi ý và kiểm thử.
 */
export function optimalGreedyOrder(g: Graph): VertexId[] {
  const k = chromaticNumber(g);
  const nb = undirectedNeighbors(g);
  const ids = g.vertices.map((v) => v.id);
  const color = new Map<VertexId, number>();
  const solve = (i: number): boolean => {
    if (i === ids.length) return true;
    const v = ids[i];
    for (let c = 1; c <= k; c++) {
      if ([...nb.get(v)!].some((u) => color.get(u) === c)) continue;
      color.set(v, c);
      if (solve(i + 1)) return true;
      color.delete(v);
    }
    return false;
  };
  solve(0);
  return [...ids].sort((a, b) => color.get(a)! - color.get(b)! || ids.indexOf(a) - ids.indexOf(b));
}
