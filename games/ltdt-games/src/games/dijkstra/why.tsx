import type { DijkstraState } from "../../core/engines/dijkstraEngine";
import { fmtD } from "../../core/engines/dijkstraEngine";
import type { Graph, VertexId } from "../../core/graph";
import type { DijkstraLevel } from "../../core/levels/types";
import { GraphBoard } from "../../ui/board/GraphBoard";
import { joinVi, treeEdgeIds } from "../shared/graphUtil";
import type { WhyContent } from "../shared/Overlays";

export function dijkstraWhy(level: DijkstraLevel, graph: Graph, s: DijkstraState): WhyContent {
  const tree = treeEdgeIds(graph, s.pred);
  const ids = graph.vertices.map((v) => v.id);
  const reach = ids.filter((v) => s.d[v] < Infinity);
  const unreachable = ids.filter((v) => s.d[v] === Infinity);
  const far = reach.reduce((a, b) => (s.d[b] > s.d[a] ? b : a), level.source);
  const path: VertexId[] = [];
  for (let x: VertexId | null = far; x; x = s.pred[x] ?? null) path.unshift(x);

  const figure = (
    <GraphBoard
      graph={graph}
      label="Cây đường đi ngắn nhất của màn vừa chơi"
      radiusPx={17}
      vertex={(id) => ({
        state: s.d[id] < Infinity ? "done" : "dim",
        badge: fmtD(s.d[id]),
        badgeTone: "dist",
      })}
      edge={(e) => (tree.has(e.id) ? { state: "result" } : { state: "dim", label: null })}
    />
  );

  const lines = [
    "Trọng số không âm: mọi đường khác tới u đều phải rời tập đỉnh đã cố định qua một đỉnh có nhãn ≥ d[u], nên không thể ngắn hơn d[u]. Vì vậy cố định đỉnh có nhãn nhỏ nhất luôn an toàn.",
    "Phép giảm nhãn d[v] ← min(d[v], d[u] + w(u, v)) chỉ làm nhãn nhỏ đi, và chỉ đỉnh kề của đỉnh vừa cố định mới có thể đổi nhãn.",
    path.length > 1
      ? `Các cạnh (pred[v], v) tạo thành cây đường đi ngắn nhất từ ${level.source}. Ví dụ: ${path.join(" → ")} dài ${fmtD(s.d[far])}.`
      : `Các cạnh (pred[v], v) tạo thành cây đường đi ngắn nhất từ ${level.source}.`,
  ];
  if (graph.directed) lines.push("Trên đồ thị có hướng, chỉ cung đi ra từ đỉnh vừa cố định mới được dùng để cập nhật nhãn.");
  if (unreachable.length) lines.push(`Không có đường đi từ ${level.source} tới ${joinVi(unreachable)} nên nhãn giữ ∞.`);

  return {
    title: "Đỉnh chưa cố định có nhãn nhỏ nhất đã có đường đi ngắn nhất.",
    lines,
    figure,
    caption: "Cây đường đi ngắn nhất của màn vừa chơi. Số cạnh mỗi đỉnh là nhãn d cuối cùng.",
    cite: "Giáo trình Chương 6 – Thuật toán Dijkstra.",
  };
}
