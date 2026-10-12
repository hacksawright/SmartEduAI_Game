// Phần thuần logic của Gỡ rối phía giao diện: vẽ lại đồ thị theo vị trí mới, dời đỉnh bằng bàn phím, gợi ý.

import { validProofs, type PlanarityProof, type Positions } from "../../core/algorithms/planarity";
import type { Hint } from "../../core/engines/types";
import { clampToFrame, crowdedBy, faceCount } from "../../core/games/untangle";
import type { Graph, VertexId } from "../../core/graph";
import type { UntangleLevel } from "../../core/levels/types";
import { joinVi } from "../shared/graphUtil";

/** Bước dời đỉnh bằng phím mũi tên (đơn vị logic); giữ Shift để dời xa hơn. */
export const KEY_STEP = 24;

export function withPositions(g: Graph, pos: Positions): Graph {
  return { ...g, vertices: g.vertices.map((v) => ({ ...v, x: pos[v.id]?.x ?? v.x, y: pos[v.id]?.y ?? v.y })) };
}

/**
 * Chỗ đặt mới khi dời đỉnh v theo hướng (dx, dy) bằng bàn phím. Nếu ô kế tiếp quá gần một đỉnh khác,
 * nhảy tiếp theo cùng hướng để vượt qua; null khi đã sát mép hoặc không còn chỗ.
 */
export function keyTarget(pos: Positions, v: VertexId, dx: number, dy: number, step = KEY_STEP): { x: number; y: number } | null {
  const from = pos[v];
  if (!from) return null;
  for (let k = 1; k <= 8; k++) {
    const p = clampToFrame(from.x + dx * step * k, from.y + dy * step * k);
    if (p.x === from.x && p.y === from.y) return null;
    if (!crowdedBy(pos, v, p.x, p.y)) return p;
  }
  return null;
}

export type ProofKind = PlanarityProof["kind"];

export const PROOF_OPTIONS: { kind: ProofKind; label: string; detail: string }[] = [
  { kind: "edges", label: "Đếm cạnh: m > 3n − 6", detail: "Đồ thị phẳng đơn có n ≥ 3 đỉnh luôn có m ≤ 3n − 6." },
  {
    kind: "edges-no-triangle",
    label: "Không có tam giác: m > 2n − 4",
    detail: "Đồ thị phẳng không có tam giác luôn có m ≤ 2n − 4.",
  },
  { kind: "k5", label: "Chứa K₅", detail: "Chạm chọn 5 đỉnh đôi một kề nhau." },
  {
    kind: "k33",
    label: "Chứa K₃,₃",
    detail: "Chạm một đỉnh để xếp vào nhóm 1, chạm lần nữa sang nhóm 2, chạm lần nữa để bỏ.",
  },
];

/** Gợi ý khi đang gỡ (hoặc đang đưa bằng chứng). */
export function untangleHint(g: Graph, level: UntangleLevel, lvl: 1 | 2): Hint {
  const n = g.vertices.length;
  const m = g.edges.length;
  if (level.expect === "planar") {
    if (lvl === 1)
      return {
        text: "Chọn một chu trình làm vòng ngoài: kéo các đỉnh của nó ra rìa bảng, rồi xếp các đỉnh còn lại vào trong. Sau mỗi lần thả, số giao cắt tăng hay giảm?",
      };
    const outer = level.outer ?? [];
    const dense = m === 3 * n - 6;
    return {
      text: `Thử lấy vòng ngoài là ${outer.join(" – ")} (đang tô sáng).${
        dense ? ` Đồ thị có m = 3n − 6 = ${m}: đếm cạnh không chứng minh được nó không phẳng.` : ""
      }`,
      highlight: outer,
    };
  }
  if (lvl === 1)
    return {
      text: "Gỡ mãi vẫn còn chỗ cắt? Có thể không ai gỡ được. Đếm số đỉnh n, số cạnh m rồi so với các chặn của đồ thị phẳng. Nếu đếm cạnh chưa đủ, hãy tìm một đồ thị con quen thuộc.",
    };
  const proof = validProofs(g)[0];
  switch (proof?.kind) {
    case "edges":
      return { text: `n = ${n}, m = ${m}. So m với 3n − 6 = ${3 * n - 6}, rồi bấm Không phẳng.` };
    case "edges-no-triangle":
      return {
        text: `Đồ thị không có tam giác, nên nếu phẳng thì m ≤ 2n − 4 = ${2 * n - 4}. Còn m bằng bao nhiêu?`,
      };
    case "k5":
      return { text: `Năm đỉnh ${joinVi(proof.vertices)} có đôi một kề nhau không?`, highlight: proof.vertices };
    case "k33":
      return {
        text: `Nhóm 1 gồm ${joinVi(proof.a)} (đang tô sáng). Nhóm 2 là ba đỉnh kề với cả ba đỉnh này.`,
        highlight: proof.a,
      };
    default:
      return { text: "Đếm số cạnh và tìm đồ thị con K₅ hoặc K₃,₃." };
  }
}

/** Gợi ý cho câu hỏi số miền sau khi đã gỡ xong. */
export function facesHint(g: Graph, lvl: 1 | 2): Hint {
  if (lvl === 1)
    return {
      text: "Đếm từng miền được các cạnh bao quanh. Đừng quên miền vô hạn bên ngoài hình.",
    };
  const n = g.vertices.length;
  const m = g.edges.length;
  return {
    text: `Công thức Euler cho đồ thị phẳng liên thông: n − m + f = 2. Ở đây n = ${n}, m = ${m}.`,
  };
}

/** Câu giải thích khi trả lời sai số miền. */
export function facesWrongText(g: Graph, answer: number): string {
  const f = faceCount(g);
  const tip = answer === f - 1 ? " Có thể bạn quên miền bên ngoài." : "";
  return `${answer} miền chưa đúng.${tip} Đếm lại, hoặc dùng công thức liên hệ n, m và f.`;
}
