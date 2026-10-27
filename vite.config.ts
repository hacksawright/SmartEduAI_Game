import { defineConfig, loadEnv } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

// Đường dẫn gốc app được phục vụ dưới đó: "/" khi chạy riêng, "/code/game/" khi nằm sau
// reverse proxy của AICode. TanStack Start tự suy router basepath từ `base`.
function normalizeBase(raw: string | undefined): string {
  const trimmed = (raw ?? "").trim().replace(/^\/+|\/+$/g, "");
  return trimmed ? `/${trimmed}/` : "/";
}

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ""), ...process.env };
  const base = normalizeBase(env.GAME_BASE_PATH);

  return {
    base,
    plugins: [
      tsconfigPaths(),
      tailwindcss(),
      tanstackStart({
        server: { entry: "server" },
      }),
      viteReact(),
      nitro({ baseURL: base }),
    ],
  };
});
