/// <reference types="node" />
// Ranh giới giữa hai module: Luyện tập/Xếp hạng (Quiz) và Trò chơi (Game).
// Hai module dùng chung AppShell và đăng nhập, nhưng không import lẫn nhau và không dùng chung dữ
// liệu điểm: Quiz ghi Supabase, Game chỉ ghi localStorage của trình duyệt.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../../", import.meta.url));

function filesUnder(dir: string, pattern = /\.(ts|tsx)$/): string[] {
  return readdirSync(join(root, dir), { recursive: true, encoding: "utf8" })
    .filter((file) => pattern.test(file))
    .map((file) => join(dir, file));
}

function importsOf(file: string): string[] {
  const source = readFileSync(join(root, file), "utf8");
  const specifiers: string[] = [];
  const re =
    /(?:^|\s)(?:import|export)\s[^;]*?from\s*["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)|^import\s+["']([^"']+)["']/gm;
  for (const match of source.matchAll(re)) specifiers.push(match[1] ?? match[2] ?? match[3]);
  return specifiers;
}

/** Tách danh sách selector theo dấu phẩy ở cấp ngoài cùng (bỏ qua dấu phẩy trong :where(...)). */
function splitSelectorList(list: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of list) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      parts.push(current);
      current = "";
    } else current += ch;
  }
  parts.push(current);
  return parts;
}

const quizFiles = [
  ...filesUnder("src/features/quiz"),
  "src/routes/_app.practice.tsx",
  "src/routes/_app.leaderboard.tsx",
];
const gameHostFiles = [...filesUnder("src/features/games"), "src/routes/_app.games.tsx"];

describe("ranh giới module Quiz ↔ Trò chơi", () => {
  it("tìm thấy đủ file của hai module", () => {
    expect(quizFiles.length).toBeGreaterThanOrEqual(8);
    expect(gameHostFiles.length).toBeGreaterThanOrEqual(4);
  });

  it("Quiz không import gì của module Trò chơi", () => {
    for (const file of quizFiles) {
      for (const spec of importsOf(file)) {
        expect(spec, `${file} import ${spec}`).not.toMatch(/features\/games|ltdt|^\/games\//);
      }
    }
  });

  it("phần gắn Trò chơi vào app không đụng điểm Quiz, Supabase hay dữ liệu chương", () => {
    const forbidden =
      /features\/quiz|integrations\/supabase|@supabase\/|lib\/graph-chapters|lib\/week|react-query/;
    for (const file of gameHostFiles) {
      for (const spec of importsOf(file)) {
        expect(spec, `${file} import ${spec}`).not.toMatch(forbidden);
      }
    }
  });

  it("mã nguồn module Trò chơi tự chứa: không import từ app SmartEdu", () => {
    const gameSource = filesUnder("games/ltdt-games/src");
    expect(gameSource.length).toBeGreaterThan(20);
    for (const file of gameSource) {
      for (const spec of importsOf(file)) {
        expect(spec, `${file} import ${spec}`).not.toMatch(/^@\/|^(\.\.\/){3,}|supabase/);
      }
    }
  });

  it("bản build của Trò chơi không gọi Supabase và chỉ lưu vào khóa smartedu-ltdt:*", () => {
    const bundle = readFileSync(join(root, "public/games/ltdt/ltdt-games.js"), "utf8");
    expect(bundle).not.toMatch(/supabase|\/rest\/v1|chapter_quiz_attempts|student_xp_log/i);
    const keys = new Set(bundle.match(/smartedu-ltdt:[a-z-]+/g));
    expect([...keys].sort()).toEqual([
      "smartedu-ltdt:ledger",
      "smartedu-ltdt:outbox",
      "smartedu-ltdt:progress",
      "smartedu-ltdt:settings",
    ]);
  });

  it("CSS của Trò chơi chỉ áp dụng trong vùng .lg-*, không đổi giao diện Quiz", () => {
    const css = readFileSync(join(root, "public/games/ltdt/ltdt-games.css"), "utf8");
    // bỏ @font-face và @keyframes, các selector còn lại đều phải nằm trong .lg-*
    const rules = css
      .replace(/@font-face\s*{[^}]*}/g, "")
      .replace(/@keyframes[^{]*{(?:[^{}]*{[^}]*})*[^}]*}/g, "")
      .replace(/@(?:media|supports|container|layer)[^{]*{/g, "");
    const selectors = [...rules.matchAll(/([^{}@;]+){/g)]
      .map((m) => m[1].trim())
      .filter((s) => s && !/^(from|to|\d+%)/.test(s));
    expect(selectors.length).toBeGreaterThan(50);
    for (const group of selectors) {
      for (const selector of splitSelectorList(group)) {
        expect(selector.trim(), `selector "${selector.trim()}"`).toMatch(/\.lg-|^:where\(\.lg-/);
      }
    }
  });
});
