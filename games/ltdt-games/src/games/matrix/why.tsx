import type { Graph } from "../../core/graph";
import type { MatrixLevel } from "../../core/levels/types";
import { GraphBoard } from "../../ui/board/GraphBoard";
import type { WhyContent } from "../shared/Overlays";

const CITE = "Giáo trình Chương 1 – Biểu diễn đồ thị: ma trận kề, danh sách kề, ma trận liên thuộc (Bài tập 5–14).";

const TITLE: Record<MatrixLevel["mode"], string> = {
  "adj-to-graph": "Đồ thị bạn vẽ có đúng ma trận kề đã cho.",
  "graph-to-adj": "Ma trận bạn điền đúng là ma trận kề của đồ thị.",
  "list-to-graph": "Đồ thị bạn vẽ có đúng danh sách kề đã cho.",
  "inc-to-graph": "Đồ thị bạn vẽ có đúng ma trận liên thuộc đã cho.",
};

export function matrixWhy(level: MatrixLevel, graph: Graph): WhyContent {
  const n = graph.vertices.length;
  const m = graph.edges.length;
  const e1 = graph.edges[0];
  const { u, v } = e1;

  const figure = (
    <GraphBoard
      graph={graph}
      label="Đồ thị của màn, tô sáng một cạnh làm ví dụ"
      radiusPx={18}
      allowTranspose={false}
      vertex={(id) => ({ ring: id === u || id === v ? "select" : undefined })}
      edge={(e) => ({ state: e.id === e1.id ? "active" : "idle", label: null })}
    />
  );

  let lines: string[];
  let caption: string;
  switch (level.mode) {
    case "adj-to-graph":
    case "graph-to-adj":
      if (graph.directed) {
        lines = [
          "Ô hàng i, cột j bằng 1 khi có cung i → j. Ma trận không nhất thiết đối xứng: có cung i → j chưa chắc có cung j → i.",
          `Tổng hàng i là bán bậc ra, tổng cột j là bán bậc vào; tổng cả ma trận bằng số cung (${m}).`,
        ];
        caption = `Cung ${u} → ${v} ứng với ô hàng ${u}, cột ${v}; ô hàng ${v}, cột ${u} chỉ bằng 1 khi có cung ngược lại.`;
      } else {
        lines = [
          "Ô hàng i, cột j bằng 1 khi và chỉ khi i kề j. Đồ thị vô hướng nên ma trận đối xứng qua đường chéo: mỗi cạnh ứng với hai ô.",
          "Đường chéo toàn 0 vì đồ thị không có khuyên.",
          `Tổng hàng i là bậc của đỉnh i; tổng cả ma trận là ${2 * m} = 2 × ${m} cạnh, vì mỗi cạnh được đếm hai lần.`,
        ];
        caption = `Cạnh ${u}–${v} ứng với hai ô: hàng ${u} cột ${v}, và hàng ${v} cột ${u}.`;
      }
      break;
    case "list-to-graph":
      lines = [
        "Danh sách kề lưu, với mỗi đỉnh, các đỉnh kề nó. Mỗi cạnh xuất hiện ở hai dòng.",
        `Độ dài dòng i là bậc của i; tổng độ dài các dòng là ${2 * m} = 2 × ${m} cạnh.`,
        `Ma trận kề cần n² = ${n * n} ô, danh sách kề chỉ cần ${2 * m} mục: lợi hơn khi đồ thị thưa.`,
      ];
      caption = `Cạnh ${u}–${v} xuất hiện ở hai dòng: ${v} trong dòng của ${u}, ${u} trong dòng của ${v}.`;
      break;
    case "inc-to-graph":
      lines = [
        `Ma trận liên thuộc có ${n} hàng (đỉnh) và ${m} cột (cạnh); mỗi cột có đúng hai số 1 ở hai đầu cạnh.`,
        "Tổng hàng i là bậc của đỉnh i: số cạnh có một đầu là i.",
        "Đọc một cột là biết ngay cạnh nối hai đỉnh nào; muốn biết hai đỉnh có kề nhau không thì phải xem lần lượt các cột.",
      ];
      caption = `Cột e1 có số 1 ở hàng ${u} và hàng ${v}: đó là cạnh ${u}–${v}.`;
      break;
  }

  return { title: TITLE[level.mode], lines, cite: CITE, figure, caption };
}
