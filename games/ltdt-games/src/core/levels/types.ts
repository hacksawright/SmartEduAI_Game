import type { GraphSpec, VertexId } from "../graph";

export type GameId = "traversal" | "dijkstra" | "one_stroke" | "muddy_city" | "greedy_order" | "matrix_translate";
export type ChapterId = "ch1" | "ch2" | "ch3" | "ch4" | "ch5" | "ch6" | "ch7" | "ch8";

interface BaseLevel {
  /** id dùng trong event, ví dụ "ch3-l07" */
  id: string;
  game: GameId;
  chapter: ChapterId;
  /** nhóm màn trong game (BFS/DFS dùng chung game "traversal") */
  track: string;
  /** số thứ tự trong nhóm, từ 1 */
  n: number;
  title: string;
  /** một câu mục tiêu hiện khi vào màn */
  intro: string;
  /** điều mới của màn (nếu có) */
  tip?: string;
  graph: GraphSpec;
}

export interface TraversalLevel extends BaseLevel {
  game: "traversal";
  algo: "bfs" | "dfs";
  start: VertexId;
}

export interface DijkstraLevel extends BaseLevel {
  game: "dijkstra";
  source: VertexId;
}

export interface OneStrokeLevel extends BaseLevel {
  game: "one_stroke";
  /** hiện bậc / bán bậc vào-ra trên hình */
  show: "none" | "degree" | "inout";
  /** loại đáp án (kiểm thử đối chiếu với analyzeEuler) */
  expect: "circuit" | "path" | "none";
  decor?: "river";
}

export interface MuddyLevel extends BaseLevel {
  game: "muddy_city";
  variant?: "forced" | "broken";
  locked?: string[];
  broken?: string[];
}

export interface GreedyLevel extends BaseLevel {
  game: "greedy_order";
  /** χ(G), kiểm thử đối chiếu với chromaticNumber */
  chi: number;
  /** số màu Greedy dùng với thứ tự mặc định 1..n */
  defaultColors: number;
}

export type MatrixMode = "adj-to-graph" | "graph-to-adj" | "list-to-graph" | "inc-to-graph";

export interface MatrixLevel extends BaseLevel {
  game: "matrix_translate";
  mode: MatrixMode;
  /** thời gian chuẩn để đạt 3 sao (giây) */
  par: number;
}

export type Level = TraversalLevel | DijkstraLevel | OneStrokeLevel | MuddyLevel | GreedyLevel | MatrixLevel;
