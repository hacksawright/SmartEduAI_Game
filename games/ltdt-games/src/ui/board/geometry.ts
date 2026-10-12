// Hình học của bàn cờ đồ thị: co giãn theo khung, xoay dọc trên màn hẹp, đường cong cho cạnh song song,
// cắt cạnh tại mép đỉnh và đầu mũi tên. Mọi tọa độ ở đây là tọa độ logic của màn chơi (SVG user units).

import type { Edge, Graph, VertexId } from "../../core/graph";

export interface Pt {
  x: number;
  y: number;
}

export interface Layout {
  /** tọa độ logic đã xoay (nếu có) */
  pos: Map<VertexId, Pt>;
  transposed: boolean;
  /** số px màn hình cho 1 đơn vị logic */
  scale: number;
  viewBox: { x: number; y: number; w: number; h: number };
  /** bán kính đỉnh (logic) */
  r: number;
  /** bán kính vùng chạm (logic) */
  hitR: number;
}

export interface FitOptions {
  allowTranspose?: boolean;
  /** bán kính đỉnh mong muốn trên màn hình (px) */
  radiusPx?: number;
  /** khoảng chừa quanh đỉnh cho nhãn phụ (px màn hình) */
  marginPx?: number;
  /** tỉ lệ tối đa (tránh phóng quá to trên màn rộng) */
  maxScale?: number;
  /** khung cố định (tọa độ logic): bố cục theo khung này thay vì theo vị trí đỉnh, để đỉnh di chuyển mà bảng không co giãn */
  frame?: Frame | null;
}

export interface Frame {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function bounds(pts: Pt[]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { minX, minY, maxX, maxY };
}

function fitOne(pts: Pt[], w: number, h: number, o: Required<FitOptions>) {
  const b = bounds(pts);
  const bw = Math.max(1, b.maxX - b.minX);
  const bh = Math.max(1, b.maxY - b.minY);
  // Lặp hai lần: lề phụ thuộc bán kính logic, bán kính logic phụ thuộc tỉ lệ.
  let s = Math.min(w / (bw + 140), h / (bh + 140));
  let pad = 70;
  for (let i = 0; i < 3; i++) {
    const r = Math.min(40, o.radiusPx / s);
    pad = r + o.marginPx / s;
    s = Math.min(w / (bw + 2 * pad), h / (bh + 2 * pad), o.maxScale);
  }
  const r = Math.min(40, o.radiusPx / s);
  pad = r + o.marginPx / s;
  // căn giữa nội dung trong khung
  const vw = w / s;
  const vh = h / s;
  const cx = (b.minX + b.maxX) / 2;
  const cy = (b.minY + b.maxY) / 2;
  return { s, r, pad, viewBox: { x: cx - vw / 2, y: cy - vh / 2, w: vw, h: vh } };
}

export function fitLayout(g: Graph, w: number, h: number, opts: FitOptions = {}): Layout {
  const o: Required<FitOptions> = {
    allowTranspose: opts.allowTranspose ?? true,
    radiusPx: opts.radiusPx ?? 25,
    marginPx: opts.marginPx ?? 26,
    maxScale: opts.maxScale ?? 1.5,
    frame: opts.frame ?? null,
  };
  const f = o.frame;
  const normal = f
    ? [
        { x: f.minX, y: f.minY },
        { x: f.maxX, y: f.maxY },
      ]
    : g.vertices.map((v) => ({ x: v.x, y: v.y }));
  const width = Math.max(1, w);
  const height = Math.max(1, h);
  const a = fitOne(normal, width, height, o);
  let transposed = false;
  let pick = a;
  if (o.allowTranspose) {
    const t = fitOne(
      normal.map((p) => ({ x: p.y, y: p.x })),
      width,
      height,
      o,
    );
    if (t.s >= a.s * 1.15) {
      transposed = true;
      pick = t;
    }
  }
  const pos = new Map<VertexId, Pt>();
  for (const v of g.vertices) pos.set(v.id, transposed ? { x: v.y, y: v.x } : { x: v.x, y: v.y });
  const hitR = Math.min(48, Math.max(pick.r + 4 / pick.s, 26 / pick.s));
  return { pos, transposed, scale: pick.s, viewBox: pick.viewBox, r: pick.r, hitR };
}

/** Bố cục cố định cho hình thu nhỏ (thẻ màn, thẻ Vì sao?). */
export function staticLayout(g: Graph, r = 30, pad = 24): Layout {
  const pts = g.vertices.map((v) => ({ x: v.x, y: v.y }));
  const b = bounds(pts);
  const m = r + pad;
  const pos = new Map<VertexId, Pt>(g.vertices.map((v) => [v.id, { x: v.x, y: v.y }]));
  return {
    pos,
    transposed: false,
    scale: 1,
    viewBox: { x: b.minX - m, y: b.minY - m, w: b.maxX - b.minX + 2 * m, h: b.maxY - b.minY + 2 * m },
    r,
    hitR: r,
  };
}

/** Độ lệch cong cho từng cạnh: cạnh song song (đa đồ thị) tách thành các cung. */
export function edgeCurves(g: Graph, spacing = 54): Map<string, number> {
  const groups = new Map<string, Edge[]>();
  for (const e of g.edges) {
    const k = e.u < e.v ? `${e.u}|${e.v}` : `${e.v}|${e.u}`;
    const arr = groups.get(k) ?? [];
    arr.push(e);
    groups.set(k, arr);
  }
  const out = new Map<string, number>();
  for (const arr of groups.values()) {
    const n = arr.length;
    arr.forEach((e, i) => {
      // cùng một hướng chuẩn hóa để hai cung tách về hai phía
      const sign = e.u < e.v ? 1 : -1;
      out.set(e.id, n === 1 ? 0 : (i - (n - 1) / 2) * spacing * sign);
    });
  }
  return out;
}

const sub = (a: Pt, b: Pt): Pt => ({ x: a.x - b.x, y: a.y - b.y });
const len = (p: Pt) => Math.hypot(p.x, p.y);

function quad(a: Pt, c: Pt, b: Pt, t: number): Pt {
  const m = 1 - t;
  return { x: m * m * a.x + 2 * m * t * c.x + t * t * b.x, y: m * m * a.y + 2 * m * t * c.y + t * t * b.y };
}

function quadTangent(a: Pt, c: Pt, b: Pt, t: number): Pt {
  return { x: 2 * (1 - t) * (c.x - a.x) + 2 * t * (b.x - c.x), y: 2 * (1 - t) * (c.y - a.y) + 2 * t * (b.y - c.y) };
}

/** tham số t trên đường cong cách điểm p đúng khoảng d (tìm nhị phân, p là một đầu mút) */
function tAtDistance(a: Pt, c: Pt, b: Pt, fromEnd: boolean, d: number): number {
  let lo = fromEnd ? 0.5 : 0;
  let hi = fromEnd ? 1 : 0.5;
  const p = fromEnd ? b : a;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    const dist = len(sub(quad(a, c, b, mid), p));
    if (fromEnd) {
      if (dist > d) lo = mid;
      else hi = mid;
    } else if (dist < d) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export interface EdgeGeom {
  /** đường từ mép đỉnh đầu tới mép đỉnh cuối (hoặc tới gốc mũi tên) */
  d: string;
  /** đường đảo chiều (vẽ từ v sang u) */
  dRev: string;
  /** điểm giữa để đặt nhãn trọng số */
  mid: Pt;
  /** đầu mũi tên (chỉ khi có hướng) */
  arrow?: string;
}

/**
 * Hình học một cạnh. `curve` là độ lệch của điểm điều khiển theo pháp tuyến;
 * `arrow` là chiều dài mũi tên (0 nếu vô hướng).
 */
export function edgeGeom(a: Pt, b: Pt, r: number, curve: number, arrow: number): EdgeGeom {
  const v = sub(b, a);
  const L = Math.max(1e-6, len(v));
  const n = { x: -v.y / L, y: v.x / L };
  const c = { x: (a.x + b.x) / 2 + n.x * curve, y: (a.y + b.y) / 2 + n.y * curve };
  const t0 = tAtDistance(a, c, b, false, r);
  const tTip = tAtDistance(a, c, b, true, r);
  const tEnd = arrow > 0 ? tAtDistance(a, c, b, true, r + arrow * 0.8) : tTip;
  const p0 = quad(a, c, b, t0);
  const p1 = quad(a, c, b, tEnd);
  // điểm điều khiển của đoạn con [t0, tEnd]
  const ctrl = subControl(a, c, b, t0, tEnd);
  const f = (x: number) => Math.round(x * 10) / 10;
  const d = curve === 0 ? `M${f(p0.x)} ${f(p0.y)}L${f(p1.x)} ${f(p1.y)}` : `M${f(p0.x)} ${f(p0.y)}Q${f(ctrl.x)} ${f(ctrl.y)} ${f(p1.x)} ${f(p1.y)}`;
  const dRev =
    curve === 0 ? `M${f(p1.x)} ${f(p1.y)}L${f(p0.x)} ${f(p0.y)}` : `M${f(p1.x)} ${f(p1.y)}Q${f(ctrl.x)} ${f(ctrl.y)} ${f(p0.x)} ${f(p0.y)}`;
  const mid = quad(a, c, b, 0.5);
  let arrowPath: string | undefined;
  if (arrow > 0) {
    const tip = quad(a, c, b, tTip);
    const tan = quadTangent(a, c, b, tTip);
    const tl = Math.max(1e-6, len(tan));
    const ux = tan.x / tl;
    const uy = tan.y / tl;
    const w = arrow * 0.55;
    const bx = tip.x - ux * arrow;
    const by = tip.y - uy * arrow;
    arrowPath = `M${f(tip.x)} ${f(tip.y)}L${f(bx - uy * w)} ${f(by + ux * w)}L${f(bx + uy * w)} ${f(by - ux * w)}Z`;
  }
  return { d, dRev, mid, arrow: arrowPath };
}

/** điểm điều khiển của đoạn Bézier bậc hai giới hạn trong [t0, t1] */
function subControl(a: Pt, c: Pt, b: Pt, t0: number, t1: number): Pt {
  // B'(t) tuyến tính; điểm điều khiển = P(t0) + (t1 - t0)/2 · B'(t0)
  const p = quad(a, c, b, t0);
  const d = quadTangent(a, c, b, t0);
  const k = (t1 - t0) / 2;
  return { x: p.x + d.x * k, y: p.y + d.y * k };
}

/** Chuyển tọa độ con trỏ sang tọa độ logic của SVG. */
export function clientToSvg(svg: SVGSVGElement, clientX: number, clientY: number): Pt | null {
  const m = svg.getScreenCTM();
  if (!m) return null;
  const p = new DOMPoint(clientX, clientY).matrixTransform(m.inverse());
  return { x: p.x, y: p.y };
}

/** Đỉnh gần điểm p nhất trong bán kính hitR. */
export function vertexAt(layout: Layout, p: Pt): VertexId | null {
  let best: VertexId | null = null;
  let bd = layout.hitR;
  for (const [id, q] of layout.pos) {
    const d = Math.hypot(q.x - p.x, q.y - p.y);
    if (d <= bd) {
      bd = d;
      best = id;
    }
  }
  return best;
}
