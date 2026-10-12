// Màn chơi Dịch ma trận (Ch.1, Bài tập 5–14). Đỉnh đặt sẵn trên vòng tròn.

import type { MatrixLevel } from "./types";

const base = { game: "matrix_translate", chapter: "ch1", track: "matrix_translate" } as const;
const id = (n: number) => `ch1-l${String(n).padStart(2, "0")}`;

/** n đỉnh đều nhau trên vòng tròn, đỉnh 1 ở trên cùng. */
function ring(n: number, cx = 430, cy = 250, r = 190): [string, number, number][] {
  return Array.from({ length: n }, (_, i) => {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
    return [String(i + 1), Math.round(cx + r * Math.cos(a)), Math.round(cy + r * Math.sin(a))];
  });
}

export const matrixLevels: MatrixLevel[] = [
  {
    ...base,
    id: id(1),
    n: 1,
    mode: "adj-to-graph",
    par: 60,
    title: "Ma trận kề → đồ thị",
    intro: "Đọc ma trận kề rồi vẽ đồ thị: chạm đỉnh i rồi đỉnh j để thêm hoặc bỏ cạnh i–j.",
    tip: "Ô hàng i, cột j bằng 1 nghĩa là có cạnh nối i và j.",
    graph: { vertices: ring(5), edges: "1-2 1-3 2-3 2-4 3-5 4-5" },
  },
  {
    ...base,
    id: id(2),
    n: 2,
    mode: "graph-to-adj",
    par: 60,
    title: "Đồ thị → ma trận kề",
    intro: "Nhìn đồ thị rồi điền ma trận kề: chạm ô để đổi 0 ↔ 1.",
    tip: "Đồ thị vô hướng có ma trận đối xứng: ô đối xứng tự đổi theo.",
    graph: { vertices: ring(5), edges: "1-2 1-4 2-3 2-5 3-4 4-5" },
  },
  {
    ...base,
    id: id(3),
    n: 3,
    mode: "list-to-graph",
    par: 75,
    title: "Danh sách kề → đồ thị",
    intro: "Mỗi dòng liệt kê các đỉnh kề của một đỉnh. Vẽ lại đồ thị.",
    graph: { vertices: ring(6), edges: "1-2 1-5 2-3 2-6 3-4 4-5 5-6" },
  },
  {
    ...base,
    id: id(4),
    n: 4,
    mode: "inc-to-graph",
    par: 75,
    title: "Ma trận liên thuộc → đồ thị",
    intro: "Hàng là đỉnh, cột là cạnh. Mỗi cột có đúng hai số 1: đó là hai đầu của cạnh.",
    graph: { vertices: ring(5), edges: "1-2 1-5 2-3 2-4 3-4 4-5" },
  },
  {
    ...base,
    id: id(5),
    n: 5,
    mode: "adj-to-graph",
    par: 75,
    title: "Ma trận kề có hướng",
    intro: "Đồ thị có hướng: ô hàng i, cột j bằng 1 nghĩa là có cung i → j. Chạm i rồi j để thêm cung.",
    tip: "Ma trận kề của đồ thị có hướng không nhất thiết đối xứng.",
    graph: { directed: true, vertices: ring(5), edges: "1-2 2-3 3-1 3-4 4-5 5-2" },
  },
];
