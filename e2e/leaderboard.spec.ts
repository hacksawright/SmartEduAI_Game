// Bảng xếp hạng tuần: thứ tự, bục top 3, "Quanh vị trí của bạn", trạng thái trống và giải tuần.
import { expect, test } from "@playwright/test";
import {
  WEEK,
  attempt,
  resetBackend,
  sampleRanking,
  seedBackend,
  signIn,
  watchProblems,
} from "./support/app";

test("xếp theo tổng điểm cao nhất từng chương, bằng điểm thì theo tên", async ({ page }) => {
  const { profiles, attempts } = sampleRanking();
  await resetBackend({
    seed: {
      profiles,
      // tuần trước không được tính
      chapter_quiz_attempts: [...attempts, attempt("seed-9", "chuong-2", 5, "2000-01-03")],
      weekly_prizes: [
        { week_start: WEEK, title: "Áo SmartEdu", description: "Hạng 1 nhận áo SmartEdu." },
      ],
    },
  });
  const problems = watchProblems(page);
  const userId = await signIn(page, "/leaderboard");
  // bạn: 5 chương × 100 = 500 điểm, bằng điểm Võ Ngọc Lan → xếp theo tên ("Nguyễn" < "Võ")
  await seedBackend({
    chapter_quiz_attempts: [1, 2, 3, 4, 5].map((c) => attempt(userId, `chuong-${c}`, 5)),
  });
  await page.reload();

  const rows = page.getByRole("region", { name: /Top tuần này/ }).getByTestId("rank-row");
  await expect(rows).toHaveCount(11);
  const expected = [
    ["1", "Trần Minh Khoa", "800"],
    ["2", "Lê Thu Hà", "700"],
    ["3", "Phạm Gia Bảo", "600"],
    ["4", "Nguyễn Văn An", "500"],
    ["5", "Võ Ngọc Lan", "500"],
    ["6", "Đặng Quốc Huy", "400"],
    ["7", "Bùi Anh Thư", "300"],
    ["8", "Hoàng Đức Minh", "200"],
    ["9", "Đỗ Hải Nam", "100"],
    ["10", "Ngô Thảo Vy", "100"],
    ["11", "Vũ Khánh Linh", "100"],
  ];
  for (const [i, [rank, name, points]] of expected.entries()) {
    const row = rows.nth(i);
    await expect(row).toContainText(`Hạng ${rank}`);
    await expect(row).toContainText(name);
    await expect(row).toContainText(points);
  }
  await expect(rows.nth(3)).toHaveAttribute("aria-current", "true");
  await expect(rows.nth(3)).toContainText("Bạn");

  // bục: DOM theo hạng 1–2–3
  const podium = page.getByRole("region", { name: "Ba hạng đầu" }).getByRole("listitem");
  await expect(podium).toHaveCount(3);
  await expect(podium.nth(0)).toContainText("Hạng 1: Trần Minh Khoa");
  await expect(podium.nth(1)).toContainText("Hạng 2: Lê Thu Hà");
  await expect(podium.nth(2)).toContainText("Hạng 3: Phạm Gia Bảo");

  const myRank = page.getByTestId("my-rank");
  await expect(myRank).toContainText("#4");
  await expect(myRank).toContainText("500 điểm");
  await expect(myRank).toContainText("Còn 100 điểm nữa là bằng Phạm Gia Bảo (hạng #3)");

  // quanh vị trí của bạn (hạng 4): giữ công thức cũ rest.slice(0, myIdx + 2) → hạng 4 đến 8
  const around = page.getByRole("region", { name: "Quanh vị trí của bạn" }).getByTestId("rank-row");
  await expect(around).toHaveCount(5);
  await expect(around.first()).toContainText("Hạng 4");
  await expect(around.first()).toHaveAttribute("aria-current", "true");
  await expect(around.last()).toContainText("Hạng 8");

  await expect(page.getByRole("region", { name: "Áo SmartEdu" })).toContainText(
    "Hạng 1 nhận áo SmartEdu.",
  );
  await expect(page.getByRole("region", { name: "Áo SmartEdu" })).toContainText(
    "Đang dẫn đầu: Trần Minh Khoa với 800 điểm.",
  );
  await expect(page.getByText("Bảng này chỉ tính điểm Luyện tập theo chương.")).toBeVisible();
  expect(problems).toEqual([]);
});

test("người đứng đầu thấy lời nhắn giữ vững", async ({ page }) => {
  await resetBackend();
  const userId = await signIn(page, "/leaderboard");
  await seedBackend({ chapter_quiz_attempts: [attempt(userId, "chuong-1", 3)] });
  await page.reload();
  await expect(page.getByTestId("my-rank")).toContainText("#1");
  await expect(page.getByTestId("my-rank")).toContainText("Bạn đang dẫn đầu tuần này");
  // ít hơn 3 người thì không có bục
  await expect(page.getByRole("region", { name: "Ba hạng đầu" })).toHaveCount(0);
});

test("tuần chưa có điểm: trạng thái trống dẫn sang Luyện tập", async ({ page }) => {
  await resetBackend();
  await signIn(page, "/leaderboard");
  await expect(page.getByText("Chưa có điểm nào trong tuần này")).toBeVisible();
  await expect(page.getByText("Bạn chưa có điểm tuần này")).toBeVisible();
  await expect(page.getByRole("region", { name: "Giải tuần" })).toContainText(
    "Quà tuần sẽ được giảng viên công bố.",
  );
  await page.getByRole("link", { name: "Làm bài Luyện tập" }).click();
  await expect(page).toHaveURL(/\/practice$/);
  await expect(page.getByRole("heading", { level: 1, name: "Luyện theo chương" })).toBeVisible();
});
