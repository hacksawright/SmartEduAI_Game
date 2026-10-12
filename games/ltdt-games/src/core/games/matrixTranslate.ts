// Luật chơi Dịch ma trận (Ch.1): so sánh tập cạnh sau khi chuẩn hóa (mục 4.4 kế hoạch).

import { indexMap, type Graph, type VertexId } from "../graph";

/** Khóa chuẩn hóa: vô hướng → (min, max) theo chỉ số; có hướng → giữ chiều. */
export function edgeKey(g: Graph, u: VertexId, v: VertexId): string {
  if (g.directed) return `${u}>${v}`;
  const idx = indexMap(g);
  return idx.get(u)! <= idx.get(v)! ? `${u}|${v}` : `${v}|${u}`;
}

export function targetKeys(g: Graph): string[] {
  return [...new Set(g.edges.map((e) => edgeKey(g, e.u, e.v)))].sort();
}

export function toggleKey(keys: string[], key: string): string[] {
  return keys.includes(key) ? keys.filter((k) => k !== key) : [...keys, key].sort();
}

/** Số cạnh / ô sai = hiệu đối xứng giữa đáp án và tập cạnh đúng. */
export function compareKeys(g: Graph, answer: string[]): { correct: boolean; missing: number; extra: number } {
  const want = new Set(targetKeys(g));
  const got = new Set(answer);
  let missing = 0;
  let extra = 0;
  for (const k of want) if (!got.has(k)) missing++;
  for (const k of got) if (!want.has(k)) extra++;
  return { correct: missing === 0 && extra === 0, missing, extra };
}

export function adjacencyMatrix(g: Graph): number[][] {
  const idx = indexMap(g);
  const n = g.vertices.length;
  const m = Array.from({ length: n }, () => Array<number>(n).fill(0));
  for (const e of g.edges) {
    const i = idx.get(e.u)!;
    const j = idx.get(e.v)!;
    m[i][j] = 1;
    if (!g.directed) m[j][i] = 1;
  }
  return m;
}

/** Ma trận liên thuộc: hàng = đỉnh, cột = cạnh e1..em (vô hướng). */
export function incidenceMatrix(g: Graph): number[][] {
  const idx = indexMap(g);
  return g.vertices.map((_, i) =>
    g.edges.map((e) => (idx.get(e.u) === i || idx.get(e.v) === i ? 1 : 0)),
  );
}

export function adjacencyList(g: Graph): Record<VertexId, VertexId[]> {
  const idx = indexMap(g);
  const out: Record<VertexId, VertexId[]> = {};
  for (const v of g.vertices) out[v.id] = [];
  for (const e of g.edges) {
    out[e.u].push(e.v);
    if (!g.directed) out[e.v].push(e.u);
  }
  for (const k of Object.keys(out)) out[k].sort((a, b) => idx.get(a)! - idx.get(b)!);
  return out;
}
