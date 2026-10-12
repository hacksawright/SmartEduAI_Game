// Màn chơi Xếp thứ tự cho Greedy (Ch.5).
// G2 không dùng chu trình lẻ C7 như bản nháp GDD: trên C7, Greedy theo thứ tự nào cũng dùng
// đúng 3 = χ màu, nên màn sẽ thắng ngay ở lần chạy đầu. Xem GDD mục 7.

import type { GreedyLevel } from "./types";

const base = { game: "greedy_order", chapter: "ch5", track: "greedy_order" } as const;
const id = (n: number) => `ch5-l${String(n).padStart(2, "0")}`;

export const greedyLevels: GreedyLevel[] = [
  {
    ...base,
    id: id(1),
    n: 1,
    title: "Hai phía",
    intro: "Greedy tô lần lượt từng đỉnh bằng màu nhỏ nhất chưa bị đỉnh kề dùng. Theo thứ tự 1, 2, …, 8 nó cần 4 màu. Hãy xếp lại thứ tự để dùng ít màu nhất.",
    tip: "Chạm các đỉnh để đưa chúng lên đầu thứ tự, theo thứ tự chạm.",
    chi: 2,
    defaultColors: 4,
    graph: {
      vertices: [
        ["1", 150, 110],
        ["2", 150, 390],
        ["3", 330, 110],
        ["4", 330, 390],
        ["5", 510, 110],
        ["6", 510, 390],
        ["7", 690, 110],
        ["8", 690, 390],
      ],
      // đỉnh lẻ ở hàng trên, đỉnh chẵn ở hàng dưới; a_i nối b_j khi i ≠ j (kiểu Hình 5.8)
      edges: "1-4 1-6 1-8 3-2 3-6 3-8 5-2 5-4 5-8 7-2 7-4 7-6",
    },
  },
  {
    ...base,
    id: id(2),
    n: 2,
    title: "Hai tam giác",
    intro: "Có tam giác thì chắc chắn cần ít nhất 3 màu. Thứ tự mặc định lại dùng 4.",
    chi: 3,
    defaultColors: 4,
    graph: {
      vertices: [
        ["1", 110, 110],
        ["2", 720, 100],
        ["3", 110, 400],
        ["4", 720, 400],
        ["5", 300, 255],
        ["6", 590, 250],
        ["7", 450, 255],
      ],
      edges: "1-3 1-5 3-5 2-4 2-6 4-6 7-2 7-4 7-5",
    },
  },
  {
    ...base,
    id: id(3),
    n: 3,
    title: "Bánh xe",
    intro: "Bánh xe có trục ở giữa và vành 6 đỉnh. Thứ tự mặc định dùng 4 màu.",
    chi: 3,
    defaultColors: 4,
    graph: {
      vertices: [
        ["1", 430, 250],
        ["2", 430, 60],
        ["3", 430, 440],
        ["4", 595, 155],
        ["5", 265, 345],
        ["6", 595, 345],
        ["7", 265, 155],
      ],
      // vành theo vòng: 2 → 4 → 6 → 3 → 5 → 7 → 2
      edges: "1-2 1-3 1-4 1-5 1-6 1-7 2-4 4-6 6-3 3-5 5-7 7-2",
    },
  },
  {
    ...base,
    id: id(4),
    n: 4,
    title: "Mười đỉnh",
    intro: "Thứ tự mặc định khiến Greedy dùng tới 5 màu. Bạn làm được với bao nhiêu?",
    chi: 3,
    defaultColors: 5,
    graph: {
      vertices: [
        ["1", 540, 45],
        ["2", 800, 250],
        ["3", 400, 410],
        ["4", 110, 380],
        ["5", 680, 390],
        ["6", 680, 110],
        ["7", 110, 120],
        ["8", 260, 250],
        ["9", 540, 250],
        ["10", 400, 90],
      ],
      edges: "7-4 7-10 4-8 8-9 10-9 10-6 10-1 3-9 3-5 9-6 6-5 6-2 6-1 5-2",
    },
  },
];
