// Luật chơi Gỡ rối (Ch.4 – Đồ thị phẳng). Reducer thuần: phát lại nhật ký thao tác cho đúng kết quả cũ,
// nên server chấm lại được (verify.ts).
//
// Đồ thị phẳng: kéo đỉnh cho tới khi không còn giao cắt, rồi đếm số mặt của hình vừa vẽ (công thức Euler).
// Đồ thị không phẳng: đưa một bằng chứng đúng (judgeProof).

import { conflictCount, conflicts, judgeProof, positionsOf, type PlanarityProof, type Positions } from "../algorithms/planarity";
import { components, type Graph, type VertexId } from "../graph";

/** Vùng đặt đỉnh (tọa độ logic, cùng khung với dữ liệu màn). */
export const FRAME = { minX: 40, minY: 30, maxX: 820, maxY: 470 };
/** Hai đỉnh không được đặt gần nhau hơn khoảng này. */
export const MIN_GAP = 84;

export type UntangleAction =
  | { t: "move"; v: VertexId; x: number; y: number }
  | { t: "faces"; n: number }
  | { t: "claim"; proof: PlanarityProof };

export interface UntangleState {
  pos: Positions;
  moves: number;
  mistakes: number;
  /** untangled: đã hết giao cắt, đang trả lời câu hỏi số mặt */
  status: "playing" | "untangled" | "won" | "proved";
}

export type UntangleEvent =
  | { kind: "moved"; conflicts: number }
  | { kind: "untangled" }
  | { kind: "invalid"; reason: "too-close" | "locked" | "unknown"; near?: VertexId }
  | { kind: "faces-ok" }
  | { kind: "faces-wrong"; answer: number }
  | { kind: "claim-ok" }
  | { kind: "claim-wrong"; reason: string };

export const initialUntangle = (g: Graph): UntangleState => ({
  pos: positionsOf(g),
  moves: 0,
  mistakes: 0,
  status: "playing",
});

export const clampToFrame = (x: number, y: number) => ({
  x: Math.round(Math.max(FRAME.minX, Math.min(FRAME.maxX, x))),
  y: Math.round(Math.max(FRAME.minY, Math.min(FRAME.maxY, y))),
});

/** Đỉnh khác nằm quá gần điểm (x, y), hoặc null. */
export function crowdedBy(pos: Positions, v: VertexId, x: number, y: number): VertexId | null {
  let best: VertexId | null = null;
  let bd = MIN_GAP;
  for (const [id, p] of Object.entries(pos)) {
    if (id === v) continue;
    const d = Math.hypot(p.x - x, p.y - y);
    if (d < bd) {
      bd = d;
      best = id;
    }
  }
  return best;
}

/** Số mặt của một cách vẽ phẳng: n − m + f = 1 + số thành phần liên thông (Euler). */
export function faceCount(g: Graph): number {
  return g.edges.length - g.vertices.length + 1 + components(g).length;
}

export function untangleStep(g: Graph, s: UntangleState, a: UntangleAction): { state: UntangleState; event: UntangleEvent } {
  if (s.status === "won" || s.status === "proved") return { state: s, event: { kind: "invalid", reason: "locked" } };

  switch (a.t) {
    case "move": {
      if (s.status !== "playing") return { state: s, event: { kind: "invalid", reason: "locked" } };
      if (!(a.v in s.pos) || !Number.isFinite(a.x) || !Number.isFinite(a.y))
        return { state: s, event: { kind: "invalid", reason: "unknown" } };
      const p = clampToFrame(a.x, a.y);
      const near = crowdedBy(s.pos, a.v, p.x, p.y);
      if (near) return { state: s, event: { kind: "invalid", reason: "too-close", near } };
      const pos = { ...s.pos, [a.v]: p };
      const c = conflictCount(conflicts(g, pos));
      const moved = { ...s, pos, moves: s.moves + 1 };
      if (c === 0) return { state: { ...moved, status: "untangled" }, event: { kind: "untangled" } };
      return { state: moved, event: { kind: "moved", conflicts: c } };
    }

    case "faces": {
      if (s.status !== "untangled") return { state: s, event: { kind: "invalid", reason: "locked" } };
      if (Math.round(a.n) === faceCount(g)) return { state: { ...s, status: "won" }, event: { kind: "faces-ok" } };
      return { state: { ...s, mistakes: s.mistakes + 1 }, event: { kind: "faces-wrong", answer: Math.round(a.n) } };
    }

    case "claim": {
      if (s.status !== "playing") return { state: s, event: { kind: "invalid", reason: "locked" } };
      const res = judgeProof(g, a.proof);
      if (res.correct) return { state: { ...s, status: "proved" }, event: { kind: "claim-ok" } };
      return { state: { ...s, mistakes: s.mistakes + 1 }, event: { kind: "claim-wrong", reason: res.reason } };
    }
  }
}

export function replayUntangle(g: Graph, actions: UntangleAction[]): UntangleState {
  let s = initialUntangle(g);
  for (const a of actions) s = untangleStep(g, s, a).state;
  return s;
}
