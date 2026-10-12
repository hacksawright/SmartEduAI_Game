// Test e2e (npm run test:e2e): app chạy bằng `vite dev`, nối với Supabase giả (e2e/support/fake-supabase.mjs).
// Trình duyệt: `npx playwright install chromium` (hoặc đặt PLAYWRIGHT_BROWSERS_PATH tới thư mục đã cài).
// Kiểm tra bản build: build với VITE_SUPABASE_URL trỏ tới Supabase giả, chạy `vite preview`, rồi đặt
// E2E_BASE_URL=<địa chỉ preview> để bỏ qua bước tự chạy `vite dev`.
import { defineConfig, devices } from "@playwright/test";

const FAKE_PORT = 54329;
const APP_PORT = 4173;
const FAKE_URL = `http://127.0.0.1:${FAKE_PORT}`;
const EXTERNAL_APP = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: "e2e",
  // các test dùng chung một Supabase giả nên chạy lần lượt
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    baseURL: EXTERNAL_APP ?? `http://127.0.0.1:${APP_PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 860 } },
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"], viewport: { width: 375, height: 812 } },
    },
  ],
  webServer: [
    {
      command: "node e2e/support/fake-supabase.mjs",
      url: `${FAKE_URL}/__test/health`,
      reuseExistingServer: !process.env.CI,
      env: { FAKE_SUPABASE_PORT: String(FAKE_PORT) },
    },
    ...(EXTERNAL_APP ? [] : [devServer()]),
  ],
});

function devServer() {
  return {
    command: `npx vite dev --port ${APP_PORT} --strictPort --host 127.0.0.1`,
    url: `http://127.0.0.1:${APP_PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      VITE_SUPABASE_URL: FAKE_URL,
      VITE_SUPABASE_PUBLISHABLE_KEY: "fake-anon-key",
      SUPABASE_URL: FAKE_URL,
      SUPABASE_PUBLISHABLE_KEY: "fake-anon-key",
    },
  };
}
