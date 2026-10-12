// Trợ giúp cho e2e: mở màn, theo dõi lỗi console và lời giải chuẩn của từng game.
// Lời giải lấy từ chính engine/thuật toán tham chiếu trong src/core, nên test tự theo kịp khi đổi dữ liệu màn.

import { expect, type Page, type TestInfo } from "@playwright/test";
import { analyzeEuler, findEulerTrail } from "../../src/core/algorithms/euler";
import { optimalGreedyOrder } from "../../src/core/algorithms/coloring";
import { kruskal } from "../../src/core/algorithms/spanningTree";
import { createBfsEngine } from "../../src/core/engines/bfsEngine";
import { createDfsEngine } from "../../src/core/engines/dfsEngine";
import { createDijkstraEngine } from "../../src/core/engines/dijkstraEngine";
import { targetKeys } from "../../src/core/games/matrixTranslate";
import { makeGraph, type VertexId } from "../../src/core/graph";
import type {
  DijkstraLevel,
  GreedyLevel,
  Level,
  MatrixLevel,
  MuddyLevel,
  OneStrokeLevel,
  TraversalLevel,
} from "../../src/core/levels/types";

/** Ghi lại lỗi/cảnh báo console, lỗi trang và response HTTP ≥ 400. */
export function watchProblems(page: Page): string[] {
  const problems: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") problems.push(`console.${m.type()}: ${m.text()}`);
  });
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
  page.on("response", (r) => {
    if (r.status() >= 400) problems.push(`HTTP ${r.status()} ${r.url()}`);
  });
  return problems;
}

/** id sinh viên riêng cho mỗi test, để điểm và tiến độ không lẫn nhau. */
export function userFor(info: TestInfo, tag: string): string {
  return `e2e-${tag}-${info.project.name}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export async function openLevel(page: Page, levelId: string, user: string, query = "&unlock=all") {
  await page.goto(`/?user=${user}${query}#/play/${levelId}`);
  await page.getByRole("button", { name: "Bắt đầu", exact: true }).click();
}

export async function tapVertex(page: Page, id: VertexId) {
  await page.locator(`[role="button"][data-vertex="${id}"]`).click();
}

export async function press(page: Page, name: string) {
  await page.getByRole("button", { name, exact: true }).click();
}

export async function expectResult(page: Page, stars: number) {
  await expect(page.locator(".lg-result__stars")).toHaveAttribute("aria-label", `${stars} trên 3 sao`, { timeout: 15_000 });
}

// ---------------------------------------------------------------- lời giải

export async function solveLevel(page: Page, level: Level) {
  switch (level.game) {
    case "traversal":
      return solveTraversal(page, level);
    case "dijkstra":
      return solveDijkstra(page, level);
    case "one_stroke":
      return solveOneStroke(page, level);
    case "muddy_city":
      return solveMuddy(page, level);
    case "greedy_order":
      return solveGreedy(page, level);
    case "matrix_translate":
      return solveMatrix(page, level);
  }
}

async function solveTraversal(page: Page, level: TraversalLevel) {
  const g = makeGraph(level.graph);
  if (level.algo === "bfs") {
    const eng = createBfsEngine(g, level.start);
    for (let s = eng.init(); !eng.isDone(s); ) {
      const a = eng.expected(s)!;
      if (a.type === "dequeue") await tapVertex(page, a.v);
      else {
        for (const v of a.vs) await tapVertex(page, v);
        await press(page, a.vs.length ? "Xác nhận" : "Không có đỉnh nào");
      }
      s = eng.apply(s, a);
    }
  } else {
    const eng = createDfsEngine(g, level.start);
    for (let s = eng.init(); !eng.isDone(s); ) {
      const a = eng.expected(s)!;
      if (a.type === "push") await tapVertex(page, a.v);
      else await press(page, "Lấy ra");
      s = eng.apply(s, a);
    }
  }
}

async function solveDijkstra(page: Page, level: DijkstraLevel) {
  const eng = createDijkstraEngine(makeGraph(level.graph), level.source);
  for (let s = eng.init(); !eng.isDone(s); ) {
    const a = eng.expected(s)!;
    if (a.type === "select") await tapVertex(page, a.v);
    else {
      let typed = false;
      for (const [v, nv] of Object.entries(a.values)) {
        if (nv >= s.d[v]) continue;
        await page.locator(`input[aria-label^="Nhãn mới của ${v},"]`).fill(String(nv));
        typed = true;
      }
      await press(page, typed ? "Xác nhận" : "Giữ nguyên tất cả");
    }
    s = eng.apply(s, a);
  }
}

async function solveOneStroke(page: Page, level: OneStrokeLevel) {
  const g = makeGraph(level.graph);
  const an = analyzeEuler(g);
  if (an.kind === "none") {
    await press(page, "Bất khả");
    if (!an.connected) await press(page, "Đồ thị không liên thông");
    else for (const v of g.directed ? an.unbalanced : an.odd) await tapVertex(page, v);
    await press(page, "Xác nhận bất khả");
    return;
  }
  for (const v of findEulerTrail(g)!.vertices) await tapVertex(page, v);
}

async function solveMuddy(page: Page, level: MuddyLevel) {
  const locked = level.locked ?? [];
  const { tree } = kruskal(makeGraph(level.graph), { forced: locked, excluded: level.broken ?? [] });
  // chạm thẻ giá: luôn nằm trên nhà nên chạm được cả với đường ngắn trên màn hẹp
  for (const id of tree) if (!locked.includes(id)) await page.locator(`[data-road-tag="${id}"]`).click();
  await press(page, "Kiểm tra");
}

async function solveGreedy(page: Page, level: GreedyLevel) {
  for (const v of optimalGreedyOrder(makeGraph(level.graph))) await tapVertex(page, v);
  await press(page, "Chạy Greedy");
  // bỏ qua hoạt cảnh nếu nút còn hiện
  await page
    .getByRole("button", { name: "Tô nhanh", exact: true })
    .click({ timeout: 1_000 })
    .catch(() => undefined);
}

async function solveMatrix(page: Page, level: MatrixLevel) {
  const g = makeGraph(level.graph);
  for (const key of targetKeys(g)) {
    const [u, v] = key.split(/[|>]/);
    if (level.mode === "graph-to-adj") await press(page, `Hàng ${u}, cột ${v}: 0`);
    else {
      await tapVertex(page, u);
      await tapVertex(page, v);
    }
  }
  await press(page, "Kiểm tra");
}
