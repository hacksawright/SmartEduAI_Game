// Phần thuần logic của Dịch ma trận phía giao diện: khóa cạnh, chênh lệch đáp án, gợi ý.

import type { Hint } from "../../core/engines/types";
import { edgeKey, targetKeys } from "../../core/games/matrixTranslate";
import { indexMap, type Edge, type Graph, type VertexId } from "../../core/graph";
import type { MatrixLevel } from "../../core/levels/types";

/** Hai đầu của một khóa "u|v" (vô hướng) hoặc "u>v" (có hướng). */
export function keyEnds(key: string): [VertexId, VertexId] {
  const [u, v] = key.split(/[|>]/);
  return [u, v];
}

/** "1–2" hoặc "1 → 2". */
export function keyName(key: string): string {
  const [u, v] = keyEnds(key);
  return key.includes(">") ? `${u} → ${v}` : `${u}–${v}`;
}

/** Đồ thị gồm các cạnh sinh viên đã vẽ (id cạnh chính là khóa). */
export function drawnGraph(g: Graph, keys: string[]): Graph {
  const edges: Edge[] = keys.map((k) => {
    const [u, v] = keyEnds(k);
    return { id: k, u, v };
  });
  return { directed: g.directed, vertices: g.vertices, edges };
}

/** Các cạnh còn thiếu và thừa, theo thứ tự đỉnh. */
export function diffKeys(g: Graph, keys: string[]): { missing: string[]; extra: string[] } {
  const want = targetKeys(g);
  const got = new Set(keys);
  const idx = indexMap(g);
  const byIndex = (a: string, b: string) => {
    const [a1, a2] = keyEnds(a);
    const [b1, b2] = keyEnds(b);
    return idx.get(a1)! - idx.get(b1)! || idx.get(a2)! - idx.get(b2)!;
  };
  return {
    missing: want.filter((k) => !got.has(k)).sort(byIndex),
    extra: keys.filter((k) => !want.includes(k)).sort(byIndex),
  };
}

/** Ô (i, j) của ma trận kề dựng từ tập khóa. */
export function cellOn(g: Graph, keys: string[], u: VertexId, v: VertexId): boolean {
  if (u === v) return false;
  return keys.includes(edgeKey(g, u, v));
}

export const edgeWord = (g: Graph) => (g.directed ? "cung" : "cạnh");

export const reprName: Record<MatrixLevel["mode"], string> = {
  "adj-to-graph": "ma trận kề",
  "graph-to-adj": "đồ thị",
  "list-to-graph": "danh sách kề",
  "inc-to-graph": "ma trận liên thuộc",
};

/** "thiếu 1 cạnh, thừa 2 cạnh" (bỏ phần bằng 0). */
export function diffText(g: Graph, mode: MatrixLevel["mode"], missing: number, extra: number): string {
  const w = edgeWord(g);
  if (mode === "graph-to-adj") {
    const parts: string[] = [];
    if (missing) parts.push(`${missing} cạnh chưa được điền số 1`);
    if (extra) parts.push(`${extra} ${g.directed ? "ô" : "cặp ô"} điền 1 nhưng không có cạnh`);
    return `Ma trận còn sai: ${parts.join(", ")}.`;
  }
  const parts: string[] = [];
  if (missing) parts.push(`thiếu ${missing} ${w}`);
  if (extra) parts.push(`thừa ${extra} ${w}`);
  return `Đồ thị của bạn ${parts.join(", ")} so với ${reprName[mode]}.`;
}

export function matrixHint(level: MatrixLevel, g: Graph, keys: string[], lvl: 1 | 2): Hint {
  const w = edgeWord(g);
  if (lvl === 1) {
    switch (level.mode) {
      case "adj-to-graph":
        return {
          text: g.directed
            ? "Với đồ thị có hướng, ô hàng i, cột j bằng 1 là cung đi từ i tới j hay từ j tới i? Đọc lần lượt từng hàng."
            : "Ô hàng i, cột j bằng 1 nghĩa là gì? Thử đọc từng hàng: hàng 1 có số 1 ở những cột nào?",
        };
      case "graph-to-adj":
        return { text: "Đỉnh 1 kề với những đỉnh nào? Hàng 1 cần số 1 ở đúng các cột đó, còn lại là 0." };
      case "list-to-graph":
        return { text: "Dòng “i: a, b” cho biết i kề a và b. Mỗi cạnh xuất hiện ở mấy dòng?" };
      case "inc-to-graph":
        return { text: "Mỗi cột là một cạnh. Hai số 1 trong cột nằm ở hai hàng nào? Đó là hai đầu của cạnh." };
    }
  }
  const { missing, extra } = diffKeys(g, keys);
  const key = missing[0] ?? extra[0];
  if (!key) return { text: "Bài làm đã khớp. Bấm Kiểm tra!" };
  const [u, v] = keyEnds(key);
  const isMissing = key === missing[0];
  const name = keyName(key);
  let text: string;
  switch (level.mode) {
    case "adj-to-graph":
      text = isMissing
        ? `Ô hàng ${u}, cột ${v} bằng 1: còn thiếu ${w} ${name}.`
        : `Ô hàng ${u}, cột ${v} bằng 0: ${w} ${name} là thừa. Chạm ${u} rồi ${v} để bỏ.`;
      break;
    case "graph-to-adj":
      text = isMissing
        ? `${u} và ${v} kề nhau: ô hàng ${u}, cột ${v}${g.directed ? "" : " (và ô đối xứng)"} phải bằng 1.`
        : `${u} và ${v} không kề nhau: ô hàng ${u}, cột ${v} phải bằng 0.`;
      break;
    case "list-to-graph":
      text = isMissing
        ? `Dòng của ${u} có ${v}: còn thiếu cạnh ${name}.`
        : `Dòng của ${u} không có ${v}: cạnh ${name} là thừa. Chạm ${u} rồi ${v} để bỏ.`;
      break;
    case "inc-to-graph": {
      const col = g.edges.findIndex((e) => edgeKey(g, e.u, e.v) === key);
      text =
        isMissing && col >= 0
          ? `Cột e${col + 1} có số 1 ở hàng ${u} và hàng ${v}: còn thiếu cạnh ${name}.`
          : `Không cột nào có số 1 ở cả hàng ${u} và hàng ${v}: cạnh ${name} là thừa. Chạm ${u} rồi ${v} để bỏ.`;
      break;
    }
  }
  return { text, highlight: [u, v] };
}
