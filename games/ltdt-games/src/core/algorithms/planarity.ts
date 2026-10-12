// Đồ thị phẳng (Ch.4): đếm giao cắt của một cách vẽ bằng đoạn thẳng, và chấm bằng chứng "không phẳng".
// Không cần thuật toán kiểm tra tính phẳng tổng quát: mỗi bằng chứng (vượt chặn số cạnh, chứa K₅ hay K₃,₃)
// đã đủ để kết luận đồ thị không phẳng, nên chấm bằng chứng là chấm đúng.

import { adjacency, indexMap, type Graph, type VertexId } from "../graph";

export interface Pt {
  x: number;
  y: number;
}

export type Positions = Record<VertexId, Pt>;

export interface Crossing {
  /** hai cạnh không chung đầu mút cắt nhau */
  e1: string;
  e2: string;
  at: Pt;
}

export interface Touch {
  /** đỉnh nằm sát (hoặc trên) một cạnh không nối với nó */
  v: VertexId;
  edge: string;
}

export interface Conflicts {
  crossings: Crossing[];
  touches: Touch[];
}

/** Khoảng cách tối thiểu từ một đỉnh tới cạnh không nối với nó (đơn vị logic của màn chơi). */
export const EDGE_CLEARANCE = 24;

const orient = (a: Pt, b: Pt, c: Pt) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
const EPS = 1e-9;

function onSegment(a: Pt, b: Pt, p: Pt): boolean {
  return (
    Math.min(a.x, b.x) - EPS <= p.x &&
    p.x <= Math.max(a.x, b.x) + EPS &&
    Math.min(a.y, b.y) - EPS <= p.y &&
    p.y <= Math.max(a.y, b.y) + EPS
  );
}

/** Hai đoạn thẳng AB và CD có điểm chung (kể cả chạm hoặc chồng lên nhau). */
export function segmentsIntersect(a: Pt, b: Pt, c: Pt, d: Pt): boolean {
  const o1 = orient(a, b, c);
  const o2 = orient(a, b, d);
  const o3 = orient(c, d, a);
  const o4 = orient(c, d, b);
  if (((o1 > EPS && o2 < -EPS) || (o1 < -EPS && o2 > EPS)) && ((o3 > EPS && o4 < -EPS) || (o3 < -EPS && o4 > EPS)))
    return true;
  if (Math.abs(o1) <= EPS && onSegment(a, b, c)) return true;
  if (Math.abs(o2) <= EPS && onSegment(a, b, d)) return true;
  if (Math.abs(o3) <= EPS && onSegment(c, d, a)) return true;
  if (Math.abs(o4) <= EPS && onSegment(c, d, b)) return true;
  return false;
}

/** Giao điểm của hai đường thẳng AB, CD (dùng để đánh dấu chỗ cắt); song song thì lấy trung điểm. */
function crossPoint(a: Pt, b: Pt, c: Pt, d: Pt): Pt {
  const den = (b.x - a.x) * (d.y - c.y) - (b.y - a.y) * (d.x - c.x);
  if (Math.abs(den) < EPS) return { x: (a.x + b.x + c.x + d.x) / 4, y: (a.y + b.y + c.y + d.y) / 4 };
  const t = ((c.x - a.x) * (d.y - c.y) - (c.y - a.y) * (d.x - c.x)) / den;
  return { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
}

export function pointSegmentDistance(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const L = dx * dx + dy * dy;
  const t = L < EPS ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / L));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** Mọi chỗ cắt nhau và chỗ đỉnh đè lên cạnh của cách vẽ `pos` (cạnh là đoạn thẳng). */
export function conflicts(g: Graph, pos: Positions): Conflicts {
  const crossings: Crossing[] = [];
  const touches: Touch[] = [];
  const E = g.edges;
  for (let i = 0; i < E.length; i++) {
    const a = pos[E[i].u];
    const b = pos[E[i].v];
    for (let j = i + 1; j < E.length; j++) {
      const e = E[j];
      if (e.u === E[i].u || e.u === E[i].v || e.v === E[i].u || e.v === E[i].v) continue;
      const c = pos[e.u];
      const d = pos[e.v];
      if (segmentsIntersect(a, b, c, d)) crossings.push({ e1: E[i].id, e2: e.id, at: crossPoint(a, b, c, d) });
    }
    for (const v of g.vertices) {
      if (v.id === E[i].u || v.id === E[i].v) continue;
      if (pointSegmentDistance(pos[v.id], a, b) < EDGE_CLEARANCE) touches.push({ v: v.id, edge: E[i].id });
    }
  }
  return { crossings, touches };
}

export const conflictCount = (c: Conflicts) => c.crossings.length + c.touches.length;

export function positionsOf(g: Graph): Positions {
  return Object.fromEntries(g.vertices.map((v) => [v.id, { x: v.x, y: v.y }]));
}

// ---------------------------------------------------------------- bằng chứng không phẳng

export type PlanarityProof =
  /** m > 3n − 6 (đồ thị phẳng đơn, n ≥ 3, luôn có m ≤ 3n − 6) */
  | { kind: "edges" }
  /** không có tam giác và m > 2n − 4 */
  | { kind: "edges-no-triangle" }
  /** 5 đỉnh đôi một kề nhau */
  | { kind: "k5"; vertices: VertexId[] }
  /** hai nhóm 3 đỉnh, mỗi đỉnh nhóm này kề mọi đỉnh nhóm kia */
  | { kind: "k33"; a: VertexId[]; b: VertexId[] };

/** Một tam giác (3 đỉnh đôi một kề nhau) theo chỉ số nhỏ nhất, hoặc null. */
export function findTriangle(g: Graph): [VertexId, VertexId, VertexId] | null {
  const adj = adjacency({ ...g, directed: false });
  const idx = indexMap(g);
  const nb = new Map([...adj].map(([v, l]) => [v, new Set(l.map((x) => x.v))]));
  for (const u of g.vertices) {
    const later = [...nb.get(u.id)!].filter((v) => idx.get(v)! > idx.get(u.id)!).sort((a, b) => idx.get(a)! - idx.get(b)!);
    for (let i = 0; i < later.length; i++)
      for (let j = i + 1; j < later.length; j++) if (nb.get(later[i])!.has(later[j])) return [u.id, later[i], later[j]];
  }
  return null;
}

function adjacent(g: Graph, u: VertexId, v: VertexId): boolean {
  return g.edges.some((e) => (e.u === u && e.v === v) || (e.u === v && e.v === u));
}

export function judgeProof(g: Graph, proof: PlanarityProof): { correct: boolean; reason: string } {
  const n = g.vertices.length;
  const m = g.edges.length;
  const known = new Set(g.vertices.map((v) => v.id));
  switch (proof.kind) {
    case "edges": {
      const bound = 3 * n - 6;
      if (m > bound) return { correct: true, reason: "" };
      return {
        correct: false,
        reason: `m = ${m}, 3n − 6 = ${bound}. Vì ${m} ≤ ${bound} nên bất đẳng thức vẫn đúng: đếm cạnh kiểu này chưa chứng minh được gì.`,
      };
    }
    case "edges-no-triangle": {
      const tri = findTriangle(g);
      if (tri) {
        return {
          correct: false,
          reason: `Đồ thị có tam giác ${tri.join("–")}, nên không dùng được chặn m ≤ 2n − 4 (chặn này chỉ đúng khi mọi chu trình dài ít nhất 4).`,
        };
      }
      const bound = 2 * n - 4;
      if (m > bound) return { correct: true, reason: "" };
      return { correct: false, reason: `m = ${m}, 2n − 4 = ${bound}. Vì ${m} ≤ ${bound} nên chặn này vẫn đúng.` };
    }
    case "k5": {
      const vs = [...new Set(proof.vertices)].filter((v) => known.has(v));
      if (vs.length !== 5) return { correct: false, reason: `K₅ cần đúng 5 đỉnh; bạn đang chọn ${vs.length}.` };
      for (let i = 0; i < 5; i++)
        for (let j = i + 1; j < 5; j++)
          if (!adjacent(g, vs[i], vs[j])) return { correct: false, reason: `${vs[i]} và ${vs[j]} không kề nhau, nên 5 đỉnh này chưa tạo thành K₅.` };
      return { correct: true, reason: "" };
    }
    case "k33": {
      const a = [...new Set(proof.a)].filter((v) => known.has(v));
      const b = [...new Set(proof.b)].filter((v) => known.has(v));
      if (a.length !== 3 || b.length !== 3)
        return { correct: false, reason: `K₃,₃ cần hai nhóm, mỗi nhóm đúng 3 đỉnh; bạn đang chọn ${a.length} và ${b.length}.` };
      if (a.some((v) => b.includes(v))) return { correct: false, reason: "Một đỉnh không thể nằm ở cả hai nhóm." };
      for (const u of a)
        for (const v of b)
          if (!adjacent(g, u, v)) return { correct: false, reason: `${u} (nhóm 1) và ${v} (nhóm 2) không kề nhau, nên chưa tạo thành K₃,₃.` };
      return { correct: true, reason: "" };
    }
  }
}

/** Mọi bằng chứng đúng, theo thứ tự ưu tiên khi gợi ý: đếm cạnh trước, đồ thị con sau. */
export function validProofs(g: Graph): PlanarityProof[] {
  const out: PlanarityProof[] = [];
  if (judgeProof(g, { kind: "edges" }).correct) out.push({ kind: "edges" });
  if (judgeProof(g, { kind: "edges-no-triangle" }).correct) out.push({ kind: "edges-no-triangle" });
  const k5 = findK5(g);
  if (k5) out.push({ kind: "k5", vertices: k5 });
  const k33 = findK33(g);
  if (k33) out.push({ kind: "k33", a: k33[0], b: k33[1] });
  return out;
}

function combos<T>(arr: T[], k: number): T[][] {
  const out: T[][] = [];
  const pick: T[] = [];
  const go = (from: number) => {
    if (pick.length === k) {
      out.push([...pick]);
      return;
    }
    for (let i = from; i < arr.length; i++) {
      pick.push(arr[i]);
      go(i + 1);
      pick.pop();
    }
  };
  go(0);
  return out;
}

export function findK5(g: Graph): VertexId[] | null {
  const ids = g.vertices.map((v) => v.id);
  for (const c of combos(ids, 5)) if (judgeProof(g, { kind: "k5", vertices: c }).correct) return c;
  return null;
}

export function findK33(g: Graph): [VertexId[], VertexId[]] | null {
  const ids = g.vertices.map((v) => v.id);
  for (const six of combos(ids, 6)) {
    // nhóm 1 luôn chứa đỉnh đầu tiên để không thử mỗi cách chia hai lần
    for (const rest of combos(six.slice(1), 2)) {
      const a = [six[0], ...rest];
      const b = six.filter((v) => !a.includes(v));
      if (judgeProof(g, { kind: "k33", a, b }).correct) return [a, b];
    }
  }
  return null;
}
