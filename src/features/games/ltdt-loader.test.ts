/// <reference types="node" />
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LTDT_BUILD_ID } from "./ltdt-build";
import { isLtdtGameId, ltdtConfig, ltdtFileUrl, ltdtInitialRoute } from "./ltdt-loader";

const publicFile = (name: string) =>
  readFileSync(new URL(`../../../public/games/ltdt/${name}`, import.meta.url));

describe("nạp module Trò chơi", () => {
  it("URL bản build có mã phiên bản để không dùng bản cũ trong cache", () => {
    expect(ltdtFileUrl("ltdt-games.js")).toBe(`/games/ltdt/ltdt-games.js?v=${LTDT_BUILD_ID}`);
    expect(ltdtFileUrl("ltdt-games.css")).toBe(`/games/ltdt/ltdt-games.css?v=${LTDT_BUILD_ID}`);
  });

  it("mã phiên bản khớp với bản build đang nằm trong public/games/ltdt", () => {
    const hash = createHash("sha256");
    hash.update(publicFile("ltdt-games.js"));
    hash.update(publicFile("ltdt-games.css"));
    expect(hash.digest("hex").slice(0, 12)).toBe(LTDT_BUILD_ID);
  });

  it("chỉ nhận 9 mã game của module", () => {
    for (const id of [
      "matrix_translate",
      "traversal",
      "one_stroke",
      "untangle",
      "two_teams",
      "greedy_order",
      "dijkstra",
      "muddy_city",
      "max_flow",
    ]) {
      expect(isLtdtGameId(id)).toBe(true);
    }
    expect(isLtdtGameId("quiz")).toBe(false);
    expect(isLtdtGameId(undefined)).toBe(false);
  });

  it("đổi tham số URL của SmartEdu thành màn mở đầu của game", () => {
    expect(ltdtInitialRoute({})).toBe("#/");
    expect(ltdtInitialRoute({ game: "dijkstra" })).toBe("#/game/dijkstra");
    expect(ltdtInitialRoute({ level: "ch6-l03" })).toBe("#/play/ch6-l03");
    expect(ltdtInitialRoute({ level: "ch6-l03-race", game: "dijkstra" })).toBe(
      "#/play/ch6-l03-race",
    );
    expect(ltdtInitialRoute({ level: "ch2-bfs-01" })).toBe("#/play/ch2-bfs-01");
    expect(ltdtInitialRoute({ level: "ch2-dfs-04-race" })).toBe("#/play/ch2-dfs-04-race");
    expect(ltdtInitialRoute({ level: "ch8-l05" })).toBe("#/play/ch8-l05");
    expect(ltdtInitialRoute({ game: "max_flow" })).toBe("#/game/max_flow");
    // giá trị lạ bị bỏ qua
    expect(ltdtInitialRoute({ game: "../../x" })).toBe("#/");
    expect(ltdtInitialRoute({ level: "#/settings" })).toBe("#/");
  });

  it("game chạy với route trong bộ nhớ và chấm điểm cục bộ (không có apiBase)", () => {
    const config = ltdtConfig("u1", "#/");
    expect(config).toEqual({ userId: "u1", courseId: "LTDT", hashRouting: false, initialRoute: "#/" });
    expect(config).not.toHaveProperty("apiBase");
  });
});
