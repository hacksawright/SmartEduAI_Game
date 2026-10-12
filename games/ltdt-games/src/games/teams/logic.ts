// Phần thuần logic của Chia đội phía giao diện: màu đội, gợi ý, mã giả BFS kiểm tra hai phía.

import { bipartition } from "../../core/algorithms/bipartite";
import type { Hint } from "../../core/engines/types";
import type { Team } from "../../core/games/twoTeams";
import { adjacency, components, type Graph, type VertexId } from "../../core/graph";
import type { TwoTeamsLevel } from "../../core/levels/types";
import { joinVi } from "../shared/graphUtil";

/** Okabe–Ito cam / xanh dương; chữ đủ tương phản trên từng màu. Đội luôn kèm chữ X/Y trên huy hiệu. */
export const TEAM_COLOR: Record<Team, { fill: string; text: string }> = {
  X: { fill: "#E69F00", text: "#111827" },
  Y: { fill: "#0072B2", text: "#ffffff" },
};

export const BFS_TEAMS = [
  "Chọn một đỉnh chưa có đội, xếp vào đội X, đưa vào hàng đợi",
  "Lấy u ra khỏi hàng đợi",
  "Với mỗi v kề u:",
  "  v chưa có đội → xếp v vào đội khác u, đưa v vào hàng đợi",
  "  v cùng đội với u → có chu trình lẻ, dừng",
  "Hàng đợi rỗng mà còn đỉnh chưa có đội → quay lại dòng 1",
];

export function neighborsOf(g: Graph, v: VertexId): VertexId[] {
  return (adjacency({ ...g, directed: false }).get(v) ?? []).map((x) => x.v);
}

export const isAdjacent = (g: Graph, u: VertexId, v: VertexId) =>
  g.edges.some((e) => (e.u === u && e.v === v) || (e.u === v && e.v === u));

export function teamsHint(g: Graph, level: TwoTeamsLevel, lvl: 1 | 2): Hint {
  const bp = bipartition(g);
  if (lvl === 1) {
    return level.expect === "bipartite"
      ? {
          text: "Xếp một bạn bất kỳ vào đội X. Những bạn nối với bạn ấy buộc phải vào đội nào? Rồi bạn của các bạn đó thì sao?",
        }
      : {
          text: "Thử xếp lần lượt: mỗi bước sang bạn kề, đội phải đổi. Đi hết một vòng có số cạnh lẻ thì quay về đỉnh đầu với đội nào?",
        };
  }
  if (bp.ok) {
    const roots = components(g).map((c) => c[0]);
    const r = roots[0];
    const nb = neighborsOf(g, r);
    return {
      text: `Bắt đầu từ ${r}: đội X. Khi đó ${joinVi(nb)} phải vào đội Y.${
        roots.length > 1 ? ` Lớp có ${roots.length} nhóm không nối với nhau: làm tương tự từ ${joinVi(roots.slice(1))}.` : ""
      }`,
      highlight: [r, ...nb],
    };
  }
  return {
    text: `Nhìn vòng ${bp.oddCycle.join(" – ")} – ${bp.oddCycle[0]} (đang tô sáng). Vòng này có mấy cạnh?`,
    highlight: bp.oddCycle,
  };
}
