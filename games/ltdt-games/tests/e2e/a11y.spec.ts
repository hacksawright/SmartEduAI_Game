// Khả năng truy cập: chơi trọn màn chỉ bằng bàn phím, mọi điều khiển có tên, viền focus, giảm chuyển động.

import { expect, test, type Page } from "@playwright/test";
import { bipartition } from "../../src/core/algorithms/bipartite";
import { optimalGreedyOrder } from "../../src/core/algorithms/coloring";
import { findEulerTrail } from "../../src/core/algorithms/euler";
import { kruskal } from "../../src/core/algorithms/spanningTree";
import { targetKeys } from "../../src/core/games/matrixTranslate";
import { makeGraph } from "../../src/core/graph";
import type { MatrixLevel, MuddyLevel } from "../../src/core/levels/types";
import { allLevels, getLevel } from "../../src/core/registry";
import { expectResult, openLevel, press, tapVertex, userFor, watchProblems } from "./play";

/** Các điều khiển đang hiện mà không có tên đọc được cho trình đọc màn hình. */
async function unnamedControls(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden";
    };
    const nameOf = (el: Element): string => {
      const label = el.getAttribute("aria-label");
      if (label) return label;
      const by = el.getAttribute("aria-labelledby");
      if (by) return by.split(/\s+/).map((id) => document.getElementById(id)?.textContent ?? "").join(" ");
      if (el instanceof HTMLInputElement) {
        if (el.labels?.length) return [...el.labels].map((l) => l.textContent ?? "").join(" ");
        return el.placeholder || el.title;
      }
      return (el.textContent ?? "").trim() || el.getAttribute("title") || "";
    };
    return [...document.querySelectorAll('button, a[href], input, select, textarea, [role="button"], [role="tab"], [role="radio"]')]
      .filter(visible)
      .filter((el) => !nameOf(el).trim())
      .map((el) => el.outerHTML.slice(0, 120));
  });
}

test("Mọi điều khiển trên các màn hình chính đều có tên", async ({ page }, info) => {
  const user = userFor(info, "names");
  const pages = ["#/", "#/game/traversal", "#/game/muddy_city", "#/badges", "#/settings"];
  for (const h of pages) {
    await page.goto(`/?user=${user}&unlock=all${h}`);
    await expect(page.locator("h1").first()).toBeVisible();
    expect(await unnamedControls(page), h).toEqual([]);
  }
  // màn chơi đầu tiên của từng game, trước và sau khi bấm Bắt đầu
  const firsts = new Map(allLevels().map((l) => [l.game, l] as const));
  for (const level of firsts.values()) {
    await page.goto(`/?user=${user}&unlock=all#/play/${level.id}`);
    await expect(page.getByRole("button", { name: "Bắt đầu", exact: true })).toBeVisible();
    expect(await unnamedControls(page), `${level.id} intro`).toEqual([]);
    await page.getByRole("button", { name: "Bắt đầu", exact: true }).click();
    expect(await unnamedControls(page), `${level.id} play`).toEqual([]);
  }
});

test("Một nét vẽ: chơi trọn màn bằng bàn phím (Tab tới đỉnh, Enter để vẽ)", async ({ page }, info) => {
  const problems = watchProblems(page);
  const level = getLevel("ch3-l01")!;
  await openLevel(page, level.id, userFor(info, "kbd-os"));
  // Tab từ đầu trang phải tới được một đỉnh của bàn chơi
  let reached = false;
  for (let i = 0; i < 25 && !reached; i++) {
    await page.keyboard.press("Tab");
    reached = await page.evaluate(() => document.activeElement?.hasAttribute("data-vertex") ?? false);
  }
  expect(reached, "Tab tới được đỉnh").toBe(true);
  // viền focus nhìn thấy được
  const ring = page.locator(":focus .lg-v__focus");
  await expect(ring).toBeVisible();
  for (const v of findEulerTrail(makeGraph(level.graph))!.vertices) {
    await page.locator(`[role="button"][data-vertex="${v}"]`).focus();
    await page.keyboard.press("Enter");
  }
  await expectResult(page, 3);
  // focus chuyển vào hộp kết quả để bàn phím và trình đọc màn hình theo kịp
  await expect.poll(() => page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(true);
  expect(problems).toEqual([]);
});

test("Gỡ rối: dời đỉnh bằng phím mũi tên, focus ở lại trên đỉnh", async ({ page }, info) => {
  const problems = watchProblems(page);
  await openLevel(page, "ch4-l01", userFor(info, "kbd-untangle"));
  const v = page.locator('[role="button"][data-vertex="4"]');
  await v.focus();
  const before = await v.getAttribute("transform");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Shift+ArrowUp");
  await expect(page.locator(".lg-mstats__value").nth(1)).toHaveText("2 lần");
  expect(await v.getAttribute("transform")).not.toBe(before);
  await expect.poll(() => page.evaluate(() => document.activeElement?.getAttribute("data-vertex"))).toBe("4");
  expect(problems).toEqual([]);
});

test("Chia đội: xếp đội bằng phím X / Y trên từng đỉnh", async ({ page }, info) => {
  const problems = watchProblems(page);
  const level = getLevel("ch4-l09")!;
  await openLevel(page, level.id, userFor(info, "kbd-teams"));
  const bp = bipartition(makeGraph(level.graph));
  if (!bp.ok) throw new Error("màn ch4-l09 phải chia được");
  for (const [v, side] of Object.entries(bp.side)) {
    await page.locator(`[role="button"][data-vertex="${v}"]`).focus();
    await page.keyboard.press(side === 0 ? "x" : "y");
  }
  await page.getByRole("button", { name: "Kiểm tra", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expectResult(page, 3);
  expect(problems).toEqual([]);
});

test("Thành phố bùn: lát đường bằng phím Space", async ({ page }, info) => {
  const problems = watchProblems(page);
  const level = getLevel("ch7-l01") as MuddyLevel;
  await openLevel(page, level.id, userFor(info, "kbd-mc"));
  for (const id of kruskal(makeGraph(level.graph)).tree) {
    const road = page.locator(`[data-road="${id}"]`);
    await road.focus();
    await page.keyboard.press(" ");
    await expect(road).toHaveAttribute("aria-pressed", "true");
  }
  await page.getByRole("button", { name: "Kiểm tra", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expectResult(page, 3);
  expect(problems).toEqual([]);
});

test("Dịch ma trận: điền ma trận kề bằng bàn phím, Esc bỏ tô sáng hàng", async ({ page }, info) => {
  const problems = watchProblems(page);
  const level = getLevel("ch1-l02") as MatrixLevel;
  expect(level.mode).toBe("graph-to-adj");
  await openLevel(page, level.id, userFor(info, "kbd-mx"));
  const g = makeGraph(level.graph);
  // chạm đỉnh để tô sáng hàng, Esc để bỏ
  const first = g.vertices[0].id;
  await page.locator(`[role="button"][data-vertex="${first}"]`).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".lg-mx__row--hi")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(page.locator(".lg-mx__row--hi")).toHaveCount(0);
  for (const key of targetKeys(g)) {
    const [u, v] = key.split(/[|>]/);
    const cell = page.getByRole("button", { name: `Hàng ${u}, cột ${v}: 0`, exact: true });
    await cell.focus();
    await page.keyboard.press(" ");
    // ô đối xứng đổi theo
    await expect(page.getByRole("button", { name: `Hàng ${v}, cột ${u}: 1`, exact: true })).toHaveAttribute("aria-pressed", "true");
  }
  await page.getByRole("button", { name: "Kiểm tra", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expectResult(page, 3);
  expect(problems).toEqual([]);
});

test.describe("Giảm chuyển động theo hệ điều hành", () => {
  test.use({ reducedMotion: "reduce" });

  test("tắt hoạt cảnh và pháo giấy, vẫn chơi trọn màn", async ({ page }, info) => {
    const problems = watchProblems(page);
    const level = getLevel("ch5-l01")!;
    await openLevel(page, level.id, userFor(info, "rm"));
    await expect(page.locator(".lg-root")).toHaveAttribute("data-motion", "reduced");
    for (const v of optimalGreedyOrder(makeGraph(level.graph))) await tapVertex(page, v);
    // không bấm "Tô nhanh": đo đúng hoạt cảnh. Giảm chuyển động: 60 ms/bước + 300 ms, khoảng 0,8 giây
    // cho 8 đỉnh; bình thường: 300–460 ms/bước + 1,1 giây, khoảng 4,6 giây.
    const t0 = Date.now();
    await press(page, "Chạy Greedy");
    await expectResult(page, 3);
    expect(Date.now() - t0).toBeLessThan(3_000);
    const anim = await page.locator(".lg-result__title").evaluate((el) => getComputedStyle(el).animationDuration);
    expect(["0s", "0.001s", "1ms"]).toContain(anim);
    // pháo giấy không vẽ gì: canvas trống
    const painted = await page.locator(".lg-confetti").evaluate((c: HTMLCanvasElement) => {
      const ctx = c.getContext("2d");
      if (!ctx || !c.width || !c.height) return false;
      return ctx.getImageData(0, 0, c.width, c.height).data.some((x) => x !== 0);
    });
    expect(painted).toBe(false);
    expect(problems).toEqual([]);
  });
});

test("Cài đặt: chọn Giảm chuyển động được lưu lại sau khi tải lại trang", async ({ page }, info) => {
  const user = userFor(info, "settings");
  await page.goto(`/?user=${user}#/settings`);
  await expect(page.locator(".lg-root")).toHaveAttribute("data-motion", "full");
  await page.getByRole("radio", { name: "Giảm chuyển động" }).check();
  await expect(page.locator(".lg-root")).toHaveAttribute("data-motion", "reduced");
  await page.reload();
  await expect(page.locator(".lg-root")).toHaveAttribute("data-motion", "reduced");
  await expect(page.getByRole("radio", { name: "Giảm chuyển động" })).toBeChecked();
});
