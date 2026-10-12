// Điều hướng giữa các màn hình; bố cục và checklist UI (mục 7.5 kế hoạch) của mọi màn chơi ở 375, 768, 1024, 1440 px.

import { expect, test, type Page } from "@playwright/test";
import { allLevels, GAMES } from "../../src/core/registry";
import { uiChecklist } from "./checklist";
import { userFor, watchProblems } from "./play";

test("Sảnh → từng game → quay lại; Huy hiệu và Cài đặt", async ({ page }, info) => {
  const problems = watchProblems(page);
  await page.goto(`/?user=${userFor(info, "nav")}#/`);
  await expect(page.getByRole("heading", { level: 1, name: "Sảnh game" })).toBeVisible();
  for (const game of GAMES) {
    await page.getByRole("button", { name: new RegExp(`^Chương \\d+: ${game.title}\\.`) }).click();
    await expect(page.getByRole("heading", { level: 1, name: game.title })).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`#/game/${game.id}$`));
    await page.getByRole("button", { name: "Về sảnh game" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Sảnh game" })).toBeVisible();
  }
  await page.getByRole("button", { name: /Huy hiệu/ }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: "Huy hiệu" })).toBeVisible();
  await page.goBack();
  await page.getByRole("button", { name: "Cài đặt" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Cài đặt" })).toBeVisible();
  expect(problems).toEqual([]);
});

test("Đường dẫn lạ đưa về sảnh", async ({ page }, info) => {
  await page.goto(`/?user=${userFor(info, "bad")}#/play/khong-co-man-nay`);
  await expect(page.getByRole("heading", { level: 1, name: "Sảnh game" })).toBeVisible();
});

test("Nút quay lại trong màn chơi về danh sách màn của game", async ({ page }, info) => {
  await page.goto(`/?user=${userFor(info, "back")}&unlock=all#/play/ch5-l02`);
  await page.getByRole("button", { name: "Bắt đầu", exact: true }).click();
  await page.getByRole("button", { name: "Về danh sách màn" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Xếp thứ tự cho Greedy" })).toBeVisible();
});

test("Bố cục và checklist UI (mục 7.5) trên mọi màn hình và mọi màn chơi", async ({ page }, info) => {
  const problems = watchProblems(page);
  expect(await auditAll(page, userFor(info, "layout"))).toEqual([]);
  expect(problems).toEqual([]);
});

// máy tính bảng dọc và ngang, có cảm ứng (chạy một lần trong project desktop)
for (const viewport of [
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
]) {
  test.describe(`Máy tính bảng ${viewport.width}×${viewport.height}`, () => {
    test.use({ viewport, hasTouch: true });

    test("bố cục và checklist UI", async ({ page }, info) => {
      test.skip(info.project.name !== "desktop", "đã đủ khi chạy trong project desktop");
      const problems = watchProblems(page);
      expect(await auditAll(page, userFor(info, `tab${viewport.width}`))).toEqual([]);
      expect(problems).toEqual([]);
    });
  });
}

/** Đi qua sảnh, danh sách màn, huy hiệu, cài đặt và mọi màn chơi; trả về mọi chỗ hỏng bố cục hoặc checklist UI. */
async function auditAll(page: Page, user: string): Promise<string[]> {
  const out: string[] = [];
  for (const h of ["#/", "#/badges", "#/settings", ...GAMES.map((g) => `#/game/${g.id}`)]) {
    await page.goto(`/?user=${user}&unlock=all${h}`);
    await expect(page.locator("h1").first()).toBeVisible();
    out.push(...(await uiChecklist(page)).map((x) => `${h}: ${x}`));
  }
  for (const level of allLevels()) {
    await page.goto(`/?user=${user}&unlock=all#/play/${level.id}`);
    await page.getByRole("button", { name: "Bắt đầu", exact: true }).click();
    const board = page.locator(".lg-play__stage .lg-board__svg").first();
    await expect(board, level.id).toBeVisible();
    const m = await page.evaluate(() => {
      const svg = document.querySelector(".lg-play__stage .lg-board__svg")!.getBoundingClientRect();
      const footer = document.querySelector(".lg-controls")?.getBoundingClientRect();
      return { boardH: svg.height, boardW: svg.width, footerBottom: footer ? footer.bottom : 0, vh: window.innerHeight };
    });
    const issues = [...(await uiChecklist(page)), ...(await labelClashes(page))];
    if (m.boardH < 200) issues.push(`bàn chơi quá thấp (${Math.round(m.boardH)} px)`);
    if (m.boardW < 300) issues.push(`bàn chơi quá hẹp (${Math.round(m.boardW)} px)`);
    if (m.footerBottom > m.vh + 1) issues.push("thanh nút bị đẩy khỏi màn hình");
    out.push(...issues.map((x) => `${level.id}: ${x}`));
  }
  return out;
}

/**
 * Nhãn trọng số/thẻ giá đè lên nhau, bị đỉnh hoặc tên nhà che, hoặc (Thành phố bùn) không chạm được.
 * Trả về mô tả từng chỗ hỏng.
 */
function labelClashes(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    type Box = { name: string; r: DOMRect };
    const boxes = (sel: string, name: (el: Element) => string): Box[] =>
      [...document.querySelectorAll(sel)].map((el) => ({ name: name(el), r: el.getBoundingClientRect() }));
    const rectHit = (a: DOMRect, b: DOMRect, tol = 2) =>
      Math.min(a.right, b.right) - Math.max(a.left, b.left) > tol && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > tol;
    /** đĩa tròn (theo khung bao) cắt hình chữ nhật */
    const discHit = (disc: DOMRect, b: DOMRect, tol = 2) => {
      const cx = disc.left + disc.width / 2;
      const cy = disc.top + disc.height / 2;
      const dx = cx - Math.min(Math.max(cx, b.left), b.right);
      const dy = cy - Math.min(Math.max(cy, b.top), b.bottom);
      return Math.hypot(dx, dy) < disc.width / 2 - tol;
    };
    const pairs = (xs: Box[], hit: (a: DOMRect, b: DOMRect) => boolean, what: string) => {
      for (let i = 0; i < xs.length; i++)
        for (let j = i + 1; j < xs.length; j++) if (hit(xs[i].r, xs[j].r)) out.push(`${what}: ${xs[i].name} và ${xs[j].name}`);
    };
    const cross = (xs: Box[], ys: Box[], hit: (a: DOMRect, b: DOMRect) => boolean, what: string) => {
      for (const x of xs) for (const y of ys) if (hit(y.r, x.r)) out.push(`${what}: ${x.name} và ${y.name}`);
    };
    const label = (el: Element) => el.closest("g")?.textContent?.trim() || "?";

    // trọng số trên GraphBoard (Dijkstra)
    const elabels = boxes(".lg-play__stage .lg-elabel rect", label);
    const discs = boxes(".lg-play__stage .lg-v__disc", (el) => `đỉnh ${el.closest("[data-vertex]")?.getAttribute("data-vertex")}`);
    pairs(elabels, rectHit, "hai trọng số đè nhau");
    cross(elabels, discs, discHit, "trọng số bị đỉnh che");

    // thẻ giá trên bản đồ Thành phố bùn
    const tags = boxes(".lg-play__stage [data-road-tag] rect", (el) => `đường ${el.closest("[data-road-tag]")!.getAttribute("data-road-tag")}`);
    const htags = boxes(".lg-play__stage .lg-house__tag circle", (el) => `nhà ${el.closest("g")?.textContent}`);
    pairs(tags, rectHit, "hai thẻ giá đè nhau");
    cross(tags, htags, discHit, "thẻ giá bị tên nhà che");
    for (const el of document.querySelectorAll(".lg-play__stage [data-road-tag]")) {
      const r = el.querySelector("rect")!.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      if (hit?.closest("[data-road-tag]") !== el) out.push(`không chạm được thẻ giá đường ${el.getAttribute("data-road-tag")}`);
    }
    return out;
  });
}
