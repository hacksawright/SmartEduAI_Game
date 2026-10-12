// Luyện tập theo chương: giao diện mới, logic điểm cũ.
import { expect, test, type Page } from "@playwright/test";
import { GRAPH_CHAPTERS, type GraphChapter } from "../src/lib/graph-chapters";
import {
  WEEK,
  attempt,
  readDb,
  resetBackend,
  seedBackend,
  signIn,
  watchProblems,
} from "./support/app";

const today = () => new Date().toISOString().slice(0, 10);

async function openChapter(page: Page, chapter: GraphChapter) {
  await page.getByRole("button", { name: new RegExp(chapter.title) }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: chapter.questions[0].prompt }),
  ).toBeVisible();
}

/** Làm hết chương; `wrong` là chỉ số các câu cố ý chọn sai. */
async function playChapter(page: Page, chapter: GraphChapter, wrong: number[] = []) {
  for (const [i, q] of chapter.questions.entries()) {
    await expect(page.getByRole("heading", { level: 1, name: q.prompt })).toBeVisible();
    const choice = wrong.includes(i) ? q.options.find((o) => o !== q.answer)! : q.answer;
    await page.getByRole("radio", { name: choice, exact: true }).check({ force: true });
    await page.getByRole("button", { name: "Kiểm tra" }).click();
    await expect(page.getByRole("status").filter({ hasText: q.explanation })).toContainText(
      wrong.includes(i) ? "Chưa đúng" : "Chính xác!",
    );
    const last = i === chapter.questions.length - 1;
    await page.getByRole("button", { name: last ? "Xem điểm" : "Câu tiếp" }).click();
  }
  await expect(page.getByTestId("result-points")).toBeVisible();
}

test.beforeEach(async () => {
  await resetBackend();
});

test("làm một chương: lưu lần làm, XP, hồ sơ và cập nhật điểm tuần", async ({ page }) => {
  const problems = watchProblems(page);
  const userId = await signIn(page, "/practice");
  const chapter = GRAPH_CHAPTERS[1];

  await expect(page.getByRole("heading", { level: 1, name: "Luyện theo chương" })).toBeVisible();
  await expect(page.getByTestId("week-points")).toHaveText("0");
  await expect(page.getByRole("button", { name: /Chương \d · 5 câu/ })).toHaveCount(8);

  await openChapter(page, chapter);
  await playChapter(page, chapter, [3]);

  await expect(page.getByTestId("result-points")).toHaveText("80");
  await expect(page.getByText("Điểm này được tính vào bảng xếp hạng tuần.")).toBeVisible();
  await expect(page.getByText("+80 XP")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Xem lại bài làm" })).toBeVisible();

  await expect
    .poll(async () => (await readDb()).profiles?.find((p) => p.id === userId)?.xp_total)
    .toBe(80);
  const db = await readDb();
  expect(db.chapter_quiz_attempts).toEqual([
    expect.objectContaining({
      student_id: userId,
      chapter_key: chapter.key,
      correct_count: 4,
      question_count: 5,
      points: 80,
      week_start: WEEK,
    }),
  ]);
  expect(db.student_xp_log).toEqual([
    expect.objectContaining({ student_id: userId, xp_amount: 80, reason: "check_correct" }),
  ]);
  expect(db.profiles?.find((p) => p.id === userId)).toMatchObject({
    xp_total: 80,
    level: 1,
    streak_current: 1,
    last_active_date: today(),
  });
  expect(db.social_feed_events ?? []).toEqual([]);

  await page.getByRole("button", { name: "Chọn chương khác" }).click();
  await expect(page.getByTestId("week-points")).toHaveText("80");
  await expect(page.getByRole("button", { name: new RegExp(chapter.title) })).toContainText(
    "Đã làm",
  );
  expect(problems).toEqual([]);
});

test("làm lại thấp hơn: không cộng XP, điểm tuần giữ điểm cao nhất", async ({ page }) => {
  const userId = await signIn(page, "/practice");
  await seedBackend({ chapter_quiz_attempts: [attempt(userId, "chuong-1", 4)] });
  await page.reload();
  await expect(page.getByTestId("week-points")).toHaveText("80");

  const chapter = GRAPH_CHAPTERS[0];
  await openChapter(page, chapter);
  await playChapter(page, chapter, [0, 1]);

  await expect(page.getByTestId("result-points")).toHaveText("60");
  await expect(page.getByText("Điểm cao nhất tuần này của chương vẫn là 80.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Làm lại chương" })).toBeEnabled();
  const db = await readDb();
  expect(db.chapter_quiz_attempts?.map((a) => a.points)).toEqual([80, 60]);
  expect(db.student_xp_log ?? []).toEqual([]);

  await page.getByRole("button", { name: "Chọn chương khác" }).click();
  await expect(page.getByTestId("week-points")).toHaveText("80");
});

test("đạt điểm tối đa: đăng bảng tin, làm lại chương bắt đầu lượt mới", async ({ page }) => {
  const userId = await signIn(page, "/practice");
  const chapter = GRAPH_CHAPTERS[2];
  await openChapter(page, chapter);
  await playChapter(page, chapter);

  await expect(page.getByTestId("result-points")).toHaveText("100");
  await expect(page.getByRole("heading", { level: 1, name: /Xuất sắc/ })).toBeVisible();
  await expect
    .poll(async () => (await readDb()).social_feed_events ?? [])
    .toEqual([
      expect.objectContaining({
        student_id: userId,
        event_type: "chapter_complete",
        event_data_json: { title: chapter.title },
      }),
    ]);

  await page.getByRole("button", { name: "Làm lại chương" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: chapter.questions[0].prompt }),
  ).toBeVisible();
  await expect(page.getByText(`Câu 1 / ${chapter.questions.length}`)).toBeVisible();
});

test("thoát giữa chừng phải xác nhận và không lưu gì", async ({ page }) => {
  await signIn(page, "/practice");
  const chapter = GRAPH_CHAPTERS[4];
  await openChapter(page, chapter);
  await page
    .getByRole("radio", { name: chapter.questions[0].answer, exact: true })
    .check({ force: true });
  await page.getByRole("button", { name: "Thoát" }).click();

  const dialog = page.getByRole("alertdialog", { name: "Thoát bài làm?" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Làm tiếp" }).click();
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole("heading", { level: 1, name: chapter.questions[0].prompt }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Thoát" }).click();
  await page.getByRole("button", { name: "Thoát, không lưu" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Luyện theo chương" })).toBeVisible();
  expect((await readDb()).chapter_quiz_attempts ?? []).toEqual([]);
});

test("chưa chạy migration: báo lỗi rõ ràng, điểm không được lưu", async ({ page }) => {
  await resetBackend({ failTables: ["chapter_quiz_attempts"] });
  await signIn(page, "/practice");
  // react-query thử lại 3 lần trước khi báo lỗi
  await expect(page.getByRole("alert").filter({ hasText: "Chưa đọc được điểm tuần" })).toBeVisible({
    timeout: 20_000,
  });

  const chapter = GRAPH_CHAPTERS[0];
  await openChapter(page, chapter);
  await playChapter(page, chapter);
  await expect(page.getByText("Điểm chưa được lưu.", { exact: false })).toBeVisible();
  await expect(page.getByText("Chưa lưu được điểm.", { exact: false })).toBeVisible(); // toast
  expect((await readDb()).student_xp_log ?? []).toEqual([]);
});

test("làm bài chỉ bằng bàn phím", async ({ page, isMobile }) => {
  test.skip(isMobile, "phím tắt dành cho máy tính");
  await signIn(page, "/practice");
  const chapter = GRAPH_CHAPTERS[0];
  const card = page.getByRole("button", { name: new RegExp(chapter.title) });
  await card.focus();
  await page.keyboard.press("Enter");

  for (const [i, q] of chapter.questions.entries()) {
    await expect(page.getByRole("heading", { level: 1, name: q.prompt })).toBeVisible();
    if (i > 0) await expect(page.getByRole("heading", { level: 1, name: q.prompt })).toBeFocused();
    const answerIndex = q.options.indexOf(q.answer);
    await page.keyboard.press(String(answerIndex + 1));
    await expect(page.getByRole("radio", { name: q.answer, exact: true })).toBeChecked();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("status").filter({ hasText: "Chính xác!" })).toBeVisible();
    await page.keyboard.press("Enter");
  }
  await expect(page.getByTestId("result-points")).toHaveText("100");
  expect((await readDb()).chapter_quiz_attempts).toHaveLength(1);
});
