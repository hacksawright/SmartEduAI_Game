// Danh mục chương, game và màn chơi.

import { dijkstraLevels } from "./levels/dijkstra";
import { greedyLevels } from "./levels/greedy";
import { matrixLevels } from "./levels/matrix";
import { muddyLevels } from "./levels/muddy";
import { oneStrokeLevels } from "./levels/oneStroke";
import { traversalLevels } from "./levels/traversal";
import type { ChapterId, GameId, Level } from "./levels/types";

export interface Track {
  id: string;
  title: string;
}

export interface GameMeta {
  id: GameId;
  chapter: ChapterId;
  title: string;
  subtitle: string;
  blurb: string;
  priority: "P0" | "P0+";
  tracks: Track[];
  levels: Level[];
  /** chế độ Đua với máy: số giây máy cần cho mỗi câu hỏi */
  raceSecondsPerQuestion?: number;
}

export interface ChapterMeta {
  id: ChapterId;
  n: number;
  title: string;
  games: GameId[];
  /** game của giai đoạn 2 (chỉ để hiện trên trang chương) */
  later: string[];
}

export const GAMES: GameMeta[] = [
  {
    id: "matrix_translate",
    chapter: "ch1",
    title: "Dịch ma trận",
    subtitle: "Ma trận kề · danh sách kề · ma trận liên thuộc",
    blurb: "Đọc ma trận để vẽ đồ thị và ngược lại, có tính giờ.",
    priority: "P0+",
    tracks: [{ id: "matrix_translate", title: "Dịch ma trận" }],
    levels: matrixLevels,
  },
  {
    id: "traversal",
    chapter: "ch2",
    title: "Tôi là thuật toán",
    subtitle: "BFS · DFS",
    blurb: "Đóng vai thuật toán: đoán đỉnh tiếp theo và trạng thái hàng đợi, ngăn xếp.",
    priority: "P0",
    tracks: [
      { id: "bfs", title: "BFS – hàng đợi" },
      { id: "dfs", title: "DFS – ngăn xếp" },
    ],
    levels: traversalLevels,
    raceSecondsPerQuestion: 6,
  },
  {
    id: "one_stroke",
    chapter: "ch3",
    title: "Một nét vẽ",
    subtitle: "Đường đi và chu trình Euler",
    blurb: "Vẽ hình bằng một nét. Có những hình không vẽ được: hãy chứng minh.",
    priority: "P0",
    tracks: [{ id: "one_stroke", title: "Một nét vẽ" }],
    levels: oneStrokeLevels,
  },
  {
    id: "greedy_order",
    chapter: "ch5",
    title: "Xếp thứ tự cho Greedy",
    subtitle: "Tô màu đồ thị",
    blurb: "Sắp lại thứ tự đỉnh để thuật toán Greedy dùng ít màu nhất.",
    priority: "P0+",
    tracks: [{ id: "greedy_order", title: "Xếp thứ tự cho Greedy" }],
    levels: greedyLevels,
  },
  {
    id: "dijkstra",
    chapter: "ch6",
    title: "Tôi là Dijkstra",
    subtitle: "Đường đi ngắn nhất",
    blurb: "Tự tay cố định nhãn và cập nhật d, pred. Qua màn rồi thì đua với máy.",
    priority: "P0",
    tracks: [{ id: "dijkstra", title: "Dijkstra" }],
    levels: dijkstraLevels,
    raceSecondsPerQuestion: 9,
  },
  {
    id: "muddy_city",
    chapter: "ch7",
    title: "Thành phố bùn",
    subtitle: "Cây khung nhỏ nhất",
    blurb: "Lát đường nối mọi ngôi nhà với chi phí nhỏ nhất, rồi so với Kruskal và Prim.",
    priority: "P0",
    tracks: [{ id: "muddy_city", title: "Thành phố bùn" }],
    levels: muddyLevels,
  },
];

export const CHAPTERS: ChapterMeta[] = [
  { id: "ch1", n: 1, title: "Đại cương về đồ thị", games: ["matrix_translate"], later: ["Bảy cây cầu Königsberg"] },
  { id: "ch2", n: 2, title: "Duyệt đồ thị và tính liên thông", games: ["traversal"], later: ["Kẻ phá mạng"] },
  { id: "ch3", n: 3, title: "Đồ thị Euler và Hamilton", games: ["one_stroke"], later: ["Icosian"] },
  { id: "ch4", n: 4, title: "Đồ thị phẳng và đồ thị hai phía", games: [], later: ["Gỡ rối (Planarity)", "Chia đội"] },
  { id: "ch5", n: 5, title: "Tô màu đồ thị", games: ["greedy_order"], later: ["Người vẽ bản đồ", "Đấu tô màu vs AI"] },
  { id: "ch6", n: 6, title: "Đường đi ngắn nhất", games: ["dijkstra"], later: ["Săn chênh lệch tỷ giá"] },
  { id: "ch7", n: 7, title: "Cây và cây khung nhỏ nhất", games: ["muddy_city"], later: ["Cắt – Nối"] },
  { id: "ch8", n: 8, title: "Luồng cực đại", games: [], later: ["Ống nước & nút thắt"] },
];

const levelIndex = new Map<string, Level>();
for (const g of GAMES) for (const l of g.levels) levelIndex.set(l.id, l);

export const RACE_SUFFIX = "-race";

export function getGame(id: GameId): GameMeta {
  const g = GAMES.find((x) => x.id === id);
  if (!g) throw new Error(`Không có game ${id}`);
  return g;
}

export function findGame(id: string): GameMeta | undefined {
  return GAMES.find((x) => x.id === id);
}

/** Tra màn theo id; id có hậu tố "-race" trả về màn gốc. */
export function getLevel(levelId: string): Level | undefined {
  return levelIndex.get(levelId.endsWith(RACE_SUFFIX) ? levelId.slice(0, -RACE_SUFFIX.length) : levelId);
}

export function allLevels(): Level[] {
  return [...levelIndex.values()];
}

/** Màn kế tiếp trong cùng nhóm (track), hoặc undefined nếu là màn cuối. */
export function nextLevel(level: Level): Level | undefined {
  const g = getGame(level.game);
  return g.levels.find((l) => l.track === level.track && l.n === level.n + 1);
}

export function prevLevel(level: Level): Level | undefined {
  const g = getGame(level.game);
  return g.levels.find((l) => l.track === level.track && l.n === level.n - 1);
}

export function chapterOf(id: ChapterId): ChapterMeta {
  return CHAPTERS.find((c) => c.id === id)!;
}

export function supportsRace(level: Level): boolean {
  return getGame(level.game).raceSecondsPerQuestion !== undefined;
}
