// Nhúng vào trang chủ SmartEduAI (docs/INTEGRATION.md), qua trang giả lập tests/e2e/embed-host.html:
// - CSS toàn cục của trang chủ (kiểu Bootstrap reboot, Tailwind preflight) không làm đổi giao diện game
// - hashRouting: false không đụng URL trang chủ; onEvent nhận sự kiện; mọi request API kèm token
// - bản build dist-embed/ tải đủ font và chạy trọn một màn (bỏ qua khi chưa chạy npm run build:embed)

import { existsSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { getLevel } from "../../src/core/registry";
import { expectResult, press, solveLevel, userFor, watchProblems } from "./play";

type HostWindow = Window & {
  __mounted?: boolean;
  __events: { name: string; payload: Record<string, unknown> }[];
  __app: { unmount(): void };
};

function hostUrl(o: { user: string; route: string; hostile?: boolean; bundle?: boolean; unlockAll?: boolean }) {
  const q = new URLSearchParams({ user: o.user, route: o.route });
  if (o.hostile) q.set("hostile", "1");
  if (o.bundle) q.set("bundle", "1");
  if (o.unlockAll) q.set("unlock", "all");
  return `/tests/e2e/embed-host.html?${q}`;
}

async function mount(page: Page, url: string) {
  await page.goto(url);
  await page.waitForFunction(() => (window as unknown as HostWindow).__mounted && !!document.querySelector(".lg-root"));
  await page.evaluate(() => document.fonts.ready);
}

/** Style hiển thị và hộp (tính từ góc .lg-root) của mọi phần tử trong game. */
function fingerprint(page: Page) {
  return page.evaluate(() => {
    const PROPS = [
      "display", "font-family", "font-size", "font-weight", "font-style", "line-height", "letter-spacing",
      "text-transform", "text-decoration-line", "text-align", "color", "background-color", "list-style-type",
      "border-radius", "vertical-align", "cursor", "opacity", "visibility",
    ];
    const root = document.querySelector(".lg-root")!;
    const R = root.getBoundingClientRect();
    return [root, ...root.querySelectorAll("*")].map((el) => {
      const cs = getComputedStyle(el);
      const cls = el.getAttribute("class");
      const s: Record<string, string> = {};
      for (const p of PROPS) s[p] = cs.getPropertyValue(p);
      // viền chỉ tính khi thật sự hiện ra
      for (const side of ["top", "right", "bottom", "left"]) {
        const w = cs.getPropertyValue(`border-${side}-width`);
        const st = cs.getPropertyValue(`border-${side}-style`);
        s[`border-${side}`] =
          w === "0px" || st === "none" || st === "hidden" ? "none" : `${w} ${st} ${cs.getPropertyValue(`border-${side}-color`)}`;
      }
      const r = el.getBoundingClientRect();
      s.box = [r.x - R.x, r.y - R.y, r.width, r.height].map((v) => Math.round(v * 2) / 2).join(",");
      return { tag: `${el.tagName.toLowerCase()}${cls ? "." + cls.trim().split(/\s+/).join(".") : ""}`, s };
    });
  });
}

/** Đo lại tới khi hai lần liên tiếp giống nhau: font tải xong (đơn vị ch đổi theo font), hết chuyển động. */
async function stableFingerprint(page: Page) {
  let prev = "";
  for (let i = 0; i < 20; i++) {
    await page.evaluate(() => document.fonts.ready);
    const fp = await fingerprint(page);
    const key = JSON.stringify(fp);
    if (key === prev) return fp;
    prev = key;
    await page.waitForTimeout(150);
  }
  throw new Error("giao diện vẫn thay đổi sau 3 giây");
}

test.describe("CSS toàn cục của trang chủ không làm đổi giao diện game", () => {
  test.use({ reducedMotion: "reduce" });

  const screens: [route: string, step: "none" | "intro" | "start" | "locked"][] = [
    ["#/", "none"],
    ["#/game/dijkstra", "none"],
    ["#/badges", "none"],
    ["#/settings", "none"],
    ["#/play/ch6-l01", "intro"],
    ["#/play/ch6-l03", "locked"],
    ["#/play/ch2-bfs-01", "start"],
    ["#/play/ch6-l01", "start"],
    ["#/play/ch3-l01", "start"],
    ["#/play/ch7-l01", "start"],
    ["#/play/ch5-l02", "start"],
    ["#/play/ch1-l02", "start"],
    ["#/play/ch1-l03", "start"],
    ["#/play/ch1-l04", "start"],
  ];

  for (const [route, step] of screens) {
    test(`${route}${step === "none" ? "" : ` (${step})`}`, async ({ page }, info) => {
      const prints = [];
      for (const hostile of [false, true]) {
        const user = userFor(info, "embed-css");
        await mount(page, hostUrl({ user, route, hostile, unlockAll: step !== "locked" }));
        // giao diện màn chơi là chunk tải sau (React.lazy): chờ nó hiện rồi mới đo
        if (step === "intro") await expect(page.getByRole("button", { name: "Bắt đầu", exact: true })).toBeVisible();
        if (step === "start") {
          await press(page, "Bắt đầu");
          await expect(page.locator('[aria-modal="true"]')).toHaveCount(0);
        }
        prints.push(await stableFingerprint(page));
      }
      const [plain, hostile] = prints;
      expect(hostile.length).toBe(plain.length);
      const diffs: string[] = [];
      plain.forEach((a, i) => {
        for (const k of Object.keys(a.s))
          if (a.s[k] !== hostile[i].s[k]) diffs.push(`${a.tag} ${k}: ${a.s[k]} → ${hostile[i].s[k]}`);
      });
      expect(diffs).toEqual([]);
    });
  }
});

for (const bundle of [false, true]) {
  test(`${bundle ? "Bản build dist-embed" : "Mã nguồn src/embed.ts"}: chơi trọn một màn trong trang chủ, URL giữ nguyên, sự kiện tới onEvent, request kèm token`, async ({
    page,
  }, info) => {
    test.skip(bundle && !existsSync("dist-embed/ltdt-games.js"), "chưa có dist-embed/: chạy npm run build:embed");
    const problems = watchProblems(page);
    const api: string[] = [];
    page.on("request", (r) => {
      const u = new URL(r.url());
      if (u.pathname.startsWith("/api/v1/")) api.push(`${r.method()} ${u.pathname} ${r.headers()["authorization"] ?? "(không token)"}`);
    });
    const url = hostUrl({ user: userFor(info, bundle ? "embed-dist" : "embed-src"), route: "#/play/ch6-l01", bundle });
    await mount(page, url);
    await press(page, "Bắt đầu");
    await solveLevel(page, getLevel("ch6-l01")!);
    await expectResult(page, 3);

    // hashRouting: false: game không ghi gì lên URL của trang chủ
    expect(page.url()).toBe(new URL(url, page.url()).href);

    const events = await page.evaluate(() =>
      (window as unknown as HostWindow).__events.map((e) => `${e.name} ${e.payload.level_id} ${e.payload.stars ?? "-"}`),
    );
    expect(events).toEqual(["game_level_started ch6-l01 -", "learning_event ch6-l01 3", "game_level_completed ch6-l01 3"]);
    expect(api).toContain("GET /api/v1/progress Bearer token-thu");
    expect(api).toContain("POST /api/v1/learning-events Bearer token-thu");
    expect(api).toContain("POST /api/v1/analytics Bearer token-thu");
    expect(api.filter((a) => !a.endsWith("Bearer token-thu"))).toEqual([]);

    const fonts = await page.evaluate(() =>
      [...new Set([...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family.replace(/"/g, "")))].sort(),
    );
    expect(fonts).toEqual(["Baloo 2", "Be Vietnam Pro", "JetBrains Mono"]);

    await page.evaluate(() => (window as unknown as HostWindow).__app.unmount());
    await expect(page.locator("#games")).toBeEmpty();
    expect(problems).toEqual([]);
  });
}
