// Phần thuần logic của Thành phố bùn phía giao diện: tìm vòng thừa, gợi ý, lời thuyết minh phát lại.

import type { Hint } from "../../core/engines/types";
import { cycleThrough, type MuddyRules } from "../../core/games/muddyCity";
import type { KruskalStep, PrimStep } from "../../core/algorithms/spanningTree";
import { edgeMap, UnionFind, vertexIds, type Edge, type Graph, type VertexId } from "../../core/graph";

export const roadName = (e: Pick<Edge, "u" | "v">) => `${e.u}–${e.v}`;

export interface CycleInfo {
  /** các nhà trên vòng, không lặp lại nhà đầu */
  vertices: VertexId[];
  edges: string[];
}

/** id các đường trên vòng `loop` (khép kín u … v u) do đường `closing` tạo ra. */
function loopEdges(g: Graph, paved: string[], closing: string, loop: VertexId[]): string[] {
  const m = edgeMap(g);
  const out: string[] = [];
  for (let i = 0; i + 2 < loop.length; i++) {
    const a = loop[i];
    const b = loop[i + 1];
    const id = paved.find((x) => {
      if (x === closing) return false;
      const e = m.get(x)!;
      return (e.u === a && e.v === b) || (e.u === b && e.v === a);
    });
    if (id) out.push(id);
  }
  out.push(closing);
  return out;
}

/** Một vòng trong tập đường đã lát, ưu tiên vòng chứa đường vừa lát gần nhất. */
export function findCycle(g: Graph, paved: string[]): CycleInfo | null {
  for (let i = paved.length - 1; i >= 0; i--) {
    const loop = cycleThrough(g, paved, paved[i]);
    if (loop) return { vertices: loop.slice(0, -1), edges: loopEdges(g, paved, paved[i], loop) };
  }
  return null;
}

const byCost = (g: Graph) => {
  const order = new Map(g.edges.map((e, i) => [e.id, i]));
  return (a: Edge, b: Edge) => (a.w ?? 0) - (b.w ?? 0) || order.get(a.id)! - order.get(b.id)!;
};

/** Đường rẻ nhất nối hai nhóm nhà khác nhau: bước tiếp theo của Kruskal từ tập đường hiện tại. */
export function cheapestBridge(g: Graph, rules: MuddyRules, paved: string[]): Edge | null {
  const m = edgeMap(g);
  const uf = new UnionFind(vertexIds(g));
  for (const id of paved) uf.union(m.get(id)!.u, m.get(id)!.v);
  const cands = g.edges.filter((e) => !paved.includes(e.id) && !rules.broken.includes(e.id) && uf.find(e.u) !== uf.find(e.v));
  return cands.sort(byCost(g))[0] ?? null;
}

/** Với cây khung chưa rẻ nhất: một đường nên lát thêm và đường đắt nhất trên vòng nó tạo ra. */
export function improvingSwap(g: Graph, rules: MuddyRules, paved: string[]): { add: Edge; remove: Edge } | null {
  const m = edgeMap(g);
  const cands = g.edges.filter((e) => !paved.includes(e.id) && !rules.broken.includes(e.id)).sort(byCost(g));
  for (const e of cands) {
    const withE = [...paved, e.id];
    const loop = cycleThrough(g, withE, e.id);
    if (!loop) continue;
    const others = loopEdges(g, withE, e.id, loop)
      .filter((id) => id !== e.id && !rules.locked.includes(id))
      .map((id) => m.get(id)!);
    const worst = others.sort((a, b) => (b.w ?? 0) - (a.w ?? 0))[0];
    if (worst && (worst.w ?? 0) > (e.w ?? 0)) return { add: e, remove: worst };
  }
  return null;
}

export function muddyHint(g: Graph, rules: MuddyRules, paved: string[], lvl: 1 | 2): Hint {
  if (lvl === 1) {
    return { text: "Đường rẻ nhất trên cả bản đồ có nên lát không? Còn đường rẻ thứ hai, thứ ba thì sao?" };
  }
  const m = edgeMap(g);
  const cyc = findCycle(g, paved);
  if (cyc) {
    const worst = cyc.edges
      .filter((id) => !rules.locked.includes(id))
      .map((id) => m.get(id)!)
      .sort((a, b) => (b.w ?? 0) - (a.w ?? 0))[0];
    return {
      text: `Hai nhà đã đi tới nhau được bằng đường lát thì không cần thêm đường nối chúng. Vòng ${cyc.vertices.join("–")} có một đường thừa: bỏ đường đắt nhất trong vòng (đang tô sáng), các nhà vẫn nối với nhau.`,
      highlight: worst ? [worst.id] : cyc.edges,
    };
  }
  const bridge = cheapestBridge(g, rules, paved);
  if (bridge) {
    return {
      text: "Hai nhà đã đi tới nhau được bằng đường lát rồi thì có cần lát thêm đường giữa chúng không? Đường rẻ nhất nối hai nhóm nhà khác nhau đang được tô sáng.",
      highlight: [bridge.id],
    };
  }
  const swap = improvingSwap(g, rules, paved);
  if (swap) {
    return {
      text: `Mọi nhà đã nối với nhau nhưng vẫn còn cách rẻ hơn. Lát thử đường đang tô sáng: nó tạo ra một vòng; bỏ đường đắt nhất trong vòng đó thì tổng chi phí giảm.`,
      highlight: [swap.add.id],
    };
  }
  return { text: "Cách lát của bạn đã rẻ nhất có thể. Bấm Kiểm tra!" };
}

// ---------- lời thuyết minh phát lại ----------

const cost = (e: Edge) => e.w ?? 0;

export function kruskalIntro(variant?: "forced" | "broken"): string {
  const extra =
    variant === "forced"
      ? " Đường bắt buộc được lát trước tiên."
      : variant === "broken"
        ? " Các đường có ổ khóa vẫn tốt nên được giữ trước; đường ngập nước bị loại."
        : "";
  return `Kruskal xét các đường theo chi phí tăng dần: lát đường nếu nó nối hai nhóm nhà khác nhau, bỏ qua nếu nó tạo vòng.${extra}`;
}

export function kruskalText(s: KruskalStep): string {
  const n = `${roadName(s.edge)} (${cost(s.edge)})`;
  if (s.reason === "forced") return `${n} là đường phải giữ: lát trước.`;
  if (s.reason === "accepted") return `Đường rẻ nhất còn lại: ${n}. Hai đầu thuộc hai nhóm nhà khác nhau nên lát.`;
  return `${n} nối hai nhà đã đi tới nhau được, sẽ tạo vòng nên bỏ qua.`;
}

export function primIntro(start: VertexId): string {
  return `Prim bắt đầu từ nhà ${start}. Mỗi bước lát đường rẻ nhất nối một nhà đã vào cây với một nhà bên ngoài (các đường nét đứt vàng).`;
}

export function primText(s: PrimStep, forced: string[]): string {
  const n = `${roadName(s.edge)} (${cost(s.edge)})`;
  if (forced.includes(s.edge.id)) return `${n} là đường phải giữ và đã chạm vào cây: lát ngay, nhà ${s.added} vào cây.`;
  return `Trong ${s.frontier.length} đường nối cây với bên ngoài, ${n} rẻ nhất: lát, nhà ${s.added} vào cây.`;
}
