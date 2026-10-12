// BFS và DFS tham chiếu. Đây là "bộ chấm" của game Tôi là thuật toán.
// Khi tích hợp, có thể thay bằng simulation engine của TV3 miễn trả về cùng
// thứ tự thăm (xem docs/INTEGRATION.md).

import { adjacency, type Graph, type VertexId } from "../graph";

export interface BfsResult {
  /** thứ tự lấy ra khỏi hàng đợi (= thứ tự thăm) */
  order: VertexId[];
  pred: Record<VertexId, VertexId | null>;
  /** số cạnh từ đỉnh xuất phát; đỉnh không tới được không có mặt */
  dist: Record<VertexId, number>;
}

/** BFS: đánh dấu đã thăm khi đưa vào hàng đợi; đỉnh kề duyệt theo chỉ số tăng dần. */
export function bfs(g: Graph, s: VertexId): BfsResult {
  const adj = adjacency(g);
  const pred: Record<VertexId, VertexId | null> = { [s]: null };
  const dist: Record<VertexId, number> = { [s]: 0 };
  const order: VertexId[] = [];
  const queue: VertexId[] = [s];
  while (queue.length) {
    const u = queue.shift()!;
    order.push(u);
    for (const { v } of adj.get(u)!) {
      if (v in dist) continue;
      dist[v] = dist[u] + 1;
      pred[v] = u;
      queue.push(v);
    }
  }
  return { order, pred, dist };
}

export type DfsStep = { kind: "push"; v: VertexId; from: VertexId } | { kind: "pop"; v: VertexId };

export interface DfsResult {
  /** thứ tự thăm (thứ tự được đẩy vào ngăn xếp) */
  order: VertexId[];
  pred: Record<VertexId, VertexId | null>;
  /** chuỗi thao tác sau khi đẩy đỉnh xuất phát */
  steps: DfsStep[];
}

/**
 * DFS bằng ngăn xếp, đẩy từng đỉnh: xét đỉnh trên cùng, đẩy đỉnh kề chưa thăm có chỉ số
 * nhỏ nhất; nếu không còn thì lấy ra. Thứ tự thăm trùng với DFS đệ quy.
 */
export function dfs(g: Graph, s: VertexId): DfsResult {
  const adj = adjacency(g);
  const visited = new Set<VertexId>([s]);
  const pred: Record<VertexId, VertexId | null> = { [s]: null };
  const order: VertexId[] = [s];
  const steps: DfsStep[] = [];
  const stack: VertexId[] = [s];
  while (stack.length) {
    const top = stack[stack.length - 1];
    const next = adj.get(top)!.find(({ v }) => !visited.has(v));
    if (next) {
      visited.add(next.v);
      pred[next.v] = top;
      order.push(next.v);
      stack.push(next.v);
      steps.push({ kind: "push", v: next.v, from: top });
    } else {
      stack.pop();
      steps.push({ kind: "pop", v: top });
    }
  }
  return { order, pred, steps };
}
