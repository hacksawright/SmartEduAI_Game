// Phần thuần logic của Xếp thứ tự cho Greedy phía giao diện: nhật ký từng bước, gợi ý, chặn dưới χ.

import { chromaticNumber, greedyColoring, optimalGreedyOrder, undirectedNeighbors } from "../../core/algorithms/coloring";
import type { Hint } from "../../core/engines/types";
import { orderFromPicked } from "../../core/games/greedyOrder";
import { indexMap, type Graph, type VertexId } from "../../core/graph";
import { joinVi } from "../shared/graphUtil";

/** Bảng Okabe–Ito (docs/ART_DIRECTION.md mục 3.3) và màu chữ đủ tương phản trên từng màu. */
export const OI = ["#E69F00", "#56B4E9", "#009E73", "#F0E442", "#0072B2", "#D55E00", "#CC79A7"];
export const OI_TEXT = ["#111827", "#111827", "#111827", "#111827", "#ffffff", "#111827", "#111827"];
export const oiFill = (c: number) => OI[(c - 1) % OI.length];
export const oiText = (c: number) => OI_TEXT[(c - 1) % OI_TEXT.length];

export interface GreedyStepInfo {
  v: VertexId;
  /** đỉnh kề đã tô trước v, theo chỉ số đỉnh */
  colored: VertexId[];
  /** màu của từng đỉnh trong `colored` */
  colorsOf: number[];
  /** các màu đã bị đỉnh kề dùng, tăng dần, không lặp */
  blocked: number[];
  color: number;
}

/** Từng bước của Greedy theo thứ tự `order`. */
export function greedyTrace(g: Graph, order: VertexId[]): GreedyStepInfo[] {
  const nb = undirectedNeighbors(g);
  const idx = indexMap(g);
  const colorOf = greedyColoring(g, order).colorOf;
  const done = new Set<VertexId>();
  return order.map((v) => {
    const colored = [...nb.get(v)!].filter((u) => done.has(u)).sort((a, b) => idx.get(a)! - idx.get(b)!);
    done.add(v);
    const colorsOf = colored.map((u) => colorOf[u]);
    return { v, colored, colorsOf, blocked: [...new Set(colorsOf)].sort((a, b) => a - b), color: colorOf[v] };
  });
}

/** Một bộ k đỉnh đôi một kề nhau (k ≤ 4, đồ thị nhỏ), hoặc null. */
export function findClique(g: Graph, k: number): VertexId[] | null {
  const nb = undirectedNeighbors(g);
  const ids = g.vertices.map((v) => v.id);
  const pick: VertexId[] = [];
  const go = (from: number): boolean => {
    if (pick.length === k) return true;
    for (let i = from; i < ids.length; i++) {
      if (pick.some((u) => !nb.get(u)!.has(ids[i]))) continue;
      pick.push(ids[i]);
      if (go(i + 1)) return true;
      pick.pop();
    }
    return false;
  };
  return go(0) ? [...pick] : null;
}

/** Các lớp màu của một cách tô tối ưu, lớp đông đỉnh trước. */
export function optimalClasses(g: Graph): VertexId[][] {
  const order = optimalGreedyOrder(g);
  const colorOf = greedyColoring(g, order).colorOf;
  const classes: VertexId[][] = [];
  for (const v of order) (classes[colorOf[v] - 1] ??= []).push(v);
  return classes.map((c, i) => ({ c, i })).sort((a, b) => b.c.length - a.c.length || a.i - b.i).map((x) => x.c);
}

export interface HintPlan {
  /** phần đầu thứ tự đã gồm các nhóm cùng màu nguyên vẹn */
  before: VertexId[];
  /** nhóm cần xếp tiếp ngay sau `before` */
  cls: VertexId[];
  /** đỉnh đã chạm nằm sau `before`: phải bỏ chọn trước */
  extra: VertexId[];
  /** đỉnh của `before` chưa chạm: phải chạm để giữ ở đầu */
  need: VertexId[];
}

/** Bước tiếp theo để Greedy đạt χ(G); null khi thứ tự hiện tại đã đạt. */
export function hintPlan(g: Graph, picked: VertexId[]): HintPlan | null {
  const order = orderFromPicked(g, picked);
  if (greedyColoring(g, order).count === chromaticNumber(g)) return null;
  const classes = optimalClasses(g);
  const used = new Set<number>();
  let pos = 0;
  for (;;) {
    const k = classes.findIndex((c, i) => !used.has(i) && c.includes(order[pos]));
    if (k < 0) break;
    const head = order.slice(pos, pos + classes[k].length);
    if (!classes[k].every((v) => head.includes(v))) break;
    used.add(k);
    pos += classes[k].length;
  }
  const before = order.slice(0, pos);
  return {
    before,
    cls: classes.find((_, i) => !used.has(i))!,
    extra: picked.slice(pos),
    need: before.filter((v) => !picked.includes(v)),
  };
}

/**
 * Gợi ý: mức 1 là câu hỏi dẫn dắt; mức 2 tô sáng một nhóm cùng màu của cách tô tối ưu và chỉ chỗ đặt nó.
 * Phần đầu thứ tự đã xếp đúng theo từng nhóm (kể cả phần mặc định) được giữ nguyên.
 */
export function greedyHint(g: Graph, picked: VertexId[], lvl: 1 | 2): Hint {
  if (lvl === 1) {
    return {
      text: "Greedy chỉ mở màu mới khi mọi màu cũ đều đã bị đỉnh kề dùng. Những đỉnh nào có thể dùng chung một màu? Thử xếp chúng liền nhau ở đầu thứ tự.",
    };
  }
  const plan = hintPlan(g, picked);
  if (!plan) return { text: "Thứ tự hiện tại đã giúp Greedy dùng ít màu nhất. Bấm Chạy Greedy!" };
  const { before, cls, extra, need } = plan;
  const after = before.length ? `ngay sau ${joinVi(before)}` : "ở đầu thứ tự";
  let how: string;
  if (extra.length && !before.length) how = "Bấm Đặt lại rồi chạm lần lượt các đỉnh tô sáng để xếp chúng ở đầu thứ tự.";
  else if (extra.length) how = `Chạm lại ${joinVi(extra)} để bỏ chọn, rồi chạm các đỉnh tô sáng để xếp chúng ${after}.`;
  else if (need.length) how = `Xếp chúng ${after}: chạm ${joinVi(need)} rồi tới các đỉnh tô sáng.`;
  else how = `Chạm các đỉnh tô sáng để xếp chúng liền nhau ${after}.`;
  return { text: `Các đỉnh tô sáng đôi một không kề nhau nên dùng chung được một màu. ${how}`, highlight: cls };
}

/** Bước đầu tiên Greedy phải mở màu vượt mục tiêu: chỗ giải thích vì sao thừa màu. */
export function firstOverflow(trace: GreedyStepInfo[], target: number): GreedyStepInfo | null {
  return trace.find((s) => s.color > target) ?? null;
}

/** "kề 2 (màu 1), 4 (màu 2)" hoặc "chưa kề đỉnh nào đã tô". */
export function neighborText(s: GreedyStepInfo): string {
  if (!s.colored.length) return "chưa kề đỉnh nào đã tô";
  return `kề ${s.colored.map((u, i) => `${u} (màu ${s.colorsOf[i]})`).join(", ")}`;
}

/** "màu 1", "màu 1 và 2", "màu 1 đến 4". */
export function colorRange(k: number): string {
  return k <= 1 ? "màu 1" : k === 2 ? "màu 1 và 2" : `màu 1 đến ${k}`;
}

/** Vì sao Greedy phải mở màu `s.color`: mọi màu nhỏ hơn đều đã bị đỉnh kề chiếm. */
export function overflowText(s: GreedyStepInfo): string {
  return `Đỉnh ${s.v} phải mở màu ${s.color} vì các đỉnh ${neighborText(s)} đã chiếm hết ${colorRange(s.color - 1)}.`;
}
