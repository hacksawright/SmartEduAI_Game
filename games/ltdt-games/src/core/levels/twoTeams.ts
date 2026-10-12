// Màn chơi Chia đội (Ch.4 – Đồ thị hai phía). Mỗi đỉnh là một bạn; cạnh nối hai bạn hay cãi nhau,
// nên phải ở hai đội khác nhau. Màn 3 và 6 không chia được: phải chỉ ra một chu trình lẻ.

import type { TwoTeamsLevel } from "./types";

const base = { game: "two_teams", chapter: "ch4", track: "two_teams" } as const;
const id = (n: number) => `ch4-l${String(n + 8).padStart(2, "0")}`;

export const twoTeamsLevels: TwoTeamsLevel[] = [
  {
    ...base,
    id: id(1),
    n: 1,
    title: "Sáu bạn",
    intro: "Chia lớp thành hai đội X và Y. Hai bạn nối với nhau là hay cãi nhau, phải ở hai đội khác nhau.",
    tip: "Xếp một bạn vào đội X trước. Những bạn nối với bạn ấy buộc phải vào đội nào?",
    expect: "bipartite",
    graph: {
      vertices: [
        ["1", 430, 70],
        ["2", 250, 220],
        ["3", 610, 220],
        ["4", 130, 410],
        ["5", 370, 410],
        ["6", 610, 410],
      ],
      edges: "1-2 1-3 2-4 2-5 3-6",
    },
  },
  {
    ...base,
    id: id(2),
    n: 2,
    title: "Vòng tròn",
    intro: "Sáu bạn ngồi quanh bàn tròn, thêm hai cặp ngồi đối diện cũng hay cãi nhau.",
    expect: "bipartite",
    graph: {
      vertices: [
        ["1", 430, 60],
        ["2", 595, 155],
        ["3", 595, 345],
        ["4", 430, 440],
        ["5", 265, 345],
        ["6", 265, 155],
      ],
      edges: "1-2 2-3 3-4 4-5 5-6 6-1 1-4 2-5",
    },
  },
  {
    ...base,
    id: id(3),
    n: 3,
    title: "Ngũ giác",
    intro: "Lần này có thể không chia được. Nếu vậy, bấm Không chia được và chỉ ra lý do trên hình.",
    tip: "Đi quanh một vòng, đội phải đổi ở mỗi bước. Vòng có số cạnh lẻ thì sao?",
    expect: "odd-cycle",
    graph: {
      vertices: [
        ["1", 430, 60],
        ["2", 615, 195],
        ["3", 545, 410],
        ["4", 315, 410],
        ["5", 245, 195],
        ["6", 680, 70],
        ["7", 120, 430],
      ],
      edges: "1-2 2-3 3-4 4-5 5-1 1-6 4-7",
    },
  },
  {
    ...base,
    id: id(4),
    n: 4,
    title: "Lập phương",
    intro: "Tám bạn, mười hai cặp hay cãi nhau.",
    expect: "bipartite",
    graph: {
      vertices: [
        ["1", 160, 60],
        ["2", 700, 60],
        ["3", 700, 440],
        ["4", 160, 440],
        ["5", 320, 180],
        ["6", 540, 180],
        ["7", 540, 320],
        ["8", 320, 320],
      ],
      edges: "1-2 2-3 3-4 4-1 5-6 6-7 7-8 8-5 1-5 2-6 3-7 4-8",
    },
  },
  {
    ...base,
    id: id(5),
    n: 5,
    title: "Hai nhóm bạn",
    intro: "Lớp có hai nhóm không quen nhau. Mỗi nhóm cũng phải chia đúng luật.",
    tip: "Nhóm này không liên quan tới nhóm kia: chia từng nhóm một.",
    expect: "bipartite",
    graph: {
      vertices: [
        ["1", 110, 90],
        ["2", 330, 90],
        ["3", 330, 300],
        ["4", 110, 300],
        ["5", 220, 440],
        ["6", 530, 80],
        ["7", 760, 80],
        ["8", 500, 420],
        ["9", 645, 420],
        ["10", 790, 420],
      ],
      edges: "1-2 2-3 3-4 4-1 4-5 6-8 6-9 6-10 7-8 7-9 7-10",
    },
  },
  {
    ...base,
    id: id(6),
    n: 6,
    title: "Hai đường chéo",
    intro: "Hai hàng bàn, thêm hai cặp ngồi chéo nhau. Chia được không?",
    expect: "odd-cycle",
    graph: {
      vertices: [
        ["1", 120, 110],
        ["2", 270, 110],
        ["3", 420, 110],
        ["4", 570, 110],
        ["5", 720, 110],
        ["6", 120, 390],
        ["7", 270, 390],
        ["8", 420, 390],
        ["9", 570, 390],
        ["10", 720, 390],
      ],
      edges: "1-2 2-3 3-4 4-5 6-7 7-8 8-9 9-10 1-6 2-7 3-8 4-9 5-10 1-9 3-6",
    },
  },
];
