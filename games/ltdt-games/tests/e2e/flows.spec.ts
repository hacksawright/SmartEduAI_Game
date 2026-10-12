// Các luồng ngoài đường chơi chuẩn: trả lời sai, gợi ý, chơi lại không cộng trùng, đua với máy, mở khóa màn,
// đồng bộ tiến độ từ server khi đổi máy, xóa tiến độ trên máy mà vẫn giữ điểm thưởng.

import { expect, test, type Page } from "@playwright/test";
import { edmondsKarp } from "../../src/core/algorithms/maxFlow";
import { createBfsEngine } from "../../src/core/engines/bfsEngine";
import { makeGraph } from "../../src/core/graph";
import type { MaxFlowLevel, TraversalLevel, UntangleLevel } from "../../src/core/levels/types";
import { getLevel } from "../../src/core/registry";
import { dragVertex, expectResult, openLevel, press, solveLevel, tapBoardAt, tapVertex, userFor, watchProblems } from "./play";

/** Lời giải BFS bỏ qua `skip` câu đầu (đã được thực thi sau khi bấm Tiếp tục). */
async function solveBfsFrom(page: Page, level: TraversalLevel, skip: number) {
  const eng = createBfsEngine(makeGraph(level.graph), level.start);
  let s = eng.init();
  for (let i = 0; i < skip; i++) s = eng.apply(s, eng.expected(s)!);
  while (!eng.isDone(s)) {
    const a = eng.expected(s)!;
    if (a.type === "dequeue") await tapVertex(page, a.v);
    else {
      for (const v of a.vs) await tapVertex(page, v);
      await press(page, a.vs.length ? "Xác nhận" : "Không có đỉnh nào");
    }
    s = eng.apply(s, a);
  }
}

test("BFS: trả lời sai mất 1 mạng, Tiếp tục chạy bước đúng, kết thúc còn 2 sao", async ({ page }, info) => {
  const problems = watchProblems(page);
  const level = getLevel("ch2-bfs-01") as TraversalLevel;
  await openLevel(page, level.id, userFor(info, "wrong"));
  await expect(page.getByRole("img", { name: "Còn 3 trên 3 mạng" })).toBeVisible();
  // câu đầu: lấy đỉnh xuất phát ra khỏi hàng đợi; chạm một đỉnh khác là sai
  const wrong = level.graph.vertices.map(([id]) => id).find((id) => id !== level.start)!;
  await tapVertex(page, wrong);
  await expect(page.getByRole("alert")).toContainText("Chưa đúng");
  await expect(page.getByRole("img", { name: "Còn 2 trên 3 mạng" })).toBeVisible();
  await press(page, "Tiếp tục");
  await solveBfsFrom(page, level, 1);
  await expectResult(page, 2);
  expect(problems).toEqual([]);
});

test("Gợi ý: hộp xác nhận, Esc để hủy, dùng 2 mức gợi ý thì còn 1 sao", async ({ page }, info) => {
  const problems = watchProblems(page);
  await openLevel(page, "ch7-l01", userFor(info, "hint"));
  const hintBtn = page.getByRole("button", { name: "Gợi ý (trừ 1 sao)" });

  await hintBtn.click();
  const dialog = page.getByRole("dialog", { name: "Dùng gợi ý?" });
  await expect(dialog).toBeVisible();
  // focus mặc định ở nút an toàn
  await expect(page.getByRole("button", { name: "Để tôi tự nghĩ" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(hintBtn).toBeFocused();

  await hintBtn.click();
  await press(page, "Dùng gợi ý (−1 sao)");
  await expect(page.getByRole("note", { name: "Gợi ý mức 1" })).toBeVisible();
  await press(page, "Gợi ý cụ thể hơn (−1 sao)");
  await expect(page.getByRole("note", { name: "Gợi ý mức 2" })).toBeVisible();

  await solveLevel(page, getLevel("ch7-l01")!);
  await expectResult(page, 1);
  await expect(page.locator(".lg-result__summary")).toContainText("2 gợi ý");
  expect(problems).toEqual([]);
});

test("Chơi lại cùng số sao không được cộng điểm lần hai", async ({ page }, info) => {
  const problems = watchProblems(page);
  const level = getLevel("ch3-l01")!;
  await openLevel(page, level.id, userFor(info, "replay"));
  await solveLevel(page, level);
  await expectResult(page, 3);
  await expect(page.locator(".lg-result__note")).toHaveText(/^\+\d+ điểm thưởng/);

  await press(page, "Chơi lại");
  await press(page, "Bắt đầu");
  await solveLevel(page, level);
  await expectResult(page, 3);
  await expect(page.locator(".lg-result__note")).toContainText("Không cộng thêm điểm");
  expect(problems).toEqual([]);
});

test("Đua với máy (BFS 1): trả lời đúng và nhanh thì thắng máy", async ({ page }, info) => {
  const problems = watchProblems(page);
  const level = getLevel("ch2-bfs-01")!;
  await openLevel(page, `${level.id}-race`, userFor(info, "race"));
  await solveLevel(page, level);
  await expectResult(page, 3);
  expect(problems).toEqual([]);
});

test("Mở khóa: người chơi mới chỉ mở màn 1; qua màn 1 thì Màn tiếp mở màn 2", async ({ page }, info) => {
  const problems = watchProblems(page);
  const user = userFor(info, "unlock");
  await page.goto(`/?user=${user}#/`);
  await page.getByRole("button", { name: /^Chương 6: Tôi là Dijkstra/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Tôi là Dijkstra" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^D1: / })).toBeEnabled();
  await expect(page.getByRole("button", { name: /^D2: .*Chưa mở/ })).toBeDisabled();

  // vào thẳng màn 2 bằng URL cũng bị chặn
  await page.goto(`/?user=${user}#/play/ch6-l02`);
  await expect(page.getByRole("heading", { name: "Màn này chưa mở" })).toBeVisible();

  await page.goto(`/?user=${user}#/play/ch6-l01`);
  await press(page, "Bắt đầu");
  await solveLevel(page, getLevel("ch6-l01")!);
  await expectResult(page, 3);
  await press(page, "Màn tiếp");
  await expect(page).toHaveURL(/#\/play\/ch6-l02$/);
  await expect(page.getByRole("button", { name: "Bắt đầu", exact: true })).toBeVisible();
  expect(problems).toEqual([]);
});

test("Đổi máy: trình duyệt mới tải lại sao, màn đã mở và điểm từ server (GET /progress)", async ({ page }, info) => {
  const problems = watchProblems(page);
  const user = userFor(info, "sync");
  await page.goto(`/?user=${user}#/play/ch6-l01`);
  await press(page, "Bắt đầu");
  await solveLevel(page, getLevel("ch6-l01")!);
  await expectResult(page, 3);

  // máy khác: localStorage trống ngay từ trước khi app chạy, chỉ server còn bản ghi.
  // Đổi query để trình duyệt tải lại trang (chỉ đổi hash thì không tải lại).
  await page.addInitScript(() => localStorage.clear());
  const progress = page.waitForResponse((r) => r.url().includes("/api/v1/progress?user_id="));
  await page.goto(`/?user=${user}&device=2#/game/dijkstra`);
  await progress;
  await expect(page.getByRole("button", { name: /^D1: .*3 sao$/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^D2: .*0 sao$/ })).toBeEnabled();
  await page.getByRole("button", { name: "Về sảnh game" }).click();
  await expect(page.getByTitle("Điểm thưởng")).toHaveText("30 điểm");
  await expect(page.getByTitle("Tổng số sao")).toContainText("3/");
  expect(problems).toEqual([]);
});

test("Xóa tiến độ trên máy: sao và màn đã mở bị xóa, điểm thưởng đã cộng giữ nguyên", async ({ page }, info) => {
  const problems = watchProblems(page);
  const user = userFor(info, "reset");
  await page.goto(`/?user=${user}#/play/ch6-l01`);
  await press(page, "Bắt đầu");
  await solveLevel(page, getLevel("ch6-l01")!);
  await expectResult(page, 3);

  // chỉ đổi hash nên trang không tải lại (tải lại thì tiến độ trên server được gộp về, xem test trên)
  await page.goto(`/?user=${user}#/settings`);
  await press(page, "Xóa tiến độ trên máy này");
  await expect(page.getByRole("dialog", { name: "Xóa tiến độ?" })).toBeVisible();
  await press(page, "Xóa tiến độ");
  await expect(page.getByText("Đã xóa tiến độ trên máy này.")).toBeVisible();

  await page.goto(`/?user=${user}#/`);
  await expect(page.getByTitle("Tổng số sao")).toHaveText(/^0\//);
  await expect(page.getByTitle("Điểm thưởng")).toHaveText("30 điểm");
  await page.getByRole("button", { name: /^Chương 6: Tôi là Dijkstra/ }).click();
  await expect(page.getByRole("button", { name: /^D2: .*Chưa mở/ })).toBeDisabled();
  expect(problems).toEqual([]);
});

/** Ô số liệu theo nhãn ("Giao cắt", "Lỗi"…) trong panel. */
const stat = (page: Page, label: string) =>
  page.locator(".lg-mstats__cell").filter({ has: page.locator(".lg-mstats__label", { hasText: label }) }).locator(".lg-mstats__value");

test("Gỡ rối: kéo-thả đỉnh, thả sát đỉnh khác bị từ chối, sai số miền tính 1 lỗi", async ({ page }, info) => {
  const problems = watchProblems(page);
  const level = getLevel("ch4-l01") as UntangleLevel;
  const g = makeGraph(level.graph);
  await openLevel(page, level.id, userFor(info, "untangle"));
  const start = Object.fromEntries(g.vertices.map((v) => [v.id, { x: v.x, y: v.y }]));
  const sol = level.solution!;

  // kéo đỉnh 1 tới chỗ trong lời giải
  await dragVertex(page, start["1"], sol["1"][0], sol["1"][1]);
  await expect(stat(page, "Đã dời")).toHaveText("1 lần");
  // thả đỉnh 2 sát đỉnh 1: bị từ chối, không tính lần dời
  await dragVertex(page, start["2"], sol["1"][0] + 20, sol["1"][1] + 20);
  await expect(page.locator(".lg-osnote").filter({ hasText: "Không đặt 2 sát đỉnh 1" })).toBeVisible();
  await expect(stat(page, "Đã dời")).toHaveText("1 lần");

  // các đỉnh còn lại: chạm đỉnh rồi chạm chỗ trống
  for (const v of ["2", "3", "4", "5", "6"]) {
    await tapVertex(page, v);
    await tapBoardAt(page, sol[v][0], sol[v][1]);
  }
  await expect(stat(page, "Giao cắt")).toHaveText("0");
  const faces = page.getByRole("spinbutton", { name: "Số miền f" });
  await faces.fill("4");
  await press(page, "Trả lời");
  await expect(page.getByRole("alert")).toContainText("Có thể bạn quên miền bên ngoài");
  await expect(stat(page, "Lỗi")).toHaveText("1");
  await faces.fill("5");
  await press(page, "Trả lời");
  await expectResult(page, 2);
  expect(problems).toEqual([]);
});

test("Chia đội: Kiểm tra khi chưa xếp hết không tính lỗi; cặp cùng đội tính 1 lỗi và được đánh dấu", async ({ page }, info) => {
  const problems = watchProblems(page);
  const level = getLevel("ch4-l09")!;
  await openLevel(page, level.id, userFor(info, "teams"));
  await press(page, "Kiểm tra");
  await expect(page.locator(".lg-osnote").filter({ hasText: "Còn 6 bạn chưa có đội" })).toBeVisible();
  await expect(stat(page, "Lỗi")).toHaveText("0");
  for (const v of ["1", "2", "3", "4", "5", "6"]) await tapVertex(page, v);
  await press(page, "Kiểm tra");
  await expect(page.getByRole("alert")).toContainText("cặp hay cãi nhau đang cùng đội");
  await expect(stat(page, "Lỗi")).toHaveText("1");
  await expect(page.locator(".lg-elabel--error")).toHaveCount(5);
  await press(page, "Xếp lại");
  await solveLevel(page, level);
  await expectResult(page, 2);
  expect(problems).toEqual([]);
});

test("Ống nước: báo cực đại quá sớm tính 1 lỗi; đi ngược ống để trả nước rồi tìm nút thắt", async ({ page }, info) => {
  const problems = watchProblems(page);
  const level = getLevel("ch8-l03") as MaxFlowLevel;
  await openLevel(page, level.id, userFor(info, "flow"));
  await press(page, "Đã cực đại");
  await expect(page.getByRole("alert")).toContainText("Chưa cực đại");
  await expect(stat(page, "Lỗi")).toHaveText("1");
  // đi xuôi ống đã đầy bị chặn, có lý do
  await tapVertex(page, "a");
  await expect(page.locator(".lg-osnote").filter({ hasText: "Ống s → a đã đầy (3/3)" })).toBeVisible();
  // lời giải Edmonds–Karp từ luồng có sẵn phải đi ngược ống a → b (b rồi tới a)
  const ek = edmondsKarp(makeGraph(level.graph), level.source, level.sink, level.initialFlow);
  expect(ek.paths.some((p) => p.vertices.join(" ").includes("b a"))).toBe(true);
  await solveLevel(page, level);
  await expectResult(page, 2);
  expect(problems).toEqual([]);
});
