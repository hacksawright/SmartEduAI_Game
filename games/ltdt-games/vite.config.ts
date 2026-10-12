/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

/**
 * Mock API của hệ thống điểm (TV1) chỉ chạy khi `npm run dev`.
 * Module được nạp qua ssrLoadModule nên dùng chung mã chấm `src/core/verify.ts` với client.
 */
function mockApi(): Plugin {
  return {
    name: "ltdt-mock-api",
    configureServer(server) {
      server.middlewares.use("/api/v1", async (req, res, next) => {
        try {
          const mod = await server.ssrLoadModule("/server/mock-api.ts");
          await mod.handle(req, res, next);
        } catch (err) {
          server.config.logger.error(String(err));
          res.statusCode = 500;
          res.end(JSON.stringify({ error: "mock-api lỗi" }));
        }
      });
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [react(), mockApi()],
  build: {
    target: "es2022",
    assetsInlineLimit: 0,
  },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
  },
});
