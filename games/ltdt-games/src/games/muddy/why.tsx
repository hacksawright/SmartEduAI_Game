import { kruskal } from "../../core/algorithms/spanningTree";
import type { MuddyRules } from "../../core/games/muddyCity";
import { sumWeights, type Graph } from "../../core/graph";
import type { MuddyLevel } from "../../core/levels/types";
import { GraphBoard } from "../../ui/board/GraphBoard";
import type { WhyContent } from "../shared/Overlays";
import { improvingSwap, roadName } from "./logic";

const CITE = "Giáo trình Chương 7 – Cây khung nhỏ nhất: thuật toán Kruskal và Prim.";

export function muddyWhy(level: MuddyLevel, graph: Graph, rules: MuddyRules, paved: string[]): WhyContent {
  const mine = new Set(paved);
  const kr = kruskal(graph, { forced: rules.locked, excluded: rules.broken });
  const best = new Set(kr.tree);
  const cost = sumWeights(graph, paved);
  const optimal = cost <= kr.total;
  const need = graph.vertices.length - 1;

  const figure = (
    <GraphBoard
      graph={graph}
      label={optimal ? "Cây khung của bạn" : "Cây của bạn so với cây khung nhỏ nhất"}
      radiusPx={17}
      vertex={() => ({ state: "idle" })}
      edge={(e) => {
        if (rules.broken.includes(e.id)) return { state: "ghost", label: null };
        if (optimal) return mine.has(e.id) ? { state: "result" } : { state: "dim", labelTone: "muted" };
        if (mine.has(e.id) && best.has(e.id)) return { state: "result" };
        if (mine.has(e.id)) return { state: "error" };
        if (best.has(e.id)) return { state: "hint", labelTone: "active" };
        return { state: "dim", labelTone: "muted" };
      }}
    />
  );

  const lines = [
    `Nối ${graph.vertices.length} nhà mà không có vòng cần đúng ${need} đường: tập đường như vậy là một cây khung.`,
    "Tính chất chu trình: trên một vòng, đường đắt nhất không cần cho cây rẻ nhất, vì bỏ nó đi các nhà vẫn thông nhau.",
    "Tính chất lát cắt: chia các nhà thành hai nhóm bất kỳ, đường rẻ nhất nối hai nhóm luôn nằm trong một cây khung nhỏ nhất. Kruskal và Prim đều dựa vào điều này.",
  ];
  let title: string;
  if (optimal) {
    title = `Cây khung của bạn là cây khung nhỏ nhất: tổng chi phí ${cost}.`;
    if (kr.tree.some((id) => !mine.has(id))) {
      lines.push("Cây của bạn khác cây Kruskal tìm được nhưng cùng chi phí: khi có đường cùng giá, cây khung nhỏ nhất có thể không duy nhất.");
    }
  } else {
    title = `Mọi nhà đã nối với nhau, nhưng có cách rẻ hơn: ${kr.total} thay vì ${cost}.`;
    const swap = improvingSwap(graph, rules, paved);
    if (swap) {
      lines.push(
        `Ví dụ: lát thêm ${roadName(swap.add)} (${swap.add.w}) sẽ tạo một vòng với cây của bạn; bỏ ${roadName(swap.remove)} (${swap.remove.w}) trên vòng đó thì tiết kiệm ${(swap.remove.w ?? 0) - (swap.add.w ?? 0)}.`,
      );
    }
  }
  if (level.variant === "forced") {
    lines.push("Có đường bắt buộc: coi như đã lát nó trước, rồi chạy Kruskal như thường (Bài 24c).");
  } else if (level.variant === "broken") {
    lines.push("Mất một đường, cây tách thành hai nhóm nhà; đường thay thế tốt nhất là đường rẻ nhất nối hai nhóm đó (Bài 21).");
  }

  return {
    title,
    lines,
    figure,
    caption: optimal
      ? "Đường xanh: cây của bạn. Số trên đường là chi phí."
      : "Xanh: đường cả hai cây cùng có. Đỏ: chỉ cây của bạn có. Cam nét đứt: cây rẻ nhất có mà bạn chưa lát.",
    cite: CITE,
  };
}
