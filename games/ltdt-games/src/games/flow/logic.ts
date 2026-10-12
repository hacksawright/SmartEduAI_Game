// Phần thuần logic của Ống nước & nút thắt phía giao diện: từng bước của đường đang chọn, lý do không đi được, gợi ý.

import {
  capOf,
  findAugmentingPath,
  flowOn,
  flowValue,
  residualArc,
  residualReachable,
  type Flow,
  type ResidualArc,
} from "../../core/algorithms/maxFlow";
import type { Hint } from "../../core/engines/types";
import type { Graph, VertexId } from "../../core/graph";
import type { MaxFlowLevel } from "../../core/levels/types";
import { joinVi } from "../shared/graphUtil";

/** Màu phía S của lát cắt (Okabe–Ito xanh lục lam, chữ tối); luôn kèm huy hiệu S / T. */
export const S_COLOR = { fill: "#009E73", text: "#111827" };
export const T_BADGE = { fill: "#ffffff", text: "#111827" };

/** Các cung thặng dư dọc đường đang chọn (bỏ qua bước không đi được). */
export function stepsOf(g: Graph, flow: Flow, path: VertexId[]): ResidualArc[] {
  const out: ResidualArc[] = [];
  for (let i = 1; i < path.length; i++) {
    const a = residualArc(g, flow, path[i - 1], path[i]);
    if (a) out.push(a);
  }
  return out;
}

/** Lý do không đi được từ u sang v trên đồ thị thặng dư. */
export function blockedReason(g: Graph, flow: Flow, u: VertexId, v: VertexId): string {
  const fwd = g.edges.find((e) => e.u === u && e.v === v);
  const back = g.edges.find((e) => e.u === v && e.v === u);
  if (fwd && flowOn(flow, fwd.id) >= capOf(g, fwd.id)) {
    const c = capOf(g, fwd.id);
    return `Ống ${u} → ${v} đã đầy (${c}/${c}).`;
  }
  if (back && flowOn(flow, back.id) === 0) return `Ống ${v} → ${u} chưa có nước để trả lại, nên không đi ngược được.`;
  return `Không có ống nối ${u} với ${v}.`;
}

export function flowHint(g: Graph, level: MaxFlowLevel, flow: Flow, lvl: 1 | 2): Hint {
  if (lvl === 1)
    return {
      text: "Tìm một đường từ s tới t mà ống nào cũng còn chỗ. Được đi ngược mũi tên nếu ống đó đang có nước: như vậy là bớt nước ở ống đó để dồn sang đường khác.",
    };
  const path = findAugmentingPath(g, flow, level.source, level.sink);
  if (!path)
    return {
      text: `Không còn đường nào từ ${level.source} tới ${level.sink} trên đồ thị thặng dư: luồng ${flowValue(g, flow, level.source)} đã cực đại. Bấm Đã cực đại.`,
    };
  const vs = [level.source, ...path.map((a) => a.to)];
  const back = path.filter((a) => !a.forward);
  return {
    text: `Thử đường ${vs.join(" → ")} (đang tô sáng).${
      back.length ? ` Đường này đi ngược ống ${back.map((a) => `${a.to} → ${a.from}`).join(", ")}: trả bớt nước trên đó.` : ""
    }`,
    highlight: vs,
  };
}

export function cutHint(g: Graph, level: MaxFlowLevel, flow: Flow, lvl: 1 | 2): Hint {
  if (lvl === 1)
    return {
      text: "Từ s, nước còn tới được những trạm nào (qua ống chưa đầy, hoặc đi ngược ống đang có nước)? Những trạm đó nên ở phía S.",
    };
  const reach = g.vertices.map((v) => v.id).filter((v) => residualReachable(g, flow, level.source).has(v));
  return { text: `Phía S gồm ${joinVi(reach)} (đang tô sáng). Các ống đi ra khỏi nhóm này đều đã đầy.`, highlight: reach };
}
