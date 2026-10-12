import { findK33, findK5, type PlanarityProof } from "../../core/algorithms/planarity";
import { FRAME, type UntangleState } from "../../core/games/untangle";
import type { Graph } from "../../core/graph";
import type { UntangleLevel } from "../../core/levels/types";
import { GraphBoard } from "../../ui/board/GraphBoard";
import { joinVi } from "../shared/graphUtil";
import type { WhyContent } from "../shared/Overlays";
import { withPositions } from "./logic";

const CITE = "Giáo trình Chương 4 – Đồ thị phẳng: công thức Euler, hệ quả m ≤ 3n − 6 và định lý Kuratowski.";

/** Màu hai nhóm của K₃,₃ (Okabe–Ito cam / xanh dương); luôn đi kèm số nhóm 1, 2 trên huy hiệu. */
export const GROUP_COLORS = [
  { fill: "#E69F00", text: "#111827" },
  { fill: "#0072B2", text: "#ffffff" },
];

const EULER = "Công thức Euler: đồ thị phẳng liên thông có n đỉnh, m cạnh, f miền thì n − m + f = 2.";
const BOUND =
  "Mỗi miền được bao bởi ít nhất 3 cạnh, mỗi cạnh giáp nhiều nhất 2 miền, nên 3f ≤ 2m. Thay vào công thức Euler được m ≤ 3n − 6.";
const KURATOWSKI = "Định lý Kuratowski: đồ thị là phẳng khi và chỉ khi nó không chứa đồ thị con đồng phôi với K₅ hoặc K₃,₃.";

export function untangleWhy(
  level: UntangleLevel,
  graph: Graph,
  st: UntangleState,
  proof: PlanarityProof | null,
  f: number,
): WhyContent {
  const n = graph.vertices.length;
  const m = graph.edges.length;

  if (st.status !== "proved" || !proof) {
    const lines = [EULER, `Hình của bạn: ${n} − ${m} + ${f} = 2.`, BOUND];
    lines.push(
      m === 3 * n - 6
        ? `Ở đây m = ${m} = 3n − 6: mọi miền đều là tam giác. Đồ thị dày nhất có thể mà vẫn phẳng, nên đếm cạnh không chứng minh được nó không phẳng.`
        : `Ở đây m = ${m} ≤ 3n − 6 = ${3 * n - 6}. Đây chỉ là điều kiện cần: thỏa bất đẳng thức chưa chắc đã phẳng, phải vẽ được mới biết.`,
    );
    return {
      title: `Đồ thị phẳng: hình của bạn có ${f} miền, đúng công thức Euler.`,
      lines,
      figure: (
        <GraphBoard
          graph={withPositions(graph, st.pos)}
          label="Cách vẽ không giao cắt của bạn"
          radiusPx={16}
          allowTranspose={false}
          frame={FRAME}
          edge={() => ({ state: "result", label: null })}
        />
      ),
      caption: "Cách vẽ không giao cắt của bạn.",
      cite: CITE,
    };
  }

  const k5 = findK5(graph);
  const k33 = findK33(graph);
  const lines: string[] = [];
  let title: string;
  let groups: { a: string[]; b: string[] } | null = null;
  let five: string[] | null = null;

  switch (proof.kind) {
    case "edges":
      title = `m = ${m} > 3n − 6 = ${3 * n - 6}, nên đồ thị không phẳng.`;
      lines.push(EULER, BOUND, "Đồ thị này vượt chặn, nên dù kéo đỉnh thế nào cũng còn giao cắt.");
      if (k5) {
        lines.push(`${joinVi(k5)} đôi một kề nhau: đây là K₅, một trong hai đồ thị gốc của định lý Kuratowski.`);
        five = k5;
      }
      break;
    case "edges-no-triangle":
      title = `Không có tam giác và m = ${m} > 2n − 4 = ${2 * n - 4}, nên đồ thị không phẳng.`;
      lines.push(
        EULER,
        "Không có tam giác thì mỗi miền được bao bởi ít nhất 4 cạnh: 4f ≤ 2m, thay vào công thức Euler được m ≤ 2n − 4.",
        `Chặn thường m ≤ 3n − 6 = ${3 * n - 6} không đủ ở đây vì ${m} ≤ ${3 * n - 6}. Biết thêm về độ dài chu trình cho chặn chặt hơn.`,
      );
      if (k33) {
        lines.push(
          "Đây là K₃,₃, bài toán “ba nhà, ba giếng”: không thể nối mỗi nhà tới cả ba giếng mà các đường không cắt nhau.",
        );
        groups = { a: k33[0], b: k33[1] };
      }
      break;
    case "k5":
      title = "Đồ thị chứa K₅ nên không phẳng.";
      five = proof.vertices;
      lines.push(
        KURATOWSKI,
        `Năm đỉnh ${joinVi(proof.vertices)} đôi một kề nhau tạo thành K₅. Vẽ phẳng được cả đồ thị thì cũng vẽ phẳng được phần K₅ này, mà K₅ có m = 10 > 3n − 6 = 9.`,
      );
      break;
    case "k33":
      title = "Đồ thị chứa K₃,₃ nên không phẳng.";
      groups = { a: proof.a, b: proof.b };
      lines.push(
        KURATOWSKI,
        `Nhóm ${joinVi(proof.a)} và nhóm ${joinVi(proof.b)}: mỗi đỉnh nhóm này kề cả ba đỉnh nhóm kia, tạo thành K₃,₃. Vẽ phẳng được cả đồ thị thì cũng vẽ phẳng được phần K₃,₃ này, mà K₃,₃ không có tam giác và m = 9 > 2n − 4 = 8.`,
      );
      if (m <= 3 * n - 6)
        lines.push(`Ở màn này m = ${m} ≤ 3n − 6 = ${3 * n - 6}: đếm cạnh không đủ, phải tìm ra đồ thị con ẩn bên trong.`);
      break;
  }

  const grp = (id: string) => (groups?.a.includes(id) ? 1 : groups?.b.includes(id) ? 2 : 0);
  const marked = (id: string) => grp(id) > 0 || !!five?.includes(id);
  const highlight = !!groups || !!five;

  return {
    title,
    lines,
    figure: (
      <GraphBoard
        graph={graph}
        label={groups ? "Đồ thị con K₃,₃ trong đồ thị" : five ? "Đồ thị con K₅ trong đồ thị" : "Đồ thị vừa chơi"}
        radiusPx={16}
        allowTranspose={false}
        vertex={(id) => {
          const k = grp(id);
          return {
            state: highlight && !marked(id) ? "dim" : "idle",
            badge: k ? String(k) : undefined,
            badgeColor: k ? GROUP_COLORS[k - 1] : undefined,
            ring: five?.includes(id) ? "evidence" : undefined,
          };
        }}
        edge={(e) => {
          const inside = groups ? grp(e.u) * grp(e.v) === 2 : five ? five.includes(e.u) && five.includes(e.v) : false;
          return { state: !highlight ? "idle" : inside ? "result" : "dim", label: null };
        }}
      />
    ),
    caption: groups
      ? "Số 1, 2 trên đỉnh là hai nhóm của K₃,₃; cạnh đậm là 9 cạnh nối hai nhóm."
      : five
        ? "Vòng cam: năm đỉnh của K₅."
        : level.title,
    cite: CITE,
  };
}
