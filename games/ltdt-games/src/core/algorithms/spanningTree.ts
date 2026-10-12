// Kruskal và Prim tham chiếu (bộ chấm và phần phát lại của Thành phố bùn).

import { adjacency, UnionFind, vertexIds, type Edge, type Graph, type VertexId } from "../graph";

export interface MstOptions {
  /** cạnh bắt buộc phải có (Bài 24c) */
  forced?: string[];
  /** cạnh không được dùng (đường hỏng, Bài 21) */
  excluded?: string[];
}

export type KruskalReason = "forced" | "accepted" | "cycle";

export interface KruskalStep {
  edge: Edge;
  accepted: boolean;
  reason: KruskalReason;
}

export interface MstResult<S> {
  steps: S[];
  tree: string[];
  total: number;
}

/** Kruskal: xét cạnh theo trọng số tăng dần (hòa: theo thứ tự khai báo). */
export function kruskal(g: Graph, opts: MstOptions = {}): MstResult<KruskalStep> {
  const forced = new Set(opts.forced ?? []);
  const excluded = new Set(opts.excluded ?? []);
  const order = new Map(g.edges.map((e, i) => [e.id, i]));
  const candidates = g.edges
    .filter((e) => !excluded.has(e.id))
    .sort((a, b) => {
      const fa = forced.has(a.id) ? 0 : 1;
      const fb = forced.has(b.id) ? 0 : 1;
      if (fa !== fb) return fa - fb;
      return (a.w ?? 0) - (b.w ?? 0) || order.get(a.id)! - order.get(b.id)!;
    });
  const uf = new UnionFind(vertexIds(g));
  const steps: KruskalStep[] = [];
  const tree: string[] = [];
  let total = 0;
  for (const e of candidates) {
    if (tree.length === g.vertices.length - 1) break;
    const ok = uf.union(e.u, e.v);
    const reason: KruskalReason = ok ? (forced.has(e.id) ? "forced" : "accepted") : "cycle";
    steps.push({ edge: e, accepted: ok, reason });
    if (ok) {
      tree.push(e.id);
      total += e.w ?? 0;
    }
  }
  return { steps, tree, total };
}

export interface PrimStep {
  /** cạnh được thêm vào cây */
  edge: Edge;
  /** đỉnh mới được kéo vào cây */
  added: VertexId;
  /** các cạnh ứng viên (một đầu trong cây, một đầu ngoài cây) tại thời điểm chọn */
  frontier: string[];
}

/** Prim từ đỉnh `start`: mỗi bước chọn cạnh rẻ nhất đi ra khỏi cây (hòa: theo thứ tự khai báo). */
export function prim(g: Graph, start: VertexId, opts: MstOptions = {}): MstResult<PrimStep> {
  const forced = new Set(opts.forced ?? []);
  const excluded = new Set(opts.excluded ?? []);
  const adj = adjacency(g);
  const order = new Map(g.edges.map((e, i) => [e.id, i]));
  const inTree = new Set<VertexId>([start]);
  const steps: PrimStep[] = [];
  const tree: string[] = [];
  let total = 0;
  const key = (e: Edge) => (forced.has(e.id) ? -Infinity : (e.w ?? 0));
  while (inTree.size < g.vertices.length) {
    const frontier: Edge[] = [];
    for (const u of inTree) {
      for (const { v, edge } of adj.get(u)!) {
        if (!inTree.has(v) && !excluded.has(edge.id)) frontier.push(edge);
      }
    }
    if (!frontier.length) break;
    frontier.sort((a, b) => key(a) - key(b) || order.get(a.id)! - order.get(b.id)!);
    const best = frontier[0];
    const added = inTree.has(best.u) ? best.v : best.u;
    inTree.add(added);
    tree.push(best.id);
    total += best.w ?? 0;
    const uniq = [...new Set(frontier.map((e) => e.id))].sort((a, b) => order.get(a)! - order.get(b)!);
    steps.push({ edge: best, added, frontier: uniq });
  }
  return { steps, tree, total };
}
