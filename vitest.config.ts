// Test đơn vị (npm test). Không dùng vite.config.ts vì plugin TanStack Start/Nitro chỉ cần cho app.
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
