import { greedyColoring } from "../../core/algorithms/coloring";
import { vertexIds, type Graph, type VertexId } from "../../core/graph";
import type { GreedyLevel } from "../../core/levels/types";
import { GraphBoard } from "../../ui/board/GraphBoard";
import { findEdge, joinVi } from "../shared/graphUtil";
import type { WhyContent } from "../shared/Overlays";
import { colorRange, findClique, firstOverflow, greedyTrace, neighborText, oiFill, oiText } from "./logic";

const CITE = "Giáo trình Chương 5 – Tô màu đồ thị: thuật toán Greedy (Hình 5.8, Tính chất 5.15).";

/** `order`: thứ tự của lần chạy thắng. */
export function greedyWhy(level: GreedyLevel, graph: Graph, order: VertexId[]): WhyContent {
  const chi = level.chi;
  const n = graph.vertices.length;
  const { colorOf } = greedyColoring(graph, order);
  const clique = chi > 2 ? findClique(graph, chi) : null;
  const cliqueEdges = new Set<string>();
  if (clique) {
    for (let i = 0; i < clique.length; i++)
      for (let j = i + 1; j < clique.length; j++) {
        const e = findEdge(graph, clique[i], clique[j]);
        if (e) cliqueEdges.add(e.id);
      }
  }

  const figure = (
    <GraphBoard
      graph={graph}
      label="Cách tô màu theo thứ tự của bạn"
      radiusPx={19}
      vertex={(id) => {
        const c = colorOf[id];
        return { fill: oiFill(c), textColor: oiText(c), badge: c, badgeColor: { fill: oiFill(c), text: oiText(c) } };
      }}
      edge={(e) => ({ state: cliqueEdges.has(e.id) ? "result" : "idle" })}
    />
  );

  const classes: VertexId[][] = [];
  for (const v of order) (classes[colorOf[v] - 1] ??= []).push(v);

  const lines: string[] = [];
  if (chi === 2) {
    lines.push("Hai đầu một cạnh phải khác màu nên cần ít nhất 2 màu. Đồ thị hai phía: mỗi phía một màu là đủ.");
  } else if (clique) {
    lines.push(`${joinVi(clique)} đôi một kề nhau nên phải nhận ${chi} màu khác nhau: χ(G) ≥ ${chi}. Greedy đã dùng đúng ${chi} màu, vậy χ(G) = ${chi}.`);
  }
  lines.push(
    `Luôn có một thứ tự giúp Greedy dùng đúng χ(G) màu: lấy một cách tô ${chi} màu rồi xếp các đỉnh theo từng nhóm cùng màu (Tính chất 5.15).`,
  );
  lines.push(`Thứ tự của bạn chia đỉnh thành các nhóm cùng màu: ${classes.map((c, i) => `màu ${i + 1} gồm ${c.join(", ")}`).join("; ")}.`);
  const s = firstOverflow(greedyTrace(graph, vertexIds(graph)), chi);
  if (s) {
    lines.push(
      `Theo thứ tự 1, 2, …, ${n}, Greedy dùng ${level.defaultColors} màu: tới đỉnh ${s.v}, các đỉnh ${neighborText(s)} đã chiếm hết ${colorRange(s.color - 1)} nên phải mở màu ${s.color}. Greedy không nhìn trước, nên thứ tự quyết định số màu.`,
    );
  }

  return {
    title: `Greedy dùng ${chi} màu, bằng χ(G) = ${chi}: không thể tô bằng ít màu hơn.`,
    lines,
    cite: CITE,
    figure,
    caption: clique
      ? `Cạnh đậm: ${joinVi(clique)} đôi một kề nhau, buộc phải dùng ${chi} màu. Số trên huy hiệu là số màu.`
      : "Số trên huy hiệu là số màu của đỉnh.",
  };
}
