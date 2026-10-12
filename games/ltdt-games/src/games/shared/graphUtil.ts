import type { Edge, Graph, VertexId } from "../../core/graph";

/** Cạnh nối u với v (có hướng: cung u → v). Đa đồ thị: cạnh đầu tiên. */
export function findEdge(g: Graph, u: VertexId, v: VertexId): Edge | undefined {
  return g.edges.find((e) => (e.u === u && e.v === v) || (!g.directed && e.u === v && e.v === u));
}

/** id các cạnh của cây từ mảng pred. */
export function treeEdgeIds(g: Graph, pred: Record<VertexId, VertexId | null>): Set<string> {
  const out = new Set<string>();
  for (const [v, u] of Object.entries(pred)) {
    if (u === null || u === undefined) continue;
    const e = findEdge(g, u, v);
    if (e) out.add(e.id);
  }
  return out;
}

export function fmtTime(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function joinVi(xs: string[]): string {
  if (xs.length <= 1) return xs.join("");
  return `${xs.slice(0, -1).join(", ")} và ${xs[xs.length - 1]}`;
}
