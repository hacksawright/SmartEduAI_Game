// Bản đồ Thành phố bùn (docs/ART_DIRECTION.md mục 3.4): nhà là đỉnh, đường đất là cạnh, nền cỏ.
// Chạm con đường hoặc thẻ giá của nó (hoặc Tab rồi Enter) để lát/bỏ lát. Bố cục dùng chung fitLayout
// với GraphBoard; nét và chữ tính theo px màn hình, nhà và cây tính theo kích thước nhà S.
// Lớp vẽ: đường → người dân → cây → nhà → thẻ giá → chữ tên nhà. Nhà chặn chạm (gần nhà nhiều đường
// chụm lại), nên thẻ giá luôn nằm trên nhà, đặt giữa phần đường không bị nhà che, và chạm được.

import { useId, useMemo, type CSSProperties, type KeyboardEvent } from "react";
import { useGames } from "../../app/GamesContext";
import type { Edge, Graph, VertexId } from "../../core/graph";
import { fitLayout, type Layout, type Pt } from "../../ui/board/geometry";
import { useSize } from "../../ui/board/useSize";

export type RoadTone = "cycle" | "hint" | "accept" | "reject" | "frontier";

export interface RoadView {
  paved?: boolean;
  /** lát sẵn, không gỡ được (ổ khóa) */
  locked?: boolean;
  /** đường hỏng (ngập nước), không lát được */
  broken?: boolean;
  tone?: RoadTone;
  /** đường sinh viên đã lát (vạch đứt giữa đường, khi xem phát lại) */
  mine?: boolean;
  /** tăng để chạy hiệu ứng lát đá dần từ paveFrom */
  pave?: number;
  paveFrom?: VertexId;
  /** tăng để chạy hiệu ứng gỡ lớp đá */
  unpave?: number;
  /** tăng để rung thẻ giá */
  shake?: number;
  ariaLabel?: string;
}

export interface HouseView {
  /** sân sáng màu (Prim: nhà đã vào cây) */
  glow?: boolean;
  /** tăng để nhà nảy lên */
  pop?: number;
}

export interface TownBoardProps {
  graph: Graph;
  /** mô tả cho trình đọc màn hình */
  label: string;
  road: (e: Edge) => RoadView;
  house?: (id: VertexId) => HouseView | undefined;
  /** bỏ trống: bản đồ chỉ để xem */
  onRoad?: (id: string) => void;
  /** các đường người dân đi dạo (sau khi cả làng đã nối với nhau) */
  walk?: string[] | null;
  /** chọn kiểu nhà và cây trang trí cố định cho mỗi màn */
  seed: string;
}

const HOUSES = ["house-1", "house-3", "house-10", "house-2", "house-7", "house-9", "house-4"];

/** cây, bụi, đá: kích thước ảnh so với nhà, trọng số khi chọn ngẫu nhiên */
const DECOR: { src: string; k: number; w: number }[] = [
  { src: "tree-pine", k: 1.0, w: 3 },
  { src: "tree-pine-small", k: 0.8, w: 2 },
  { src: "tree-cypress", k: 0.95, w: 2 },
  { src: "tree-cypress-small", k: 0.75, w: 1 },
  { src: "bush-1", k: 0.85, w: 2 },
  { src: "bush-2", k: 0.85, w: 2 },
  { src: "rock-1", k: 0.75, w: 0.8 },
  { src: "rock-2", k: 0.6, w: 0.6 },
  { src: "stump", k: 0.9, w: 0.4 },
  { src: "log", k: 0.75, w: 0.4 },
];

// biểu tượng 24×24 (nét), cùng kiểu lucide
const LOCK = "M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4";
const WAVES = "M2 8c2-2 4-2 6 0s4 2 6 0 4-2 6 0M2 15c2-2 4-2 6 0s4 2 6 0 4-2 6 0";

const f = (n: number) => Math.round(n * 100) / 100;
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

export function TownBoard(p: TownBoardProps) {
  const { config, reducedMotion } = useGames();
  const art = `${config.assetBase}town/`;
  const uid = `lg-town${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const { ref, size } = useSize<HTMLDivElement>();

  const layout = useMemo(
    () => fitLayout(p.graph, size.w, size.h, { allowTranspose: true, radiusPx: 36, marginPx: 22, maxScale: 1.6 }),
    [p.graph, size.w, size.h],
  );
  const px = 1 / layout.scale;
  /** cạnh ảnh nhà (logic) */
  const S = layout.r * 2.4;
  const roadW = clamp((S / px) * 0.26, 10, 18) * px;
  const hitW = Math.max(roadW + 16 * px, 34 * px);
  const tile = 44 * px;

  const houses = useMemo(() => {
    const off = hashStr(p.seed) % HOUSES.length;
    return p.graph.vertices
      .map((v, i) => ({ id: v.id, pos: layout.pos.get(v.id)!, src: HOUSES[(i + off) % HOUSES.length] }))
      .sort((a, b) => a.pos.y - b.pos.y);
  }, [p.graph, p.seed, layout]);

  const ready = size.w > 0 && size.h > 0;
  const decor = useMemo(
    () => (ready ? scatterDecor(p.graph, layout, S, roadW, p.seed) : []),
    [ready, p.graph, layout, S, roadW, p.seed],
  );

  const walk = useMemo(
    () => (p.walk && p.walk.length ? walkRoute(p.graph, layout, p.walk, roadW * 0.22, S) : null),
    [p.walk, p.graph, layout, roadW, S],
  );

  const roads = p.graph.edges.map((e) => {
    const a = layout.pos.get(e.u)!;
    const b = layout.pos.get(e.v)!;
    const L = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const nx = (-(b.y - a.y) / L) * (hitW / 2);
    const ny = ((b.x - a.x) / L) * (hitW / 2);
    const view = p.road(e);
    const text = view.broken ? "" : String(e.w ?? 0);
    const icon = view.locked ? LOCK : view.broken ? WAVES : null;
    return {
      e,
      view,
      text,
      icon,
      /** bề rộng thẻ giá (px màn hình) */
      tagW: text.length * 8.8 + 16 + (icon ? (text ? 16 : 12) : 0),
      d: `M${f(a.x)} ${f(a.y)}L${f(b.x)} ${f(b.y)}`,
      dRev: `M${f(b.x)} ${f(b.y)}L${f(a.x)} ${f(a.y)}`,
      hit: `M${f(a.x + nx)} ${f(a.y + ny)}L${f(b.x + nx)} ${f(b.y + ny)}L${f(b.x - nx)} ${f(b.y - ny)}L${f(a.x - nx)} ${f(a.y - ny)}Z`,
    };
  });
  const tagWidths = roads.map((r) => r.tagW).join(" ");
  const tagPos = useMemo(
    () => placeTags(p.graph, layout, S, px, roadW, tagWidths.split(" ").map(Number)),
    [p.graph, layout, S, px, roadW, tagWidths],
  );

  const interactive = !!p.onRoad;
  const onKey = (id: string) => (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      p.onRoad?.(id);
    }
  };

  const vb = layout.viewBox;
  const bg: CSSProperties = { backgroundImage: `url("${art}tile-grass.png")` };

  return (
    <div ref={ref} className="lg-board lg-town" style={bg}>
      {ready && (
        <svg
          className="lg-board__svg lg-town__svg"
          viewBox={`${f(vb.x)} ${f(vb.y)} ${f(vb.w)} ${f(vb.h)}`}
          preserveAspectRatio="xMidYMid meet"
          role="group"
          aria-label={p.label}
          style={{ "--px": px } as CSSProperties}
        >
          <defs>
            <pattern id={`${uid}-dirt`} patternUnits="userSpaceOnUse" width={f(tile)} height={f(tile)}>
              <image href={`${art}tile-dirt.png`} width={f(tile)} height={f(tile)} preserveAspectRatio="none" />
            </pattern>
            <pattern id={`${uid}-stone`} patternUnits="userSpaceOnUse" width={f(tile)} height={f(tile)}>
              <image href={`${art}tile-stone.png`} width={f(tile)} height={f(tile)} preserveAspectRatio="none" />
            </pattern>
          </defs>

          <g className="lg-roads">
            {roads.map(({ e, view, d, dRev, hit }) => {
              const cls = [
                "lg-road",
                view.paved ? "lg-road--paved" : "",
                view.locked ? "lg-road--locked" : "",
                view.broken ? "lg-road--broken" : "",
                view.tone ? `lg-road--${view.tone}` : "",
                interactive ? "lg-road--interactive" : "",
              ]
                .filter(Boolean)
                .join(" ");
              return (
                <g
                  key={e.id}
                  className={cls}
                  role={interactive ? "button" : undefined}
                  tabIndex={interactive ? 0 : undefined}
                  aria-pressed={interactive ? !!view.paved : undefined}
                  aria-disabled={interactive && (view.locked || view.broken) ? true : undefined}
                  aria-label={interactive ? (view.ariaLabel ?? `Đường ${e.u}–${e.v}`) : undefined}
                  onClick={interactive ? () => p.onRoad?.(e.id) : undefined}
                  onKeyDown={interactive ? onKey(e.id) : undefined}
                  data-road={e.id}
                >
                  {interactive && <path className="lg-road__focus" d={d} strokeWidth={f(roadW + 22 * px)} />}
                  <path className="lg-road__tone" d={d} strokeWidth={f(roadW + 14 * px)} />
                  <path className="lg-road__edge" d={d} strokeWidth={f(roadW + 4 * px)} />
                  <path className="lg-road__dirt" d={d} strokeWidth={f(roadW)} stroke={`url(#${uid}-dirt)`} />
                  {view.broken && (
                    <>
                      <path className="lg-road__water" d={d} strokeWidth={f(roadW + 2 * px)} />
                      <path
                        className="lg-road__wave"
                        d={d}
                        strokeWidth={f(2 * px)}
                        strokeDasharray={`${f(7 * px)} ${f(6 * px)}`}
                      />
                    </>
                  )}
                  {view.paved && (
                    <path
                      key={`pave-${view.pave ?? 0}`}
                      className={`lg-road__stone${view.pave ? " lg-road__stone--paving" : ""}`}
                      d={view.paveFrom === e.v ? dRev : d}
                      pathLength={1}
                      strokeWidth={f(roadW)}
                      stroke={`url(#${uid}-stone)`}
                    />
                  )}
                  {!view.paved && !!view.unpave && (
                    <path
                      key={`unpave-${view.unpave}`}
                      className="lg-road__stone lg-road__stone--unpaving"
                      d={d}
                      strokeWidth={f(roadW)}
                      stroke={`url(#${uid}-stone)`}
                    />
                  )}
                  {view.mine && (
                    <>
                      <path className="lg-road__mine-bg" d={d} strokeWidth={f(5 * px)} strokeDasharray={`${f(9 * px)} ${f(7 * px)}`} />
                      <path className="lg-road__mine" d={d} strokeWidth={f(3 * px)} strokeDasharray={`${f(9 * px)} ${f(7 * px)}`} />
                    </>
                  )}
                  {interactive && <path className="lg-road__hit" d={hit} />}
                </g>
              );
            })}
          </g>

          {walk && (
            <g className="lg-walkers" aria-hidden="true">
              {walk.rest.map((pt, k) => {
                const vs = S * 1.1;
                const img = (
                  <image href={`${art}villager-${(k % 4) + 1}.png`} x={f(-vs / 2)} y={f(-vs * 0.69)} width={f(vs)} height={f(vs)} />
                );
                if (reducedMotion) {
                  return (
                    <g key={k} transform={`translate(${f(pt.x)} ${f(pt.y)})`}>
                      {img}
                    </g>
                  );
                }
                return (
                  <g key={`${k}-${walk.d.length}`}>
                    {img}
                    <animateMotion
                      dur={`${f(walk.dur)}s`}
                      begin={`${f((-k * walk.dur) / walk.rest.length)}s`}
                      repeatCount="indefinite"
                      path={walk.d}
                    />
                  </g>
                );
              })}
            </g>
          )}

          <g className="lg-decor" aria-hidden="true">
            {decor.map((d, i) => (
              <image
                key={i}
                href={`${art}${d.src}.png`}
                x={f(d.x - d.size / 2)}
                y={f(d.y - d.size * 0.875)}
                width={f(d.size)}
                height={f(d.size)}
              />
            ))}
          </g>

          <g className="lg-houses" aria-hidden="true">
            {houses.map(({ id, pos, src }) => {
              const view = p.house?.(id) ?? {};
              return (
                <g
                  key={id}
                  className={`lg-house${view.glow ? " lg-house--glow" : ""}`}
                  transform={`translate(${f(pos.x)} ${f(pos.y)})`}
                  data-house={id}
                >
                  <ellipse className="lg-house__yard" cx={0} cy={f(S * 0.16)} rx={f(S * 0.56)} ry={f(S * 0.3)} />
                  <g key={`b-${view.pop ?? 0}`} className={`lg-house__body${view.pop ? " lg-house__body--pop" : ""}`}>
                    <image href={`${art}${src}.png`} x={f(-S / 2)} y={f(-S * 0.74)} width={f(S)} height={f(S)} />
                  </g>
                </g>
              );
            })}
          </g>

          <g className={`lg-rtags${interactive ? " lg-rtags--tap" : ""}`} aria-hidden="true">
            {roads.map(({ e, view, text, icon, tagW: w }) => {
              const mid = tagPos.get(e.id)!;
              const cls = [
                "lg-rtag",
                view.paved ? "lg-rtag--paved" : "",
                view.broken ? "lg-rtag--broken" : "",
                view.tone ? `lg-rtag--${view.tone}` : "",
              ]
                .filter(Boolean)
                .join(" ");
              return (
                <g
                  key={e.id}
                  className={cls}
                  transform={`translate(${f(mid.x)} ${f(mid.y)}) scale(${f(px)})`}
                  onClick={interactive ? () => p.onRoad?.(e.id) : undefined}
                  data-road-tag={e.id}
                >
                  <g key={`s-${view.shake ?? 0}`} className={`lg-rtag__body${view.shake ? " lg-rtag__body--shake" : ""}`}>
                    <rect x={f(-w / 2)} y={-12} width={f(w)} height={24} rx={12} />
                    {icon && (
                      <path
                        className="lg-rtag__icon"
                        d={icon}
                        transform={`translate(${f(text ? -w / 2 + 6 : -8)} -8) scale(${0.68})`}
                      />
                    )}
                    {text && (
                      <text x={icon ? 7 : 0} dy="0.35em">
                        {text}
                      </text>
                    )}
                  </g>
                </g>
              );
            })}
          </g>

          <g className="lg-htags" aria-hidden="true">
            {houses.map(({ id, pos }) => (
              <g
                key={id}
                className="lg-house__tag"
                transform={`translate(${f(pos.x + S * 0.42)} ${f(pos.y - S * 0.5)}) scale(${f(px)})`}
              >
                <circle r={12} />
                <text dy="0.35em">{id}</text>
              </g>
            ))}
          </g>
        </svg>
      )}
    </div>
  );
}

// ---------- thẻ giá ----------

/**
 * Chỗ đặt thẻ giá của từng đường (đơn vị logic): giữa phần đường lộ ra giữa hai nhà, vì đường ngắn
 * trên màn hẹp có thể bị ảnh nhà che gần hết. Thẻ đè thẻ khác, tên nhà hoặc giao điểm của hai đường
 * thì trượt dọc đường tới chỗ trống gần nhất (đường quá ngắn: cho thẻ đè lên ảnh nhà).
 * Đường ít chỗ nhất được đặt trước.
 */
function placeTags(g: Graph, layout: Layout, S: number, px: number, roadW: number, widths: number[]): Map<string, Pt> {
  // khung ảnh nhà và sân quanh tâm đỉnh
  const foot = { l: -0.52 * S, r: 0.52 * S, t: -0.72 * S, b: 0.42 * S };
  /** tham số t (0..1, tính từ p0) nơi đoạn p0→q ra khỏi khung nhà đặt tại p0 */
  const exitT = (p0: Pt, q: Pt) => {
    const dx = q.x - p0.x;
    const dy = q.y - p0.y;
    const tx = dx > 0 ? foot.r / dx : dx < 0 ? foot.l / dx : Infinity;
    const ty = dy > 0 ? foot.b / dy : dy < 0 ? foot.t / dy : Infinity;
    return Math.min(tx, ty);
  };
  const hh = 13 * px;
  const gap = 4 * px;
  /** khoảng cách từ điểm c tới thẻ tâm q */
  const dist = (c: Pt, q: Pt, hw: number) => Math.hypot(Math.max(Math.abs(c.x - q.x) - hw, 0), Math.max(Math.abs(c.y - q.y) - hh, 0));

  const items = g.edges.map((e, i) => {
    const a = layout.pos.get(e.u)!;
    const b = layout.pos.get(e.v)!;
    const L = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return { id: e.id, a, b, L, t0: exitT(a, b), t1: 1 - exitT(b, a), hw: (widths[i] / 2 + 1) * px };
  });
  // vật cản: tên nhà, và giao điểm của hai đường (thẻ nằm ngay giao điểm thì không rõ thuộc đường nào)
  const badges = [...layout.pos.values()].map((c) => ({ x: c.x + S * 0.42, y: c.y - S * 0.5 }));
  const crossings: Pt[] = [];
  for (let i = 0; i < items.length; i++)
    for (let j = i + 1; j < items.length; j++) {
      const c = crossPoint(items[i].a, items[i].b, items[j].a, items[j].b);
      if (c) crossings.push(c);
    }
  const placed: { x: number; y: number; hw: number }[] = [];
  const free = (q: Pt, hw: number) =>
    placed.every((o) => Math.abs(o.x - q.x) >= o.hw + hw + gap || Math.abs(o.y - q.y) >= 2 * hh + gap) &&
    badges.every((c) => dist(c, q, hw) >= 13 * px) &&
    crossings.every((c) => dist(c, q, hw) >= roadW / 2 + 3 * px);
  const out = new Map<string, Pt>();
  for (const r of [...items].sort((x, y) => (x.t1 - x.t0) * x.L - (y.t1 - y.t0) * y.L)) {
    const at = (t: number) => ({ x: r.a.x + (r.b.x - r.a.x) * t, y: r.a.y + (r.b.y - r.a.y) * t });
    const tm = r.t1 > r.t0 ? (r.t0 + r.t1) / 2 : 0.5;
    // nửa thẻ đo dọc theo đường: giữ cả thẻ trong phần đường lộ ra
    const half = ((Math.abs(r.b.x - r.a.x) / r.L) * r.hw + (Math.abs(r.b.y - r.a.y) / r.L) * hh) / r.L;
    const step = (4 * px) / r.L;
    let best = tm;
    // lượt 1: trong phần đường lộ ra; lượt 2 (đường quá ngắn): cho thẻ đè lên ảnh nhà, miễn không đè tên nhà
    for (const [lo, hi] of [
      [r.t0 + half, r.t1 - half],
      [0.2, 0.8],
    ]) {
      for (let k = 1; k <= 80 && !free(at(best), r.hw); k++) {
        const t = tm + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * step;
        if (t >= lo && t <= hi && free(at(t), r.hw)) best = t;
      }
    }
    const q = at(best);
    placed.push({ ...q, hw: r.hw });
    out.set(r.id, q);
  }
  return out;
}

/** Giao điểm thật sự của hai đoạn thẳng (không tính chung đầu mút), hoặc null. */
function crossPoint(a: Pt, b: Pt, c: Pt, d: Pt): Pt | null {
  const rx = b.x - a.x;
  const ry = b.y - a.y;
  const sx = d.x - c.x;
  const sy = d.y - c.y;
  const den = rx * sy - ry * sx;
  if (Math.abs(den) < 1e-9) return null;
  const t = ((c.x - a.x) * sy - (c.y - a.y) * sx) / den;
  const u = ((c.x - a.x) * ry - (c.y - a.y) * rx) / den;
  const eps = 1e-6;
  if (t <= eps || t >= 1 - eps || u <= eps || u >= 1 - eps) return null;
  return { x: a.x + rx * t, y: a.y + ry * t };
}

// ---------- trang trí và người dân ----------

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function distSeg(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1), 0, 1);
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** Rải cây, bụi, đá lên chỗ trống (xa đường và nhà), cố định theo seed của màn. */
function scatterDecor(g: Graph, layout: Layout, S: number, roadW: number, seed: string) {
  const rnd = mulberry32(hashStr(seed));
  const segs = g.edges.map((e) => [layout.pos.get(e.u)!, layout.pos.get(e.v)!] as const);
  const homes = [...layout.pos.values()];
  const vb = layout.viewBox;
  const step = S * 0.8;
  const total = DECOR.reduce((s, d) => s + d.w, 0);
  const out: { x: number; y: number; src: string; size: number }[] = [];
  // khung chưa đo (kích thước 0) cho viewBox khổng lồ: bỏ qua thay vì lặp hàng tỉ ô
  if (!(step > 0) || (vb.w / step) * (vb.h / step) > 4000) return out;
  for (let y = vb.y + step * 0.6; y < vb.y + vb.h + step * 0.3; y += step) {
    for (let x = vb.x + step * 0.5; x < vb.x + vb.w; x += step) {
      const p = { x: x + (rnd() - 0.5) * step * 0.7, y: y + (rnd() - 0.5) * step * 0.7 };
      const roll = rnd();
      let pick = rnd() * total;
      const near = Math.min(...segs.map(([a, b]) => distSeg(p, a, b)));
      if (near < roadW / 2 + S * 0.34) continue;
      if (homes.some((h) => Math.hypot(h.x - p.x, h.y - p.y) < S * 0.95)) continue;
      if (roll > 0.12 + 0.5 * clamp((near - S * 0.6) / (S * 1.6), 0, 1)) continue;
      const d = DECOR.find((x) => (pick -= x.w) <= 0) ?? DECOR[0];
      out.push({ x: p.x, y: p.y, src: d.src, size: S * d.k });
    }
  }
  return out.sort((a, b) => a.y - b.y);
}

/**
 * Lộ trình đi dạo: đi vòng quanh cây đường lát (mỗi đường đi hai lượt, mỗi lượt lệch về bên phải),
 * chỗ đổi hướng nằm khuất sau nhà. Trả về path cho animateMotion và chỗ đứng khi giảm chuyển động.
 */
function walkRoute(g: Graph, layout: Layout, edgeIds: string[], side: number, S: number) {
  const ids = new Set(edgeIds);
  const adj = new Map<VertexId, VertexId[]>(g.vertices.map((v) => [v.id, []]));
  for (const e of g.edges) {
    if (!ids.has(e.id)) continue;
    adj.get(e.u)!.push(e.v);
    adj.get(e.v)!.push(e.u);
  }
  const root = g.vertices.find((v) => adj.get(v.id)!.length)?.id;
  if (!root) return null;
  // [u, v, lượt đi xuống?]
  const steps: [VertexId, VertexId, boolean][] = [];
  const seen = new Set<VertexId>([root]);
  const visit = (u: VertexId) => {
    for (const v of adj.get(u)!) {
      if (seen.has(v)) continue;
      seen.add(v);
      steps.push([u, v, true]);
      visit(v);
      steps.push([v, u, false]);
    }
  };
  visit(root);
  const pts: Pt[] = [];
  let len = 0;
  const rest: Pt[] = [];
  for (const [u, v, down] of steps) {
    const a = layout.pos.get(u)!;
    const b = layout.pos.get(v)!;
    const L = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    // lệch sang phải theo chiều đi
    const ox = (-(b.y - a.y) / L) * side;
    const oy = ((b.x - a.x) / L) * side;
    pts.push({ x: a.x + ox, y: a.y + oy }, { x: b.x + ox, y: b.y + oy });
    len += L;
    if (down && rest.length < 3) rest.push({ x: (a.x + b.x) / 2 + ox, y: (a.y + b.y) / 2 + oy });
  }
  if (!rest.length) return null;
  const d = pts.map((q, i) => `${i ? "L" : "M"}${f(q.x)} ${f(q.y)}`).join("");
  // khoảng một chiều rộng nhà mỗi giây
  return { d, dur: len / (S * 0.9), rest };
}
