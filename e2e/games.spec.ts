// Module Trò chơi trong app SmartEdu: chạy độc lập với Luyện tập/Xếp hạng.
import { expect, test } from "@playwright/test";
import { getLevel } from "../games/ltdt-games/src/core/registry";
import type { DijkstraLevel } from "../games/ltdt-games/src/core/levels/types";
import { readDb, readRequests, resetBackend, signIn, watchProblems } from "./support/app";
import { expectStars, solveDijkstra } from "./support/ltdt";

const QUIZ_TABLES = /chapter_quiz_attempts|student_xp_log|weekly_prizes|social_feed_events/;

test.beforeEach(async () => {
  await resetBackend();
});

test("mở từ menu, chơi trọn một màn mà không ghi gì vào Supabase", async ({ page }) => {
  const problems = watchProblems(page);
  await signIn(page, "/dashboard");

  await page.getByRole("link", { name: "Trò chơi", exact: true }).click();
  await expect(page).toHaveURL(/\/games$/);
  await expect(page.getByRole("heading", { name: "Sảnh game" })).toBeVisible();
  await expect(page.locator("link#ltdt-games-css")).toHaveAttribute("data-state", "loaded");

  const before = (await readRequests()).length;
  await page.goto("/games?level=ch6-l01");
  await page.getByRole("button", { name: "Bắt đầu", exact: true }).click();
  await solveDijkstra(page, getLevel("ch6-l01") as DijkstraLevel);
  await expectStars(page, 3);
  // route của game nằm trong bộ nhớ: URL của SmartEdu không đổi
  await expect(page).toHaveURL(/\/games\?level=ch6-l01$/);

  // game lưu tiến độ trong trình duyệt, không gọi API ghi nào của Supabase
  const keys = await page.evaluate(() => Object.keys(localStorage));
  expect(keys.some((k) => k.startsWith("smartedu-ltdt:progress:"))).toBe(true);
  const during = (await readRequests()).slice(before);
  expect(during.filter((r) => r.method !== "GET" && r.path.startsWith("/rest/"))).toEqual([]);
  expect(during.filter((r) => QUIZ_TABLES.test(r.path))).toEqual([]);
  const db = await readDb();
  expect(db.chapter_quiz_attempts ?? []).toEqual([]);
  expect(db.student_xp_log ?? []).toEqual([]);

  // rời trang game: CSS của game được gỡ, Luyện tập vẫn như cũ (điểm tuần 0)
  await page.goto("/practice");
  await expect(page.getByRole("heading", { level: 1, name: "Luyện theo chương" })).toBeVisible();
  await expect(page.locator("link#ltdt-games-css")).toHaveCount(0);
  await expect(page.locator(".lg-root")).toHaveCount(0);
  await expect(page.getByTestId("week-points")).toHaveText("0");
  expect(problems).toEqual([]);
});

test("đi qua lại giữa Trò chơi và Luyện tập không làm đổi giao diện Quiz", async ({ page }) => {
  await signIn(page, "/practice");
  const heading = page.getByRole("heading", { level: 1, name: "Luyện theo chương" });
  const style = () =>
    heading.evaluate((el) => {
      const s = getComputedStyle(el);
      return [s.fontFamily, s.fontSize, s.fontWeight, s.color, s.letterSpacing].join("|");
    });
  const bodyStyle = () =>
    page.evaluate(() => {
      const s = getComputedStyle(document.body);
      return [s.fontFamily, s.backgroundColor, s.color].join("|");
    });
  const before = [await style(), await bodyStyle()];

  // điều hướng phía client (giữ cùng một trang) để CSS của game đã gắn rồi gỡ trên cùng document
  await page.getByRole("link", { name: "Trò chơi", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Sảnh game" })).toBeVisible();
  await page.getByRole("link", { name: "Luyện tập", exact: true }).click();
  await expect(heading).toBeVisible();
  await expect(page.locator("link#ltdt-games-css")).toHaveCount(0);
  expect([await style(), await bodyStyle()]).toEqual(before);
});

test("không tải được bản build Trò chơi: báo lỗi, thử lại được, Quiz vẫn chạy", async ({
  page,
}) => {
  const problems = watchProblems(page, [
    /Không tải được module/,
    /ltdt-games\.js/,
    /Failed to load/,
  ]);
  await page.route("**/games/ltdt/ltdt-games.js*", (route) => route.abort());
  await signIn(page, "/games");

  const alert = page.getByRole("alert").filter({ hasText: "Chưa mở được Trò chơi" });
  await expect(alert).toBeVisible();
  await expect(page.locator("link#ltdt-games-css")).toHaveCount(0);

  await page.getByRole("link", { name: "Luyện tập", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Luyện theo chương" })).toBeVisible();
  await expect(page.getByTestId("week-points")).toHaveText("0");

  // mạng vẫn lỗi khi quay lại; có mạng thì "Thử lại" mở được game ngay trên trang
  await page.getByRole("link", { name: "Trò chơi", exact: true }).click();
  await expect(alert).toBeVisible();
  await page.unroute("**/games/ltdt/ltdt-games.js*");
  await alert.getByRole("button", { name: "Thử lại" }).click();
  await expect(page.getByRole("heading", { name: "Sảnh game" })).toBeVisible();
  expect(problems).toEqual([]);
});

test("liên kết sâu tới một game", async ({ page }) => {
  await signIn(page, "/games?game=muddy_city");
  await expect(page.getByRole("heading", { name: "Thành phố bùn" })).toBeVisible();
});
