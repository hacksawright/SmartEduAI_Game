/// <reference types="vitest/config" />
// Bản nhúng vào website SmartEduAI (docs/INTEGRATION.md):
//   npm run build:embed → dist-embed/ltdt-games.js (ES module, đã gồm React), ltdt-games.css, assets/
// Không dùng chế độ thư viện (build.lib) vì chế độ đó nhúng mọi font vào CSS dạng base64;
// build thường giữ font thành file riêng và trình duyệt chỉ tải subset cần dùng.
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    outDir: "dist-embed",
    target: "es2022",
    assetsInlineLimit: 0,
    cssCodeSplit: false,
    rollupOptions: {
      input: "src/embed.ts",
      // giữ các export của src/embed.ts (mountLtdtGames, verifySubmission)
      preserveEntrySignatures: "exports-only",
      output: {
        entryFileNames: "ltdt-games.js",
        assetFileNames: (a) => (a.names.some((n) => n.endsWith(".css")) ? "ltdt-games.css" : "assets/[name]-[hash][extname]"),
      },
    },
  },
});
