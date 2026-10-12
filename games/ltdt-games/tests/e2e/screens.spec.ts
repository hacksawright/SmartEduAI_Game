// npm run shots: chụp sảnh và mỗi game (bàn chơi lúc bắt đầu, hộp kết quả) ở cỡ desktop và mobile
// vào docs/screens/ để người chưa chạy dự án vẫn xem được giao diện. Chạy lại sau mỗi lần đổi giao diện.

import { mkdirSync } from "node:fs";
import { test } from "@playwright/test";
import { GAMES } from "../../src/core/registry";
import { expectResult, openLevel, solveLevel } from "./play";

const SIZES = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 375, height: 812 },
] as const;

const SHORT: Record<string, string> = {
  matrix_translate: "ch1-matrix",
  traversal: "ch2-traversal",
  one_stroke: "ch3-one-stroke",
  greedy_order: "ch5-greedy",
  dijkstra: "ch6-dijkstra",
  muddy_city: "ch7-muddy-city",
};

for (const size of SIZES) {
  test(`screens ${size.name}`, async ({ browser }) => {
    test.setTimeout(180_000);
    const dir = `docs/screens/${size.name}`;
    mkdirSync(dir, { recursive: true });
    const mobile = size.width < 768;
    const ctx = await browser.newContext({
      viewport: { width: size.width, height: size.height },
      deviceScaleFactor: 1,
      isMobile: mobile,
      hasTouch: mobile,
      locale: "vi-VN",
    });
    const page = await ctx.newPage();
    const shot = (file: string) => page.screenshot({ path: `${dir}/${file}.jpg`, type: "jpeg", quality: 82 });
    const user = `shots-${size.name}-${Date.now().toString(36)}`;

    await page.goto(`/?user=${user}&unlock=all#/`);
    await page.waitForLoadState("networkidle");
    await shot("00-home");

    for (const game of GAMES) {
      const level = game.levels[0];
      await openLevel(page, level.id, user);
      await page.waitForTimeout(400);
      await shot(`${SHORT[game.id]}-1-play`);
      await solveLevel(page, level);
      await expectResult(page, 3);
      // chờ pháo giấy và hiệu ứng sao xong
      await page.waitForTimeout(1800);
      await shot(`${SHORT[game.id]}-2-result`);
    }
    await ctx.close();
  });
}
