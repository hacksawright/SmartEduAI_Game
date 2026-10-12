// Trợ giúp cho e2e: mở màn, theo dõi lỗi console và lời giải chuẩn của từng game.
// Lời giải lấy từ chính engine/thuật toán tham chiếu trong src/core, nên test tự theo kịp khi đổi dữ liệu màn.

import { expect, type Page, type TestInfo } from "@playwright/test";
import { bipartition } from "../../src/core/algorithms/bipartite";
import { analyzeEuler, findEulerTrail } from "../../src/core/algorithms/euler";
import { edmondsKarp } from "../../src/core/algorithms/maxFlow";
import { validProofs, type Positions } from "../../src/core/algorithms/planarity";
import { optimalGreedyOrder } from "../../src/core/algorithms/coloring";
import { kruskal } from "../../src/core/algorithms/spanningTree";
import { createBfsEngine } from "../../src/core/engines/bfsEngine";
import { createDfsEngine } from "../../src/core/engines/dfsEngine";
import { createDijkstraEngine } from "../../src/core/engines/dijkstraEngine";
import { targetKeys } from "../../src/core/games/matrixTranslate";
import { faceCount } from "../../src/core/games/untangle";
import { makeGraph, type VertexId } from "../../src/core/graph";
import type {
  DijkstraLevel,
  GreedyLevel,
  Level,
  MatrixLevel,
  MaxFlowLevel,
  MuddyLevel,
  OneStrokeLevel,
  TraversalLevel,
  TwoTeamsLevel,
  UntangleLevel,
} from "../../src/core/levels/types";
import { PROOF_OPTIONS } from "../../src/games/untangle/logic";

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
    case "untangle":
      return solveUntangle(page, level);
    case "two_teams":
      return solveTeams(page, level);
    case "max_flow":
      return solveFlow(page, level);
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

/** Điểm (x, y) theo tọa độ của màn, đổi sang tọa độ màn hình qua ma trận SVG (tính cả xoay dọc). */
export async function boardPoint(page: Page, x: number, y: number): Promise<{ x: number; y: number }> {
  return page.locator(".lg-play__stage .lg-board__svg").evaluate(
    (svg, [gx, gy]) => {
      const el = svg as SVGSVGElement;
      const swap = el.hasAttribute("data-transposed");
      const p = new DOMPoint(swap ? gy : gx, swap ? gx : gy).matrixTransform(el.getScreenCTM()!);
      return { x: p.x, y: p.y };
    },
    [x, y] as const,
  );
}

export async function tapBoardAt(page: Page, x: number, y: number) {
  const pt = await boardPoint(page, x, y);
  await page.mouse.click(pt.x, pt.y);
}

/** Kéo đỉnh v (đang ở from) tới (x, y) bằng chuột: nhấn, di qua nhiều bước, thả. */
export async function dragVertex(page: Page, from: { x: number; y: number }, x: number, y: number) {
  const a = await boardPoint(page, from.x, from.y);
  const b = await boardPoint(page, x, y);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 8 });
  await page.mouse.up();
}

async function solveUntangle(page: Page, level: UntangleLevel) {
  const g = makeGraph(level.graph);
  if (level.expect === "nonplanar") {
    const proof = validProofs(g)[0];
    await press(page, "Không phẳng");
    await page.getByRole("radio", { name: PROOF_OPTIONS.find((o) => o.kind === proof.kind)!.label }).check();
    if (proof.kind === "k5") for (const v of proof.vertices) await tapVertex(page, v);
    if (proof.kind === "k33") {
      // nhóm 1 đã đủ 3 đỉnh thì lần chạm đầu xếp thẳng vào nhóm 2
      for (const v of [...proof.a, ...proof.b]) await tapVertex(page, v);
    }
    await press(page, "Xác nhận không phẳng");
    return;
  }
  // dời lần lượt từng đỉnh về lời giải (thứ tự đỉnh luôn tránh được khoảng cách tối thiểu, xem tests/unit/ch48.test.ts)
  const pos: Positions = Object.fromEntries(g.vertices.map((v) => [v.id, { x: v.x, y: v.y }]));
  const faces = page.getByRole("spinbutton", { name: "Số miền f" });
  for (const v of g.vertices) {
    const [x, y] = level.solution![v.id];
    if (pos[v.id].x === x && pos[v.id].y === y) continue;
    if (await faces.isVisible()) break;
    await tapVertex(page, v.id);
    await tapBoardAt(page, x, y);
    pos[v.id] = { x, y };
  }
  await faces.fill(String(faceCount(g)));
  await press(page, "Trả lời");
}

async function solveTeams(page: Page, level: TwoTeamsLevel) {
  const g = makeGraph(level.graph);
  const bp = bipartition(g);
  if (!bp.ok) {
    await press(page, "Không chia được");
    for (const v of bp.oddCycle) await tapVertex(page, v);
    await tapVertex(page, bp.oddCycle[0]);
    await press(page, "Xác nhận vòng lẻ");
    return;
  }
  for (const [team, side] of [["X", 0], ["Y", 1]] as const) {
    await page.getByRole("radio", { name: new RegExp(`^Đội ${team}`) }).check();
    for (const v of g.vertices) if (bp.side[v.id] === side) await tapVertex(page, v.id);
  }
  await press(page, "Kiểm tra");
}

async function solveFlow(page: Page, level: MaxFlowLevel) {
  const g = makeGraph(level.graph);
  const ek = edmondsKarp(g, level.source, level.sink, level.initialFlow ?? {});
  for (const p of ek.paths) {
    for (const v of p.vertices.slice(1)) await tapVertex(page, v);
    await expect(page.getByRole("spinbutton", { name: "Lượng bơm" })).toHaveValue(String(p.amount));
    await press(page, "Bơm");
  }
  await press(page, "Đã cực đại");
  for (const v of ek.minCut) if (v !== level.source) await tapVertex(page, v);
  await press(page, "Xác nhận nút thắt");
}
