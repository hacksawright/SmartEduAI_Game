// Chơi hết mọi màn (và mọi màn Đua với máy) bằng lời giải chuẩn: phải được 3 sao, server mock cộng điểm,
// không lỗi console.

import { expect, test } from "@playwright/test";
import { allLevels, RACE_SUFFIX, supportsRace } from "../../src/core/registry";
import { expectResult, openLevel, solveLevel, userFor, watchProblems } from "./play";

const runs = allLevels().flatMap((level) => [
  { level, id: level.id },
  ...(supportsRace(level) ? [{ level, id: `${level.id}${RACE_SUFFIX}` }] : []),
]);

for (const { level, id } of runs) {
  test(`${id} · ${level.title}`, async ({ page }, info) => {
    const problems = watchProblems(page);
    await openLevel(page, id, userFor(info, id));
    await solveLevel(page, level);
    await expectResult(page, 3);
    // người chơi mới: lần đầu được 3 sao nên chắc chắn có điểm thưởng
    await expect(page.locator(".lg-result__note")).toHaveText(/^\+\d+ điểm thưởng · tổng \d+ điểm$/);
    await expect(page.getByRole("heading", { name: "Vì sao?" })).toBeVisible();
    expect(problems).toEqual([]);
  });
}
