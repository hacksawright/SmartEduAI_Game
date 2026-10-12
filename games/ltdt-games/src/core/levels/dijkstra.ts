// Màn chơi Tôi là Dijkstra (Ch.6). Nhãn đỉnh là chữ cái để không lẫn với giá trị d.

import type { DijkstraLevel } from "./types";

const base = { game: "dijkstra", chapter: "ch6", track: "dijkstra" } as const;

export const dijkstraLevels: DijkstraLevel[] = [
  {
    ...base,
    id: "ch6-l01",
    n: 1,
    source: "A",
    title: "Nhãn đầu tiên",
    intro: "Tìm đường đi ngắn nhất từ A. Mỗi bước: cố định đỉnh có nhãn d nhỏ nhất, rồi cập nhật nhãn các đỉnh kề.",
    tip: "Nhãn chỉ giảm khi d[u] + w(u, v) nhỏ hơn hẳn d[v].",
    graph: {
      vertices: [
        ["A", 100, 250],
        ["B", 300, 100],
        ["C", 300, 400],
        ["D", 520, 250],
        ["E", 730, 250],
      ],
      edges: "A-B:4 A-C:1 C-B:2 B-D:5 C-D:8 D-E:3 B-E:10",
    },
  },
  {
    ...base,
    id: "ch6-l02",
    n: 2,
    source: "A",
    title: "Hòa nhãn",
    intro: "Có lúc hai đỉnh cùng nhãn nhỏ nhất. Khi đó chọn đỉnh nào cũng đúng.",
    graph: {
      vertices: [
        ["A", 90, 250],
        ["B", 260, 100],
        ["C", 260, 400],
        ["D", 450, 250],
        ["E", 620, 100],
        ["F", 620, 400],
        ["G", 770, 250],
      ],
      edges: "A-B:2 A-C:2 B-D:3 C-D:3 B-E:6 C-F:5 D-E:2 D-F:4 E-G:3 F-G:2",
    },
  },
  {
    ...base,
    id: "ch6-l03",
    n: 3,
    source: "A",
    title: "Đường một chiều",
    intro: "Đồ thị có hướng: chỉ cập nhật nhãn theo chiều mũi tên đi ra từ đỉnh vừa cố định.",
    tip: "Cung đi vào đỉnh u không dùng để cập nhật nhãn khi xét u.",
    graph: {
      directed: true,
      vertices: [
        ["A", 80, 250],
        ["B", 250, 110],
        ["C", 250, 390],
        ["D", 430, 250],
        ["E", 600, 110],
        ["F", 600, 390],
        ["G", 760, 250],
        ["H", 430, 55],
      ],
      edges: "A-B:3 A-C:6 B-C:2 B-H:4 B-D:6 C-D:3 H-E:3 D-E:2 F-D:1 C-F:9 E-G:6 F-G:2 E-F:3",
    },
  },
  {
    ...base,
    id: "ch6-l04",
    n: 4,
    source: "A",
    title: "Chuỗi giảm nhãn",
    intro: "Nhiều nhãn sẽ giảm đi giảm lại. Mỗi lần cập nhật, so sánh với nhãn hiện tại chứ không phải nhãn ban đầu.",
    graph: {
      directed: true,
      vertices: [
        ["A", 70, 250],
        ["B", 200, 90],
        ["C", 200, 410],
        ["D", 350, 250],
        ["E", 480, 90],
        ["F", 480, 410],
        ["G", 610, 250],
        ["H", 740, 90],
        ["I", 740, 410],
        ["J", 780, 250],
      ],
      edges:
        "A-B:2 A-C:4 A-D:9 B-D:3 C-D:2 B-E:9 D-E:2 D-F:6 C-F:8 E-G:1 F-G:3 D-G:9 G-H:4 E-H:7 G-J:5 H-J:1 G-I:6 F-I:2 I-J:3",
    },
  },
  {
    ...base,
    id: "ch6-l05",
    n: 5,
    source: "A",
    title: "Bản đồ thành phố",
    intro: "Màn tổng hợp: 12 địa điểm, nhiều lần hòa nhãn và nhiều lần giữ nguyên nhãn.",
    graph: {
      vertices: [
        ["A", 60, 165],
        ["B", 70, 370],
        ["C", 210, 260],
        ["D", 320, 100],
        ["E", 320, 420],
        ["F", 440, 260],
        ["G", 560, 100],
        ["H", 560, 420],
        ["I", 670, 260],
        ["J", 790, 130],
        ["K", 790, 390],
        ["L", 190, 50],
      ],
      edges:
        "A-B:5 A-C:3 B-C:4 A-L:2 L-D:3 C-D:6 C-E:7 B-E:9 D-F:4 E-F:2 C-F:8 D-G:5 F-G:6 F-H:3 E-H:7 G-I:2 H-I:4 F-I:9 G-J:6 I-J:3 I-K:5 H-K:8 J-K:2",
    },
  },
];
