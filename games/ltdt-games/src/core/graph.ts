// Kiểu dữ liệu đồ thị dùng chung cho mọi game.
// Thứ tự đỉnh trong mảng `vertices` chính là "chỉ số" của đỉnh: mọi quy ước
// "duyệt đỉnh kề theo chỉ số tăng dần" (giáo trình) đều dựa vào thứ tự này.

export type VertexId = string;

export interface Vertex {
  id: VertexId;
  x: number;
  y: number;
}

export interface Edge {
  id: string;
  u: VertexId;
  v: VertexId;
  /** trọng số / chi phí; bỏ trống với đồ thị không trọng số */
  w?: number;
}

export interface Graph {
  directed: boolean;
  vertices: Vertex[];
  edges: Edge[];
}

export type EdgeSpec = string | [VertexId, VertexId, number?];

export interface GraphSpec {
  directed?: boolean;
  /** [id, x, y] */
  vertices: [VertexId, number, number][];
  /** "1-2 1-3" hoặc [["1", "2", 5], ...]. Cạnh lặp lại tạo đa đồ thị. */
  edges: EdgeSpec[] | string;
}

/** Tạo đồ thị từ đặc tả ngắn gọn trong dữ liệu màn chơi. */
export function makeGraph(spec: GraphSpec): Graph {
  const vertices = spec.vertices.map(([id, x, y]) => ({ id, x, y }));
  const known = new Set(vertices.map((v) => v.id));
  const list: [VertexId, VertexId, number?][] =
    typeof spec.edges === "string"
      ? spec.edges
          .trim()
          .split(/\s+/)
          .filter(Boolean)
          .map((tok) => parseEdgeToken(tok))
      : spec.edges.map((e) => (typeof e === "string" ? parseEdgeToken(e) : e));

  const used = new Map<string, number>();
  const edges: Edge[] = list.map(([u, v, w]) => {
    if (!known.has(u) || !known.has(v)) throw new Error(`Cạnh ${u}-${v} tham chiếu đỉnh không tồn tại`);
    const base = `${u}-${v}`;
    const k = (used.get(base) ?? 0) + 1;
    used.set(base, k);
    const edge: Edge = { id: k === 1 ? base : `${base}~${k}`, u, v };
    if (w !== undefined) edge.w = w;
    return edge;
  });
  return { directed: !!spec.directed, vertices, edges };
}

function parseEdgeToken(tok: string): [VertexId, VertexId, number?] {
  // "1-2" hoặc "A-B:5"
  const [pair, w] = tok.split(":");
  const [u, v] = pair.split("-");
  if (!u || !v) throw new Error(`Không đọc được cạnh "${tok}"`);
  return w === undefined ? [u, v] : [u, v, Number(w)];
}

export function indexMap(g: Graph): Map<VertexId, number> {
  return new Map(g.vertices.map((v, i) => [v.id, i]));
}

export function vertexIds(g: Graph): VertexId[] {
  return g.vertices.map((v) => v.id);
}

export function otherEnd(e: Edge, x: VertexId): VertexId {
  return e.u === x ? e.v : e.u;
}

export interface Adjacent {
  v: VertexId;
  edge: Edge;
}

/**
 * Danh sách kề, mỗi danh sách sắp theo chỉ số đỉnh kề tăng dần.
 * Đồ thị có hướng: chỉ các cung đi ra.
 */
export function adjacency(g: Graph): Map<VertexId, Adjacent[]> {
  const idx = indexMap(g);
  const adj = new Map<VertexId, Adjacent[]>(g.vertices.map((v) => [v.id, []]));
  for (const e of g.edges) {
    adj.get(e.u)!.push({ v: e.v, edge: e });
    if (!g.directed && e.u !== e.v) adj.get(e.v)!.push({ v: e.u, edge: e });
  }
  for (const list of adj.values()) list.sort((a, b) => idx.get(a.v)! - idx.get(b.v)!);
  return adj;
}

/** Bậc của đỉnh (đồ thị vô hướng; khuyên tính 2). */
export function degrees(g: Graph): Map<VertexId, number> {
  const deg = new Map<VertexId, number>(g.vertices.map((v) => [v.id, 0]));
  for (const e of g.edges) {
    deg.set(e.u, deg.get(e.u)! + 1);
    deg.set(e.v, deg.get(e.v)! + 1);
  }
  return deg;
}

/** Bán bậc vào/ra (đồ thị có hướng). */
export function inOutDegrees(g: Graph): Map<VertexId, { in: number; out: number }> {
  const m = new Map(g.vertices.map((v) => [v.id, { in: 0, out: 0 }]));
  for (const e of g.edges) {
    m.get(e.u)!.out++;
    m.get(e.v)!.in++;
  }
  return m;
}

export class UnionFind {
  private parent = new Map<string, string>();
  private rank = new Map<string, number>();

  constructor(items: Iterable<string>) {
    for (const x of items) {
      this.parent.set(x, x);
      this.rank.set(x, 0);
    }
  }

  find(x: string): string {
    let root = x;
    while (this.parent.get(root) !== root) root = this.parent.get(root)!;
    let cur = x;
    while (cur !== root) {
      const next = this.parent.get(cur)!;
      this.parent.set(cur, root);
      cur = next;
    }
    return root;
  }

  /** Trả về false nếu a, b đã cùng thành phần (nối thêm sẽ tạo chu trình). */
  union(a: string, b: string): boolean {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra === rb) return false;
    const ka = this.rank.get(ra)!;
    const kb = this.rank.get(rb)!;
    if (ka < kb) this.parent.set(ra, rb);
    else if (ka > kb) this.parent.set(rb, ra);
    else {
      this.parent.set(rb, ra);
      this.rank.set(ra, ka + 1);
    }
    return true;
  }
}

/**
 * Các thành phần liên thông (bỏ qua hướng cạnh), xét trên tập cạnh cho trước.
 * Mỗi thành phần là danh sách đỉnh theo chỉ số tăng dần.
 */
export function components(g: Graph, edges: Edge[] = g.edges): VertexId[][] {
  const uf = new UnionFind(vertexIds(g));
  for (const e of edges) uf.union(e.u, e.v);
  const groups = new Map<string, VertexId[]>();
  for (const v of g.vertices) {
    const r = uf.find(v.id);
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r)!.push(v.id);
  }
  return [...groups.values()];
}

/**
 * Liên thông (yếu với đồ thị có hướng). `ignoreIsolated` bỏ qua đỉnh không có cạnh,
 * đúng với điều kiện của đường đi Euler.
 */
export function isConnected(g: Graph, ignoreIsolated = false): boolean {
  if (g.vertices.length === 0) return true;
  let comps = components(g);
  if (ignoreIsolated) {
    const touched = new Set(g.edges.flatMap((e) => [e.u, e.v]));
    comps = comps.filter((c) => c.some((v) => touched.has(v)));
    return comps.length <= 1;
  }
  return comps.length === 1;
}

export function edgeMap(g: Graph): Map<string, Edge> {
  return new Map(g.edges.map((e) => [e.id, e]));
}

export function sumWeights(g: Graph, edgeIds: Iterable<string>): number {
  const m = edgeMap(g);
  let s = 0;
  for (const id of edgeIds) s += m.get(id)?.w ?? 0;
  return s;
}
