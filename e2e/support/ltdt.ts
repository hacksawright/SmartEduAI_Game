// Lời giải một màn Dijkstra cho e2e của SmartEdu, lấy từ engine tham chiếu của games/ltdt-games.
// (Không import games/ltdt-games/tests/e2e/play.ts: file đó kéo theo bản @playwright/test thứ hai.)
import { expect, type Page } from "@playwright/test";
import { createDijkstraEngine } from "../../games/ltdt-games/src/core/engines/dijkstraEngine";
import { makeGraph } from "../../games/ltdt-games/src/core/graph";
import type { DijkstraLevel } from "../../games/ltdt-games/src/core/levels/types";

const press = (page: Page, name: string) => page.getByRole("button", { name, exact: true }).click();

export async function solveDijkstra(page: Page, level: DijkstraLevel) {
  const eng = createDijkstraEngine(makeGraph(level.graph), level.source);
  for (let s = eng.init(); !eng.isDone(s);) {
    const a = eng.expected(s)!;
    if (a.type === "select") await page.locator(`[role="button"][data-vertex="${a.v}"]`).click();
    else {
      let typed = false;
      for (const [v, nv] of Object.entries(a.values)) {
        if (nv >= s.d[v]) continue;
        await page.locator(`input[aria-label^="Nhãn mới của ${v},"]`).fill(String(nv));
        typed = true;
      }
      await press(page, typed ? "Xác nhận" : "Giữ nguyên tất cả");
    }
    s = eng.apply(s, a);
  }
}

export async function expectStars(page: Page, stars: number) {
  await expect(page.locator(".lg-result__stars")).toHaveAttribute(
    "aria-label",
    `${stars} trên 3 sao`,
    { timeout: 15_000 },
  );
}
