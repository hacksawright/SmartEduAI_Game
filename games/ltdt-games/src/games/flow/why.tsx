import { capOf, cutEdges, edmondsKarp, flowOn, flowValue } from "../../core/algorithms/maxFlow";
import type { FlowState } from "../../core/games/maxFlow";
import type { Graph, VertexId } from "../../core/graph";
import type { MaxFlowLevel } from "../../core/levels/types";
import { GraphBoard } from "../../ui/board/GraphBoard";
import { joinVi } from "../shared/graphUtil";
import type { WhyContent } from "../shared/Overlays";
import { S_COLOR, T_BADGE } from "./logic";

const CITE =
  "Giáo trình Chương 8 – Luồng cực đại: đồ thị thặng dư, đường tăng luồng, Ford–Fulkerson / Edmonds–Karp, định lý luồng cực đại – lát cắt nhỏ nhất.";

export function flowWhy(level: MaxFlowLevel, graph: Graph, st: FlowState, side: VertexId[]): WhyContent {
  const value = flowValue(graph, st.flow, level.source);
  const S = new Set(side);
  const cut = cutEdges(graph, side);
  const parts = cut.map((id) => {
    const e = graph.edges.find((x) => x.id === id)!;
    return { name: `${e.u} → ${e.v}`, c: capOf(graph, id) };
  });
  const ek = edmondsKarp(graph, level.source, level.sink, level.initialFlow ?? {});

  const lines = [
    "Luồng hợp lệ: nước trên mỗi ống không vượt dung lượng, và tại mỗi trạm (trừ nguồn, bể) nước vào bằng nước ra. Bơm theo đường từ s tới t luôn giữ đúng hai điều này.",
    "Ford–Fulkerson: còn đường tăng luồng trên đồ thị thặng dư (cung xuôi là phần ống còn trống, cung ngược là nước có thể trả lại) thì còn bơm thêm được; hết đường thì luồng cực đại.",
  ];
  if (level.initialFlow)
    lines.push(
      "Màn này bắt đầu bằng một luồng bơm vội. Đi ngược một ống là bớt nước trên ống đó để nhường cho đường khác; không có cung ngược, thuật toán có thể kẹt ở luồng chưa cực đại.",
    );
  lines.push(
    `Định lý luồng cực đại – lát cắt nhỏ nhất: giá trị luồng cực đại bằng dung lượng nhỏ nhất của một lát cắt. Lát cắt của bạn: S = {${joinVi(side)}}, các ống từ S sang T: ${parts
      .map((p) => `${p.name} (${p.c})`)
      .join(", ")}; tổng ${parts.map((p) => p.c).join(" + ")} = ${value}.`,
    `Edmonds–Karp chọn đường tăng ngắn nhất bằng BFS mỗi lần: ở màn này cần ${ek.paths.length} lần tăng luồng. Bạn đã bơm ${st.pushes} lần.`,
  );

  return {
    title: `Luồng cực đại = ${value} = dung lượng lát cắt nhỏ nhất.`,
    lines,
    figure: (
      <GraphBoard
        graph={graph}
        label="Luồng cực đại và nút thắt của bạn"
        radiusPx={17}
        allowTranspose={false}
        arrowPx={14}
        vertex={(id) => {
          const inS = S.has(id);
          return {
            fill: inS ? S_COLOR.fill : undefined,
            textColor: inS ? S_COLOR.text : undefined,
            badge: inS ? "S" : "T",
            badgeColor: inS ? S_COLOR : T_BADGE,
          };
        }}
        edge={(e) => {
          const f = flowOn(st.flow, e.id);
          const c = capOf(graph, e.id);
          return {
            pipe: c ? f / c : 0,
            label: `${f}/${c}`,
            labelTone: f === c ? "active" : "normal",
            state: cut.includes(e.id) ? "active" : S.has(e.v) && !S.has(e.u) ? "dim" : "idle",
          };
        }}
      />
    ),
    caption: "Ống viền cam: nút thắt (từ S sang T), ống nào cũng đầy. Số trên ống: nước / dung lượng.",
    cite: CITE,
  };
}
