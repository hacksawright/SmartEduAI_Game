// Đồ thị hai phía (Ch.4): tô 2 màu bằng BFS. Gặp cạnh nối hai đỉnh cùng màu thì lần ngược cây BFS
// để lấy một chu trình lẻ làm bằng chứng (đồ thị là hai phía ⇔ không có chu trình độ dài lẻ).

import { adjacency, type Graph, type VertexId } from "../graph";

export type Side = 0 | 1;

export type Bipartition =
  | { ok: true; side: Record<VertexId, Side>; level: Record<VertexId, number> }
  | { ok: false; oddCycle: VertexId[]; level: Record<VertexId, number> };

/** BFS từ đỉnh chỉ số nhỏ nhất của mỗi thành phần; đỉnh kề theo chỉ số tăng dần. */
export function bipartition(g: Graph): Bipartition {
  const adj = adjacency({ ...g, directed: false });
  const level: Record<VertexId, number> = {};
  const parent: Record<VertexId, VertexId | null> = {};
  for (const root of g.vertices) {
    if (level[root.id] !== undefined) continue;
    level[root.id] = 0;
    parent[root.id] = null;
    const queue = [root.id];
    for (let qi = 0; qi < queue.length; qi++) {
      const u = queue[qi];
      for (const { v } of adj.get(u)!) {
        if (level[v] === undefined) {
          level[v] = level[u] + 1;
          parent[v] = u;
          queue.push(v);
        } else if (level[v] % 2 === level[u] % 2) {
          return { ok: false, oddCycle: cycleThrough(parent, level, u, v), level };
        }
      }
    }
  }
  const side: Record<VertexId, Side> = {};
  for (const v of g.vertices) side[v.id] = (level[v.id] % 2) as Side;
  return { ok: true, side, level };
}

/** Chu trình gồm đường cây từ u lên tổ tiên chung, xuống v, và cạnh v–u. */
function cycleThrough(
  parent: Record<VertexId, VertexId | null>,
  level: Record<VertexId, number>,
  u: VertexId,
  v: VertexId,
): VertexId[] {
  const up: VertexId[] = [];
  const down: VertexId[] = [];
  let a: VertexId = u;
  let b: VertexId = v;
  while (level[a] > level[b]) {
    up.push(a);
    a = parent[a]!;
  }
  while (level[b] > level[a]) {
    down.push(b);
    b = parent[b]!;
  }
  while (a !== b) {
    up.push(a);
    down.push(b);
    a = parent[a]!;
    b = parent[b]!;
  }
  return [...up, a, ...down.reverse()];
}

/** Chấm chu trình lẻ người chơi chỉ ra: các đỉnh khác nhau, liền nhau đều kề, đỉnh cuối kề đỉnh đầu, số cạnh lẻ. */
export function judgeOddCycle(g: Graph, cycle: VertexId[]): { correct: boolean; reason: string } {
  const has = (u: VertexId, v: VertexId) => g.edges.some((e) => (e.u === u && e.v === v) || (e.u === v && e.v === u));
  if (cycle.length < 3) return { correct: false, reason: "Chu trình cần ít nhất 3 đỉnh." };
  if (new Set(cycle).size !== cycle.length) return { correct: false, reason: "Mỗi đỉnh chỉ được đi qua một lần." };
  for (let i = 0; i < cycle.length; i++) {
    const u = cycle[i];
    const v = cycle[(i + 1) % cycle.length];
    if (!has(u, v)) return { correct: false, reason: `${u} và ${v} không có đường nối, nên đây chưa phải chu trình.` };
  }
  if (cycle.length % 2 === 0)
    return {
      correct: false,
      reason: `Chu trình ${cycle.join("–")}–${cycle[0]} có ${cycle.length} cạnh (chẵn). Đi quanh chu trình chẵn, hai đội vẫn xen kẽ được.`,
    };
  return { correct: true, reason: "" };
}
