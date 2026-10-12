// Chạy độc lập (npm run dev / bản build tĩnh). Khi nhúng vào SmartEduAI dùng src/embed.ts.
import "./styles";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import type { GamesConfig } from "./app/config";

const params = new URLSearchParams(location.search);

const config: GamesConfig = {
  userId: params.get("user") ?? "sv-demo",
  courseId: "LTDT",
  // npm run dev có mock API ở /api/v1 (vite.config.ts); bản tĩnh không có server thì chấm và cộng điểm ngay trên máy
  apiBase: params.get("api") ?? (import.meta.env.DEV ? "/api/v1" : undefined),
  hintEndpoint: params.get("hint") ?? undefined,
  unlockAll: params.get("unlock") === "all",
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App config={config} />
  </StrictMode>,
);
