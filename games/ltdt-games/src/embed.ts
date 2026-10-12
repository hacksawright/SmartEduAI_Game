// API nhúng vào website SmartEduAI (docs/INTEGRATION.md). Bản build: npm run build:embed.
//
//   import { mountLtdtGames } from "/static/ltdt-games/ltdt-games.js";
//   const app = mountLtdtGames(document.getElementById("games")!, {
//     userId: currentUser.id, courseId: "LTDT", apiBase: "/api/v1", hashRouting: false,
//   });
//   // khi rời trang: app.unmount();

import "./styles";
import { createElement, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import type { GamesConfig } from "./app/config";

export type { GamesConfig } from "./app/config";
export type { LearningEvent } from "./core/events";
export { verifySubmission } from "./core/verify";

// thư mục assets/ nằm cạnh file ltdt-games.js; viết qua biến để Vite không coi đây là import asset lúc build
const ASSET_DIR = "./assets/";

export function mountLtdtGames(el: HTMLElement, config: GamesConfig): { unmount(): void } {
  const full: GamesConfig = { ...config, assetBase: config.assetBase ?? new URL(ASSET_DIR, import.meta.url).href };
  const root = createRoot(el);
  root.render(createElement(StrictMode, null, createElement(App, { config: full })));
  return { unmount: () => root.unmount() };
}
