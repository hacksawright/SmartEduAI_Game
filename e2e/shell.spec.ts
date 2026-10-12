// Khung app: menu có mục Trò chơi, thanh dưới trên mobile, không tràn ngang, vùng chạm đủ lớn.
import { expect, test, type Page } from "@playwright/test";
import { resetBackend, signIn } from "./support/app";

test.beforeEach(async () => {
  await resetBackend();
});

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

test("máy tính: menu bên có đủ mục, Trò chơi nằm sau Luyện tập", async ({ page, isMobile }) => {
  test.skip(isMobile, "menu bên chỉ hiện trên màn hình rộng");
  await signIn(page, "/dashboard");
  const nav = page.getByRole("navigation", { name: "Điều hướng chính" });
  await expect(nav.getByRole("link")).toHaveText([
    "Trang chủ",
    "Luyện tập",
    "Trò chơi",
    "Khóa học",
    "Phó bản",
    "Đấu trường",
    "Xếp hạng",
    "Hồ sơ",
  ]);
  await nav.getByRole("link", { name: "Xếp hạng" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Bảng xếp hạng tuần" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Xếp hạng" })).toHaveAttribute("aria-current", "page");
});

test("mobile: thanh dưới 5 mục, mục còn lại trong “Thêm”", async ({ page, isMobile }) => {
  test.skip(!isMobile, "thanh dưới chỉ hiện trên mobile");
  await signIn(page, "/dashboard");
  const nav = page.getByRole("navigation", { name: "Điều hướng chính" });
  await expect(nav.getByRole("link")).toHaveText([
    "Trang chủ",
    "Luyện tập",
    "Trò chơi",
    "Xếp hạng",
  ]);
  const more = nav.getByRole("button", { name: "Thêm" });
  await expect(more).toBeVisible();

  for (const item of await nav.locator("a, button").all()) {
    const box = (await item.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.width).toBeGreaterThanOrEqual(44);
  }

  await more.click();
  const sheet = page.getByRole("dialog", { name: "Thêm" });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole("navigation", { name: "Mục khác" }).locator("a, button")).toHaveText(
    ["Khóa học", "Phó bản", "Đấu trường", "Hồ sơ", "Sửa tên"],
  );
  await sheet.getByRole("link", { name: "Hồ sơ" }).click();
  await expect(sheet).toBeHidden();
  await expect(page).toHaveURL(/\/profile$/);
});

for (const path of ["/dashboard", "/practice", "/leaderboard", "/games"]) {
  test(`không tràn ngang: ${path}`, async ({ page }) => {
    await signIn(page, path);
    await expect(page.locator("main#main")).toBeVisible();
    if (path === "/games")
      await expect(page.getByRole("heading", { name: "Sảnh game" })).toBeVisible();
    if (path === "/practice") await expect(page.getByTestId("week-points")).toBeVisible();
    await expectNoHorizontalScroll(page);
  });
}

test("đáp án trong bài làm đủ lớn để chạm và không tràn ngang", async ({ page }) => {
  await signIn(page, "/practice");
  await page.getByRole("button", { name: /Chương 1 · 5 câu/ }).click();
  const options = page.getByRole("radiogroup").locator("label");
  await expect(options.first()).toBeVisible();
  for (const option of await options.all()) {
    const box = (await option.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
  await expectNoHorizontalScroll(page);
});

test("liên kết “Bỏ qua điều hướng” đưa tiêu điểm vào nội dung chính", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "kiểm tra bằng bàn phím");
  await signIn(page, "/practice");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Bỏ qua điều hướng" });
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main#main")).toBeFocused();
});
