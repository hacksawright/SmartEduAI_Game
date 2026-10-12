// Build module Trò chơi (games/ltdt-games) rồi chép bản nhúng vào public/games/ltdt/.
//
//   npm run games:build
//
// Module Trò chơi là một project riêng (Vite 8, React 19, test riêng). App SmartEdu chỉ dùng
// bản build của nó: /games/ltdt/ltdt-games.js được tải lúc chạy khi người học mở trang /games.
// Script cũng ghi mã phiên bản (băm nội dung JS + CSS) vào src/features/games/ltdt-build.ts
// để trình duyệt không dùng bản cũ trong cache sau mỗi lần build lại.
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const gameDir = join(root, "games", "ltdt-games");
const distDir = join(gameDir, "dist-embed");
const outDir = join(root, "public", "games", "ltdt");
const buildFile = join(root, "src", "features", "games", "ltdt-build.ts");

function run(command, cwd) {
  console.log(`> ${command}  (${cwd})`);
  execSync(command, { cwd, stdio: "inherit" });
}

if (!existsSync(join(gameDir, "node_modules"))) run("npm ci --no-audit --no-fund", gameDir);
run("npm run build:embed", gameDir);

rmSync(outDir, { recursive: true, force: true });
cpSync(distDir, outDir, {
  recursive: true,
  // favicon.svg là của trang chạy riêng, bản nhúng không cần
  filter: (src) => !src.endsWith("favicon.svg"),
});

const hash = createHash("sha256");
for (const file of ["ltdt-games.js", "ltdt-games.css"])
  hash.update(readFileSync(join(outDir, file)));
const buildId = hash.digest("hex").slice(0, 12);

writeFileSync(
  buildFile,
  [
    "// File này do scripts/build-games.mjs sinh ra (npm run games:build). Không sửa tay.",
    "// Mã phiên bản = băm SHA-256 của public/games/ltdt/ltdt-games.js + ltdt-games.css.",
    `export const LTDT_BUILD_ID = "${buildId}";`,
    "",
  ].join("\n"),
);

console.log(`Đã chép bản nhúng vào public/games/ltdt/ (build ${buildId}).`);
