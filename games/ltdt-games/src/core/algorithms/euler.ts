// Điều kiện Euler (Định lý 3.3–3.5, giáo trình Ch.3) và thuật toán Hierholzer.

import { adjacency, degrees, inOutDegrees, isConnected, type Graph, type VertexId } from "../graph";

export type EulerKind = "circuit" | "path" | "none";

export interface EulerAnalysis {
  /** mọi cạnh nằm trong một thành phần liên thông (yếu, nếu có hướng) */
  connected: boolean;
  /** vô hướng: các đỉnh bậc lẻ, theo chỉ số tăng dần */
  odd: VertexId[];
  /** có hướng: các đỉnh có bán bậc vào ≠ bán bậc ra */
  unbalanced: VertexId[];
  kind: EulerKind;
  /** các đỉnh có thể đặt bút để vẽ hết mọi cạnh */
  starts: VertexId[];
  /** điểm kết thúc bắt buộc (khi kind = "path") */
  ends: VertexId[];
}

export function analyzeEuler(g: Graph): EulerAnalysis {
  const connected = isConnected(g, true);
  const hasEdges = g.edges.length > 0;
  if (!g.directed) {
    const deg = degrees(g);
    const odd = g.vertices.filter((v) => deg.get(v.id)! % 2 === 1).map((v) => v.id);
    let kind: EulerKind = "none";
    let starts: VertexId[] = [];
    let ends: VertexId[] = [];
    if (connected && hasEdges) {
      if (odd.length === 0) {
        kind = "circuit";
        starts = g.vertices.filter((v) => deg.get(v.id)! > 0).map((v) => v.id);
        ends = starts;
      } else if (odd.length === 2) {
        kind = "path";
        starts = odd;
        ends = odd;
      }
    }
    return { connected, odd, unbalanced: [], kind, starts, ends };
  }
  const io = inOutDegrees(g);
  const unbalanced = g.vertices.filter((v) => io.get(v.id)!.in !== io.get(v.id)!.out).map((v) => v.id);
  let kind: EulerKind = "none";
  let starts: VertexId[] = [];
  let ends: VertexId[] = [];
  if (connected && hasEdges) {
    if (unbalanced.length === 0) {
      kind = "circuit";
      starts = g.vertices.filter((v) => io.get(v.id)!.out > 0).map((v) => v.id);
      ends = starts;
    } else if (unbalanced.length === 2) {
      const plus = unbalanced.filter((v) => io.get(v)!.out - io.get(v)!.in === 1);
      const minus = unbalanced.filter((v) => io.get(v)!.in - io.get(v)!.out === 1);
      if (plus.length === 1 && minus.length === 1) {
        kind = "path";
        starts = plus;
        ends = minus;
      }
    }
  }
  return { connected, odd: [], unbalanced, kind, starts, ends };
}

export interface EulerTrail {
  vertices: VertexId[];
  edges: string[];
}

/** Tìm một đường đi/chu trình Euler bắt đầu từ `start` (Hierholzer). */
export function findEulerTrail(g: Graph, start?: VertexId): EulerTrail | null {
  const a = analyzeEuler(g);
  if (a.kind === "none") return null;
  const s = start ?? a.starts[0];
  if (!a.starts.includes(s)) return null;
  const adj = adjacency(g);
  const ptr = new Map<VertexId, number>();
  const used = new Set<string>();
  const stack: { v: VertexId; e: string | null }[] = [{ v: s, e: null }];
  const pathV: VertexId[] = [];
  const pathE: string[] = [];
  while (stack.length) {
    const top = stack[stack.length - 1];
    const list = adj.get(top.v)!;
    let i = ptr.get(top.v) ?? 0;
    while (i < list.length && used.has(list[i].edge.id)) i++;
    ptr.set(top.v, i);
    if (i < list.length) {
      used.add(list[i].edge.id);
      stack.push({ v: list[i].v, e: list[i].edge.id });
    } else {
      stack.pop();
      pathV.push(top.v);
      if (top.e) pathE.push(top.e);
    }
  }
  if (pathE.length !== g.edges.length) return null;
  return { vertices: pathV.reverse(), edges: pathE.reverse() };
}
