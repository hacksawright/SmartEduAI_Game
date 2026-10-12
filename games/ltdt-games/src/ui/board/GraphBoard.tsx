// Bàn cờ đồ thị dùng chung (SVG). Game chỉ mô tả trạng thái từng đỉnh/cạnh; bàn cờ lo bố cục,
// hiệu ứng, vùng chạm và bàn phím. Kích thước nét và chữ tính theo px màn hình (biến --px).

import { useEffect, useMemo, useRef, type CSSProperties, type KeyboardEvent, type MouseEvent, type PointerEvent, type ReactNode } from "react";
import type { Edge, Graph, VertexId } from "../../core/graph";
import { clientToSvg, edgeCurves, edgeGeom, fitLayout, vertexAt, type Frame, type Layout, type Pt } from "./geometry";
import { useSize } from "./useSize";

export type VState = "idle" | "queued" | "current" | "done" | "dim";
export type Ring = "hint" | "select" | "evidence" | "error" | "start" | "pending";

export interface VertexView {
  state?: VState;
  /** ghi đè màu nền (game tô màu) */
  fill?: string;
  textColor?: string;
  label?: string;
  /** huy hiệu góc trên phải: vị trí trong hàng đợi, bậc, d[v]… */
  badge?: string | number;
  badgeTone?: "queue" | "select" | "degree" | "odd" | "dist" | "dist-fixed" | "dist-changed";
  /** ghi đè màu huy hiệu (game tô màu: huy hiệu mang số màu, cùng màu với đỉnh) */
  badgeColor?: { fill: string; text: string };
  check?: boolean;
  ring?: Ring;
  pulse?: boolean;
  /** tăng để chạy hiệu ứng nảy */
  pop?: number;
  /** tăng để chạy hiệu ứng rung */
  shake?: number;
  ariaLabel?: string;
  disabled?: boolean;
}

export type EState = "idle" | "result" | "drawn" | "dim" | "active" | "hint" | "error" | "ghost";

export interface EdgeView {
  state?: EState;
  /** null: ẩn nhãn; mặc định hiện trọng số nếu có */
  label?: string | null;
  labelTone?: "normal" | "active" | "muted";
  /** tăng để vẽ cạnh dần từ drawFrom */
  draw?: number;
  drawFrom?: VertexId;
  /** tăng để chạy một xung sáng dọc cạnh từ flowFrom */
  flow?: number;
  flowFrom?: VertexId;
  /** vẽ cạnh như một ống nước; giá trị là phần đã đầy (0–1), bề rộng dòng nước tỉ lệ theo */
  pipe?: number;
}

/** Di chuyển đỉnh (Gỡ rối). Tọa độ trả về là tọa độ logic của màn (đã bỏ phép xoay dọc nếu có). */
export interface MoverProps {
  /** đang kéo: vị trí xem trước; null khi thao tác bị hủy */
  onDrag(id: VertexId, p: Pt | null): void;
  /** thả đỉnh sau khi kéo */
  onDrop(id: VertexId, p: Pt): void;
  /** chạm vào chỗ trống trên bảng (đặt đỉnh đang chọn) */
  onTapBoard?(p: Pt): void;
}

export interface BoardCtx {
  layout: Layout;
  /** số đơn vị logic cho 1px màn hình */
  px: number;
}

export interface GraphBoardProps {
  graph: Graph;
  /** mô tả cho trình đọc màn hình */
  label: string;
  vertex?: (id: VertexId) => VertexView | undefined;
  edge?: (e: Edge) => EdgeView | undefined;
  onVertex?: (id: VertexId) => void;
  /** kéo bút qua các đỉnh (Một nét vẽ) */
  drag?: boolean;
  allowTranspose?: boolean;
  /** hình thu nhỏ: đỉnh nhỏ, không nhãn, không tương tác */
  mini?: boolean;
  /** bán kính đỉnh trên màn hình (px) */
  radiusPx?: number;
  /** tăng để rung cả bàn cờ */
  shake?: number;
  under?: (ctx: BoardCtx) => ReactNode;
  over?: (ctx: BoardCtx) => ReactNode;
  className?: string;
  /** khung cố định cho bố cục (xem FitOptions.frame) */
  frame?: Frame;
  /** kéo đỉnh tới chỗ mới, chạm chỗ trống để đặt đỉnh; chạm đỉnh vẫn gọi onVertex */
  mover?: MoverProps;
  /** phím khác trên một đỉnh (ví dụ phím mũi tên để dời đỉnh); gọi preventDefault để chặn Enter/Space mặc định */
  onVertexKey?: (id: VertexId, e: KeyboardEvent) => void;
  /** chiều dài mũi tên của cung (px màn hình) */
  arrowPx?: number;
}

/** Khoảng di chuyển (px màn hình) để một lần nhấn trở thành thao tác kéo. */
const DRAG_SLOP = 6;

const CHECK_PATH = "M-4.2 0.2 L-1.2 3.2 L4.4 -3";

export function GraphBoard(p: GraphBoardProps) {
  const { ref, size } = useSize<HTMLDivElement>();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const interactive = !!p.onVertex && !p.mini;

  const layout = useMemo(
    () =>
      fitLayout(p.graph, size.w, size.h, {
        allowTranspose: p.allowTranspose ?? true,
        radiusPx: p.radiusPx ?? (p.mini ? 7 : 25),
        marginPx: p.mini ? 6 : 26,
        maxScale: p.mini ? 1 : 1.5,
        frame: p.frame,
      }),
    [p.graph, p.allowTranspose, p.mini, p.radiusPx, p.frame, size.w, size.h],
  );
  const px = 1 / layout.scale;
  const curves = useMemo(() => edgeCurves(p.graph), [p.graph]);
  const r = layout.r;
  const arrow = p.graph.directed ? (p.mini ? 7 : (p.arrowPx ?? 13)) * px : 0;

  // rung cả bàn cờ (Web Animations API; tắt khi giảm chuyển động)
  const lastShake = useRef(p.shake ?? 0);
  useEffect(() => {
    const el = ref.current;
    const n = p.shake ?? 0;
    if (!el || n === lastShake.current) return;
    lastShake.current = n;
    if (el.closest('[data-motion="reduced"]') || typeof el.animate !== "function") return;
    el.animate(
      [
        { transform: "translateX(0)" },
        { transform: "translateX(-6px)" },
        { transform: "translateX(5px)" },
        { transform: "translateX(-3px)" },
        { transform: "translateX(0)" },
      ],
      { duration: 280, easing: "ease-out" },
    );
  }, [p.shake, ref]);

  // ----- kéo bút -----
  const dragging = useRef<{ id: VertexId; pid: number } | null>(null);
  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    if (!p.drag || !p.onVertex || !svgRef.current) return;
    if (e.button !== 0 && e.pointerType === "mouse") return;
    const pt = clientToSvg(svgRef.current, e.clientX, e.clientY);
    const id = pt && vertexAt(layout, pt);
    if (!id) return;
    e.preventDefault();
    try {
      svgRef.current.setPointerCapture(e.pointerId);
    } catch {
      /* một số trình duyệt không cho bắt con trỏ: vẫn chơi được bằng chạm */
    }
    dragging.current = { id, pid: e.pointerId };
    p.onVertex(id);
  };
  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    const d = dragging.current;
    if (!d || d.pid !== e.pointerId || !svgRef.current || !p.onVertex) return;
    const pt = clientToSvg(svgRef.current, e.clientX, e.clientY);
    if (!pt) return;
    // khi kéo chỉ bắt khi đi vào thân đỉnh, tránh vẽ nhầm lúc lướt qua gần
    const q = { ...layout, hitR: Math.max(r, 20 * px) };
    const id = vertexAt(q, pt);
    if (id && id !== d.id) {
      d.id = id;
      p.onVertex(id);
    }
  };
  const endDrag = () => {
    dragging.current = null;
  };

  // ----- di chuyển đỉnh -----
  const moving = useRef<{ id: VertexId | null; pid: number; x0: number; y0: number; moved: boolean } | null>(null);
  const toGraph = (q: Pt): Pt => (layout.transposed ? { x: q.y, y: q.x } : q);
  const onMoveDown = (e: PointerEvent<SVGSVGElement>) => {
    if (!p.mover || !svgRef.current) return;
    if (e.button !== 0 && e.pointerType === "mouse") return;
    const pt = clientToSvg(svgRef.current, e.clientX, e.clientY);
    if (!pt) return;
    const id = vertexAt(layout, pt);
    if (id) {
      e.preventDefault();
      try {
        svgRef.current.setPointerCapture(e.pointerId);
      } catch {
        /* không bắt được con trỏ: vẫn chạm-rồi-đặt được */
      }
    }
    moving.current = { id, pid: e.pointerId, x0: e.clientX, y0: e.clientY, moved: false };
  };
  const onMoveMove = (e: PointerEvent<SVGSVGElement>) => {
    const m = moving.current;
    if (!m || m.pid !== e.pointerId || !m.id || !svgRef.current || !p.mover) return;
    if (!m.moved && Math.hypot(e.clientX - m.x0, e.clientY - m.y0) < DRAG_SLOP) return;
    m.moved = true;
    const pt = clientToSvg(svgRef.current, e.clientX, e.clientY);
    if (pt) p.mover.onDrag(m.id, toGraph(pt));
  };
  const onMoveUp = (e: PointerEvent<SVGSVGElement>) => {
    const m = moving.current;
    moving.current = null;
    if (!m || m.pid !== e.pointerId || !svgRef.current || !p.mover) return;
    const pt = clientToSvg(svgRef.current, e.clientX, e.clientY);
    if (m.id && m.moved) {
      if (pt) p.mover.onDrop(m.id, toGraph(pt));
      else p.mover.onDrag(m.id, null);
    } else if (m.id) {
      p.onVertex?.(m.id);
    } else if (pt && Math.hypot(e.clientX - m.x0, e.clientY - m.y0) < DRAG_SLOP * 2) {
      p.mover.onTapBoard?.(toGraph(pt));
    }
  };
  const onMoveCancel = () => {
    const m = moving.current;
    moving.current = null;
    if (m?.id && m.moved) p.mover?.onDrag(m.id, null);
  };

  const activate = (id: VertexId) => p.onVertex?.(id);
  const onVertexClick = (id: VertexId) => (e: MouseEvent) => {
    // chế độ kéo: chuột/chạm đã xử lý ở pointerdown/pointerup; chỉ nhận click từ bàn phím/trình đọc màn hình
    if ((p.drag || p.mover) && e.detail > 0) return;
    activate(id);
  };
  const onVertexKey = (id: VertexId) => (e: KeyboardEvent) => {
    p.onVertexKey?.(id, e);
    if (e.defaultPrevented) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      activate(id);
    }
  };

  const ctx: BoardCtx = { layout, px };
  const ready = size.w > 0 && size.h > 0;
  const vb = layout.viewBox;
  const fmt = (n: number) => Math.round(n * 100) / 100;

  return (
    <div ref={ref} className={`lg-board${p.mini ? " lg-board--mini" : ""}${p.className ? ` ${p.className}` : ""}`}>
      {ready && (
        <svg
          ref={svgRef}
          className={`lg-board__svg${p.drag || p.mover ? " lg-board__svg--drag" : ""}`}
          viewBox={`${fmt(vb.x)} ${fmt(vb.y)} ${fmt(vb.w)} ${fmt(vb.h)}`}
          preserveAspectRatio="xMidYMid meet"
          role={p.mini ? "img" : "group"}
          aria-label={p.label}
          data-transposed={layout.transposed || undefined}
          style={{ "--px": px } as CSSProperties}
          onPointerDown={p.mover ? onMoveDown : p.drag ? onPointerDown : undefined}
          onPointerMove={p.mover ? onMoveMove : p.drag ? onPointerMove : undefined}
          onPointerUp={p.mover ? onMoveUp : p.drag ? endDrag : undefined}
          onPointerCancel={p.mover ? onMoveCancel : p.drag ? endDrag : undefined}
          onLostPointerCapture={p.drag && !p.mover ? endDrag : undefined}
        >
          {p.under?.(ctx)}

          <g className="lg-edges" aria-hidden="true">
            {p.graph.edges.map((e) => {
              const view = p.edge?.(e) ?? {};
              const a = layout.pos.get(e.u)!;
              const b = layout.pos.get(e.v)!;
              const geo = edgeGeom(a, b, r, curves.get(e.id) ?? 0, arrow);
              const state = view.state ?? "idle";
              const drawing = !!view.draw;
              const pipe = view.pipe;
              return (
                <g
                  key={e.id}
                  className={`lg-e lg-e--${state}${drawing ? " lg-e--drawing" : ""}${pipe !== undefined ? " lg-e--pipe" : ""}`}
                >
                  {pipe === undefined ? (
                    <path className="lg-e__line" d={geo.d} />
                  ) : (
                    <>
                      <path className="lg-e__pipe" d={geo.d} />
                      <path className="lg-e__bore" d={geo.d} />
                      {pipe > 0 && (
                        <path
                          className="lg-e__water"
                          d={geo.d}
                          style={{ strokeWidth: fmt((3 + 7 * Math.min(1, pipe)) * px) }}
                        />
                      )}
                    </>
                  )}
                  {geo.arrow && <path className="lg-e__arrow" d={geo.arrow} />}
                  {drawing && (
                    <path
                      key={`draw-${view.draw}`}
                      className="lg-e__draw"
                      d={view.drawFrom === e.v ? geo.dRev : geo.d}
                      pathLength={1}
                    />
                  )}
                  {!!view.flow && (
                    <path
                      key={`flow-${view.flow}`}
                      className="lg-e__flow"
                      d={view.flowFrom === e.v ? geo.dRev : geo.d}
                      pathLength={1}
                    />
                  )}
                </g>
              );
            })}
          </g>

          {!p.mini && (
            <g className="lg-edge-labels" aria-hidden="true">
              {p.graph.edges.map((e) => {
                const view = p.edge?.(e) ?? {};
                const text = view.label === undefined ? (e.w !== undefined ? String(e.w) : null) : view.label;
                if (text === null) return null;
                const a = layout.pos.get(e.u)!;
                const b = layout.pos.get(e.v)!;
                const geo = edgeGeom(a, b, r, curves.get(e.id) ?? 0, 0);
                const w = (text.length * 8.6 + 12) * px;
                const h = 22 * px;
                return (
                  <g
                    key={e.id}
                    className={`lg-elabel lg-elabel--${view.labelTone ?? "normal"} lg-elabel--${view.state ?? "idle"}`}
                    transform={`translate(${fmt(geo.mid.x)} ${fmt(geo.mid.y)})`}
                  >
                    <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={h / 2} />
                    <text className="lg-elabel__text" dy="0.36em">
                      {text}
                    </text>
                  </g>
                );
              })}
            </g>
          )}

          <g className="lg-vertices">
            {p.graph.vertices.map((v) => {
              const view = p.vertex?.(v.id) ?? {};
              const pos = layout.pos.get(v.id)!;
              const state = view.state ?? "idle";
              const label = view.label ?? v.id;
              const fontSize = (label.length > 1 ? 0.74 : 0.92) * r;
              const ring = view.ring;
              return (
                <g
                  key={v.id}
                  className={`lg-v lg-v--${state}${view.disabled ? " lg-v--disabled" : ""}${interactive ? " lg-v--interactive" : ""}`}
                  transform={`translate(${fmt(pos.x)} ${fmt(pos.y)})`}
                  role={interactive ? "button" : undefined}
                  tabIndex={interactive ? 0 : undefined}
                  aria-label={interactive ? (view.ariaLabel ?? `Đỉnh ${label}`) : undefined}
                  aria-hidden={interactive ? undefined : true}
                  aria-disabled={interactive && view.disabled ? true : undefined}
                  onClick={interactive ? onVertexClick(v.id) : undefined}
                  onKeyDown={interactive ? onVertexKey(v.id) : undefined}
                  data-vertex={v.id}
                >
                  {interactive && <circle className="lg-v__hit" r={layout.hitR} />}
                  {interactive && <circle className="lg-v__focus" r={r + 7 * px} />}
                  {view.pulse && <circle className="lg-v__pulse" r={r} />}
                  {ring && <circle className={`lg-v__ring lg-v__ring--${ring}`} r={r + 6 * px} />}
                  <g
                    key={`body-${view.pop ?? 0}-${view.shake ?? 0}`}
                    className={`lg-v__body${view.pop ? " lg-v__body--pop" : ""}${view.shake ? " lg-v__body--shake" : ""}`}
                  >
                    <circle
                      className="lg-v__disc"
                      r={r}
                      style={view.fill ? { fill: view.fill } : undefined}
                    />
                    {!p.mini && (
                      <text
                        className="lg-v__label"
                        dy="0.34em"
                        style={{ fontSize, ...(view.textColor ? { fill: view.textColor } : null) }}
                      >
                        {label}
                      </text>
                    )}
                  </g>
                  {view.check && !p.mini && (
                    <g className="lg-v__check" transform={`translate(${fmt(r * 0.72)} ${fmt(r * 0.72)}) scale(${fmt(px)})`}>
                      <circle r={9} />
                      <path d={CHECK_PATH} />
                    </g>
                  )}
                  {view.badge !== undefined && view.badge !== "" && !p.mini && (
                    <Badge text={String(view.badge)} tone={view.badgeTone ?? "queue"} color={view.badgeColor} r={r} px={px} />
                  )}
                </g>
              );
            })}
          </g>

          {p.over?.(ctx)}
        </svg>
      )}
    </div>
  );
}

function Badge({
  text,
  tone,
  color,
  r,
  px,
}: {
  text: string;
  tone: NonNullable<VertexView["badgeTone"]>;
  color?: VertexView["badgeColor"];
  r: number;
  px: number;
}) {
  const h = 20;
  const w = Math.max(h, text.length * 8 + 10);
  const x = r * 0.7;
  const y = -r * 0.78;
  return (
    <g
      className={`lg-v__badge lg-v__badge--${tone}${text === "∞" ? " lg-v__badge--inf" : ""}`}
      transform={`translate(${x} ${y}) scale(${px})`}
    >
      <rect x={-h / 2} y={-h / 2} width={w} height={h} rx={h / 2} style={color ? { fill: color.fill } : undefined} />
      <text x={w / 2 - h / 2} dy="0.36em" style={color ? { fill: color.text } : undefined}>
        {text}
      </text>
    </g>
  );
}
