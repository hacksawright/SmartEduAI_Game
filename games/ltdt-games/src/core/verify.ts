// Chấm lại một bài làm từ nhật ký (mục 6 kế hoạch: "ưu tiên tính sao/điểm phía server từ dữ liệu
// bài làm"). Client và server gọi cùng một hàm, nên kết quả hai bên luôn khớp.

import { chromaticNumber } from "./algorithms/coloring";
import { createBfsEngine, type BfsAnswer } from "./engines/bfsEngine";
import { createDfsEngine, type DfsAnswer } from "./engines/dfsEngine";
import { createDijkstraEngine, type DijkstraAnswer } from "./engines/dijkstraEngine";
import type { PredictionEngine } from "./engines/types";
import { isPermutation, runGreedy } from "./games/greedyOrder";
import { compareKeys } from "./games/matrixTranslate";
import { analyzeMuddy, optimalCost, validatePaved } from "./games/muddyCity";
import { replayFlow, type FlowAction } from "./games/maxFlow";
import { replayOneStroke, type OneStrokeAction } from "./games/oneStroke";
import { replayTeams, type TeamsAction } from "./games/twoTeams";
import { replayUntangle, type UntangleAction } from "./games/untangle";
import { makeGraph, type VertexId } from "./graph";
import { getLevel, RACE_SUFFIX } from "./registry";
import {
  algoOutcome,
  greedyOutcome,
  matrixOutcome,
  muddyOutcome,
  oneStrokeOutcome,
  puzzleOutcome,
  type Outcome,
} from "./scoring";

export const MAX_LIVES = 3;
const MAX_LOG = 5000;

export interface RaceClaim {
  won: boolean;
  elapsedMs: number;
}

export type Submission =
  | { kind: "traversal"; answers: (BfsAnswer | DfsAnswer)[]; hints: number; race?: RaceClaim }
  | { kind: "dijkstra"; answers: DijkstraAnswer[]; hints: number; race?: RaceClaim }
  | { kind: "one_stroke"; actions: OneStrokeAction[]; hints: number }
  | { kind: "muddy_city"; paved: string[]; hints: number }
  | { kind: "greedy_order"; runs: VertexId[][]; hints: number }
  | { kind: "matrix_translate"; checks: { answer: string[]; elapsedMs: number }[]; hints: number }
  | { kind: "untangle"; actions: UntangleAction[]; hints: number }
  | { kind: "two_teams"; actions: TeamsAction[]; hints: number }
  | { kind: "max_flow"; actions: FlowAction[]; hints: number };

export type VerifyResult =
  | ({ ok: true } & Outcome & { detail: Record<string, number> })
  | { ok: false; reason: string };

const fail = (reason: string): VerifyResult => ({ ok: false, reason });

export function replayPrediction<S, A>(
  engine: PredictionEngine<S, A>,
  answers: A[],
): { ok: true; questions: number; mistakes: number } | { ok: false; reason: string } {
  let s = engine.init();
  let mistakes = 0;
  let questions = 0;
  for (const a of answers) {
    if (engine.isDone(s)) return { ok: false, reason: "Có câu trả lời sau khi thuật toán đã kết thúc." };
    const v = engine.check(s, a);
    questions++;
    if (!v.correct) {
      mistakes++;
      if (mistakes >= MAX_LIVES) return { ok: false, reason: "Hết mạng." };
    }
    s = engine.apply(s, v.expected);
  }
  if (!engine.isDone(s)) return { ok: false, reason: "Thuật toán chưa chạy xong." };
  return { ok: true, questions, mistakes };
}

export function verifySubmission(levelId: string, sub: Submission): VerifyResult {
  const level = getLevel(levelId);
  if (!level) return fail(`Không có màn ${levelId}.`);
  if (level.game !== sub.kind) return fail("Bài làm không khớp loại game của màn.");
  const hints = Math.max(0, Math.floor(Number(sub.hints) || 0));
  const g = makeGraph(level.graph);
  const isRace = levelId.endsWith(RACE_SUFFIX);

  switch (sub.kind) {
    case "traversal":
    case "dijkstra": {
      if (!Array.isArray(sub.answers) || sub.answers.length > MAX_LOG) return fail("Nhật ký không hợp lệ.");
      if (isRace && !sub.race?.won) return fail("Chưa thắng máy.");
      let r: ReturnType<typeof replayPrediction>;
      if (sub.kind === "dijkstra" && level.game === "dijkstra") {
        r = replayPrediction(createDijkstraEngine(g, level.source), sub.answers);
      } else if (sub.kind === "traversal" && level.game === "traversal") {
        r =
          level.algo === "bfs"
            ? replayPrediction(createBfsEngine(g, level.start), sub.answers as BfsAnswer[])
            : replayPrediction(createDfsEngine(g, level.start), sub.answers as DfsAnswer[]);
      } else return fail("Bài làm không khớp loại game của màn.");
      if (!r.ok) return fail(r.reason);
      const o = algoOutcome({ questions: r.questions, mistakes: r.mistakes, hints });
      return { ok: true, ...o, detail: { questions: r.questions, mistakes: r.mistakes, hints } };
    }

    case "one_stroke": {
      if (level.game !== "one_stroke") return fail("Sai loại game.");
      if (!Array.isArray(sub.actions) || sub.actions.length > MAX_LOG) return fail("Nhật ký không hợp lệ.");
      const s = replayOneStroke(g, sub.actions);
      if (s.status !== "won" && s.status !== "proved") return fail("Chưa vẽ xong và chưa chứng minh bất khả.");
      const o = oneStrokeOutcome({ mistakes: s.mistakes, hints });
      return { ok: true, ...o, detail: { mistakes: s.mistakes, hints } };
    }

    case "muddy_city": {
      if (level.game !== "muddy_city") return fail("Sai loại game.");
      if (!Array.isArray(sub.paved)) return fail("Bài làm không hợp lệ.");
      const rules = { locked: level.locked ?? [], broken: level.broken ?? [] };
      const bad = validatePaved(g, rules, sub.paved);
      if (bad) return fail(bad);
      const a = analyzeMuddy(g, sub.paved);
      if (!a.spanning) return fail("Tập đường đã lát chưa phải cây khung.");
      const optimal = optimalCost(g, rules);
      const o = muddyOutcome({ cost: a.cost, optimal, hints });
      return { ok: true, ...o, detail: { cost: a.cost, optimal, hints } };
    }

    case "greedy_order": {
      if (level.game !== "greedy_order") return fail("Sai loại game.");
      if (!Array.isArray(sub.runs) || sub.runs.length > MAX_LOG) return fail("Nhật ký không hợp lệ.");
      const chi = chromaticNumber(g);
      let runs = 0;
      for (const order of sub.runs) {
        if (!isPermutation(g, order)) return fail("Thứ tự đỉnh không hợp lệ.");
        runs++;
        if (runGreedy(g, order).count === chi) {
          const o = greedyOutcome({ runs, hints });
          return { ok: true, ...o, detail: { runs, chi, hints } };
        }
      }
      return fail("Chưa đạt số màu nhỏ nhất.");
    }

    case "matrix_translate": {
      if (level.game !== "matrix_translate") return fail("Sai loại game.");
      if (!Array.isArray(sub.checks) || sub.checks.length > MAX_LOG) return fail("Nhật ký không hợp lệ.");
      let checks = 0;
      for (const c of sub.checks) {
        checks++;
        if (compareKeys(g, c.answer).correct) {
          const overParSeconds = Math.max(0, Math.round(Number(c.elapsedMs) / 1000 - level.par));
          const o = matrixOutcome({ checks, overParSeconds, hints });
          return { ok: true, ...o, detail: { checks, overParSeconds, hints } };
        }
      }
      return fail("Chưa có lần kiểm tra nào đúng.");
    }

    case "untangle": {
      if (level.game !== "untangle") return fail("Sai loại game.");
      if (!Array.isArray(sub.actions) || sub.actions.length > MAX_LOG) return fail("Nhật ký không hợp lệ.");
      const s = replayUntangle(g, sub.actions);
      if (s.status !== "won" && s.status !== "proved") return fail("Chưa gỡ xong và chưa chứng minh không phẳng.");
      const o = puzzleOutcome({ mistakes: s.mistakes, hints });
      return { ok: true, ...o, detail: { mistakes: s.mistakes, moves: s.moves, hints } };
    }

    case "two_teams": {
      if (level.game !== "two_teams") return fail("Sai loại game.");
      if (!Array.isArray(sub.actions) || sub.actions.length > MAX_LOG) return fail("Nhật ký không hợp lệ.");
      const s = replayTeams(g, sub.actions);
      if (s.status !== "won" && s.status !== "proved") return fail("Chưa chia xong và chưa chỉ ra chu trình lẻ.");
      const o = puzzleOutcome({ mistakes: s.mistakes, hints });
      return { ok: true, ...o, detail: { mistakes: s.mistakes, checks: s.checks, hints } };
    }

    case "max_flow": {
      if (level.game !== "max_flow") return fail("Sai loại game.");
      if (!Array.isArray(sub.actions) || sub.actions.length > MAX_LOG) return fail("Nhật ký không hợp lệ.");
      const s = replayFlow(g, level, sub.actions);
      if (s.phase !== "won") return fail("Chưa đạt luồng cực đại và lát cắt nhỏ nhất.");
      const o = puzzleOutcome({ mistakes: s.mistakes, hints });
      return { ok: true, ...o, detail: { mistakes: s.mistakes, pushes: s.pushes, value: level.maxFlow, hints } };
    }
  }
}
