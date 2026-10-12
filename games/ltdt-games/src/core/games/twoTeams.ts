// Luật chơi Chia đội (Ch.4 – Đồ thị hai phía). Hai đầu mỗi cạnh ("hay cãi nhau") phải ở hai đội khác nhau.
// Chia được thì bấm Kiểm tra; không chia được thì chỉ ra một chu trình lẻ. Reducer thuần, phát lại được.

import { judgeOddCycle } from "../algorithms/bipartite";
import type { Graph, VertexId } from "../graph";

export type Team = "X" | "Y";

export type TeamsAction =
  | { t: "assign"; v: VertexId; team: Team | null }
  | { t: "clear" }
  | { t: "check" }
  | { t: "claim"; cycle: VertexId[] };

export interface TeamsState {
  team: Record<VertexId, Team>;
  mistakes: number;
  checks: number;
  status: "playing" | "won" | "proved";
}

export type TeamsEvent =
  | { kind: "assigned" }
  | { kind: "cleared" }
  | { kind: "incomplete"; missing: VertexId[] }
  | { kind: "conflicts"; edges: string[] }
  | { kind: "won" }
  | { kind: "claim-ok" }
  | { kind: "claim-wrong"; reason: string }
  | { kind: "invalid" };

export const initialTeams = (): TeamsState => ({ team: {}, mistakes: 0, checks: 0, status: "playing" });

/** Các cạnh có hai đầu cùng đội. */
export function sameTeamEdges(g: Graph, team: Record<VertexId, Team>): string[] {
  return g.edges.filter((e) => team[e.u] && team[e.u] === team[e.v]).map((e) => e.id);
}

export function teamsStep(g: Graph, s: TeamsState, a: TeamsAction): { state: TeamsState; event: TeamsEvent } {
  if (s.status !== "playing") return { state: s, event: { kind: "invalid" } };
  switch (a.t) {
    case "assign": {
      if (!g.vertices.some((v) => v.id === a.v)) return { state: s, event: { kind: "invalid" } };
      const team = { ...s.team };
      if (a.team === "X" || a.team === "Y") team[a.v] = a.team;
      else delete team[a.v];
      return { state: { ...s, team }, event: { kind: "assigned" } };
    }
    case "clear":
      return { state: { ...s, team: {} }, event: { kind: "cleared" } };
    case "check": {
      const missing = g.vertices.filter((v) => !s.team[v.id]).map((v) => v.id);
      if (missing.length) return { state: s, event: { kind: "incomplete", missing } };
      const bad = sameTeamEdges(g, s.team);
      const checks = s.checks + 1;
      if (bad.length) return { state: { ...s, checks, mistakes: s.mistakes + 1 }, event: { kind: "conflicts", edges: bad } };
      return { state: { ...s, checks, status: "won" }, event: { kind: "won" } };
    }
    case "claim": {
      const res = judgeOddCycle(g, Array.isArray(a.cycle) ? a.cycle : []);
      if (res.correct) return { state: { ...s, status: "proved" }, event: { kind: "claim-ok" } };
      return { state: { ...s, mistakes: s.mistakes + 1 }, event: { kind: "claim-wrong", reason: res.reason } };
    }
  }
}

export function replayTeams(g: Graph, actions: TeamsAction[]): TeamsState {
  let s = initialTeams();
  for (const a of actions) s = teamsStep(g, s, a).state;
  return s;
}
