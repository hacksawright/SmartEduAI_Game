// Trợ giúp chung cho test e2e của SmartEdu.
import { expect, type Page } from "@playwright/test";
import { currentWeekStart } from "../../src/lib/week";

export const FAKE_URL = "http://127.0.0.1:54329";
export const WEEK = currentWeekStart();

type Row = Record<string, unknown>;
export type Db = Record<string, Row[] | undefined>;

export async function resetBackend(
  options: { seed?: Record<string, Row[]>; failTables?: string[]; profile?: Row } = {},
) {
  const res = await fetch(`${FAKE_URL}/__test/reset`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      profileDefaults: {
        full_name: "Nguyễn Văn An",
        onboarding_completed: true,
        ...options.profile,
      },
      seed: options.seed,
      failTables: options.failTables,
    }),
  });
  expect(res.ok).toBe(true);
}

export async function seedBackend(data: Record<string, Row[]>) {
  const res = await fetch(`${FAKE_URL}/__test/seed`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(data),
  });
  expect(res.ok).toBe(true);
}

export async function readDb(): Promise<Db> {
  return (await fetch(`${FAKE_URL}/__test/db`)).json();
}

export async function readRequests(): Promise<{ method: string; path: string; query: string }[]> {
  return (await fetch(`${FAKE_URL}/__test/requests`)).json();
}

/** Mở app (đăng nhập ẩn danh) và trả về id người dùng của phiên hiện tại. */
export async function signIn(page: Page, path = "/dashboard"): Promise<string> {
  await page.goto(path);
  await expect(page.locator("main#main")).toBeVisible();
  const id = await page.waitForFunction(() => {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("sb-") && key.endsWith("-auth-token")) {
        return JSON.parse(localStorage.getItem(key) ?? "{}")?.user?.id as string | undefined;
      }
    }
    return undefined;
  });
  return (await id.jsonValue()) as string;
}

/** Lỗi console, lỗi trang và response HTTP ≥ 400 (trừ các lỗi test cố ý gây ra). */
export function watchProblems(page: Page, ignore: RegExp[] = []): string[] {
  const problems: string[] = [];
  const keep = (text: string) => !ignore.some((re) => re.test(text)) && problems.push(text);
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") keep(`console.${m.type()}: ${m.text()}`);
  });
  page.on("pageerror", (e) => keep(`pageerror: ${e.message}`));
  page.on("response", (r) => {
    if (r.status() >= 400) keep(`HTTP ${r.status()} ${r.url()}`);
  });
  return problems;
}

/** Bảng xếp hạng mẫu: 10 học sinh, điểm từ cao xuống thấp. */
export function sampleRanking() {
  const names = [
    "Trần Minh Khoa",
    "Lê Thu Hà",
    "Phạm Gia Bảo",
    "Võ Ngọc Lan",
    "Đặng Quốc Huy",
    "Bùi Anh Thư",
    "Hoàng Đức Minh",
    "Ngô Thảo Vy",
    "Đỗ Hải Nam",
    "Vũ Khánh Linh",
  ];
  const profiles = names.map((full_name, i) => ({
    id: `seed-${i}`,
    full_name,
    level: 2 + (i % 4),
    xp_total: 300,
    onboarding_completed: true,
    show_in_feed: true,
  }));
  // học sinh i làm (8 - i) chương, mỗi chương 100 điểm, thêm một lần thấp hơn để kiểm tra "lấy cao nhất"
  const attempts = profiles.flatMap((p, i) =>
    Array.from({ length: Math.max(1, 8 - i) }, (_, c) => [
      attempt(p.id, `chuong-${c + 1}`, 5),
      attempt(p.id, `chuong-${c + 1}`, 2),
    ]).flat(),
  );
  return { profiles, attempts };
}

export function attempt(studentId: string, chapterKey: string, correct: number, week = WEEK) {
  return {
    student_id: studentId,
    chapter_key: chapterKey,
    correct_count: correct,
    question_count: 5,
    points: correct * 20,
    week_start: week,
  };
}
