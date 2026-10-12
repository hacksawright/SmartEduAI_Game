// Màn chơi Ống nước & nút thắt (Ch.8 – Luồng cực đại). Trọng số cung là dung lượng ống.
// Màn 3 và 5 có sẵn một luồng "bơm vội" làm tắc đường xuôi: muốn tăng tiếp phải đẩy ngược nước trên một ống.

import type { MaxFlowLevel } from "./types";

const base = { game: "max_flow", chapter: "ch8", track: "max_flow", source: "s", sink: "t" } as const;
const id = (n: number) => `ch8-l${String(n).padStart(2, "0")}`;

export const maxFlowLevels: MaxFlowLevel[] = [
  {
    ...base,
    id: id(1),
    n: 1,
    title: "Hai đường ống",
    intro: "Nước chảy từ nguồn s tới bể t theo chiều mũi tên. Mỗi ống chỉ chứa được tối đa số ghi trên ống. Bơm được nhiều nhất bao nhiêu?",
    tip: "Chạm lần lượt các đỉnh từ s tới t để chọn đường, rồi bấm Bơm.",
    maxFlow: 4,
    graph: {
      directed: true,
      vertices: [
        ["s", 90, 250],
        ["a", 430, 90],
        ["b", 430, 410],
        ["t", 770, 250],
      ],
      edges: "s-a:3 a-t:2 s-b:2 b-t:3",
    },
  },
  {
    ...base,
    id: id(2),
    n: 2,
    title: "Ống nối",
    intro: "Thêm một ống nối từ a sang b. Nước có thể rẽ qua đó.",
    maxFlow: 6,
    graph: {
      directed: true,
      vertices: [
        ["s", 90, 250],
        ["a", 430, 90],
        ["b", 430, 410],
        ["t", 770, 250],
      ],
      edges: "s-a:4 s-b:2 a-b:3 a-t:2 b-t:4",
    },
  },
  {
    ...base,
    id: id(3),
    n: 3,
    title: "Trả nước",
    intro: "Một người đã bơm vội 3 đơn vị theo đường s → a → b → t. Có còn tăng thêm được không?",
    tip: "Đi từ b sang a ngược mũi tên nghĩa là bớt nước đang chảy trên ống a → b, nhường chỗ cho đường khác.",
    maxFlow: 5,
    initialFlow: { "s-a": 3, "a-b": 3, "b-t": 3 },
    graph: {
      directed: true,
      vertices: [
        ["s", 90, 250],
        ["a", 430, 90],
        ["b", 430, 410],
        ["t", 770, 250],
      ],
      edges: "s-a:3 s-b:2 a-b:3 a-t:2 b-t:3",
    },
  },
  {
    ...base,
    id: id(4),
    n: 4,
    title: "Sáu trạm bơm",
    intro: "Mạng lớn hơn, ống to nhỏ khác nhau. Tìm luồng cực đại rồi chỉ ra nút thắt.",
    maxFlow: 23,
    graph: {
      directed: true,
      vertices: [
        ["s", 80, 250],
        ["a", 300, 90],
        ["b", 300, 410],
        ["c", 560, 90],
        ["d", 560, 410],
        ["t", 790, 250],
      ],
      edges: "s-a:16 s-b:13 a-c:12 b-a:4 b-d:14 c-b:9 c-t:20 d-c:7 d-t:4",
    },
  },
  {
    ...base,
    id: id(5),
    n: 5,
    title: "Đường vòng",
    intro: "Mạng đã có sẵn 7 đơn vị nước. Tăng tới mức cao nhất, rồi tìm nút thắt.",
    maxFlow: 9,
    initialFlow: { "s-a": 4, "a-d": 4, "d-b": 4, "b-t": 4, "s-c": 3, "c-d": 3, "d-t": 3 },
    graph: {
      directed: true,
      vertices: [
        ["s", 80, 250],
        ["a", 300, 90],
        ["c", 300, 410],
        ["b", 560, 90],
        ["d", 560, 410],
        ["t", 790, 250],
      ],
      edges: "s-a:5 s-c:5 a-b:3 a-d:4 c-d:4 d-b:4 b-t:6 d-t:3",
    },
  },
];
