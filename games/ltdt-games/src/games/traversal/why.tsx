import type { Graph, VertexId } from "../../core/graph";
import type { TraversalLevel } from "../../core/levels/types";
import { GraphBoard } from "../../ui/board/GraphBoard";
import { joinVi, treeEdgeIds } from "../shared/graphUtil";
import type { WhyContent } from "../shared/Overlays";

export function traversalWhy(
  level: TraversalLevel,
  graph: Graph,
  pred: Record<VertexId, VertexId | null>,
  visited: VertexId[],
): WhyContent {
  const tree = treeEdgeIds(graph, pred);
  const depth = new Map<VertexId, number>();
  for (const v of visited) {
    let d = 0;
    let x: VertexId | null | undefined = v;
    while (x && pred[x]) {
      x = pred[x];
      d++;
    }
    depth.set(v, d);
  }
  const unreachable = graph.vertices.map((v) => v.id).filter((id) => !visited.includes(id));
  const isBfs = level.algo === "bfs";
  const maxDepth = Math.max(0, ...depth.values());

  const figure = (
    <GraphBoard
      graph={graph}
      label={isBfs ? "Cây BFS của màn vừa chơi" : "Cây DFS của màn vừa chơi"}
      radiusPx={17}
      vertex={(id) => ({
        state: visited.includes(id) ? "done" : "dim",
        badge: visited.includes(id) ? (isBfs ? depth.get(id) : visited.indexOf(id) + 1) : undefined,
        badgeTone: "dist",
      })}
      edge={(e) => ({ state: tree.has(e.id) ? "result" : "dim", label: null })}
    />
  );

  if (isBfs) {
    const lines = [
      `Hàng đợi vào trước – ra trước, nên mọi đỉnh cách ${level.start} k cạnh đều được lấy ra trước các đỉnh cách k + 1 cạnh.`,
      "Đỉnh được đánh dấu ngay khi vào hàng đợi, nhờ vậy không đỉnh nào vào hàng hai lần.",
      `Các cạnh (pred[v], v) tạo thành cây BFS: đường đi trên cây từ ${level.start} tới mỗi đỉnh là đường đi ít cạnh nhất. Ở màn này, đỉnh xa nhất cách ${level.start} ${maxDepth} cạnh.`,
    ];
    if (graph.directed) lines.push("Trên đồ thị có hướng, BFS chỉ đi theo cung đi ra khỏi đỉnh đang xét.");
    if (unreachable.length) lines.push(`Đỉnh ${joinVi(unreachable)} không tới được từ ${level.start}.`);
    return {
      title: "BFS thăm đỉnh theo từng lớp khoảng cách tính từ đỉnh xuất phát.",
      lines,
      figure,
      caption: "Cây BFS của màn vừa chơi. Số nhỏ cạnh mỗi đỉnh là số cạnh tính từ đỉnh xuất phát.",
      cite: "Giáo trình Chương 2 – Duyệt đồ thị theo chiều rộng (BFS).",
    };
  }

  const lines = [
    "Ngăn xếp vào sau – ra trước: đỉnh trên cùng luôn là đỉnh vừa được thăm gần nhất, nên DFS đi sâu hết mức có thể.",
    "Một đỉnh chỉ được lấy ra khi mọi đỉnh kề của nó đã được thăm. Đó chính là bước quay lui.",
    "Các cạnh (pred[v], v) tạo thành cây DFS. Thứ tự thăm trùng với cách cài DFS bằng đệ quy.",
  ];
  if (unreachable.length)
    lines.push(`Đỉnh ${joinVi(unreachable)} không tới được từ ${level.start} nên không có trong thứ tự thăm. Muốn thăm hết, phải chạy DFS lại từ một đỉnh chưa thăm.`);
  return {
    title: "DFS luôn đi tiếp từ đỉnh vừa thăm gần nhất và chỉ quay lui khi hết đường.",
    lines,
    figure,
    caption: "Cây DFS của màn vừa chơi. Số nhỏ cạnh mỗi đỉnh là thứ tự được thăm.",
    cite: "Giáo trình Chương 2 – Duyệt đồ thị theo chiều sâu (DFS).",
  };
}
