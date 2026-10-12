// Tải module Trò chơi (bản nhúng của games/ltdt-games) lúc chạy.
//
// Module Trò chơi độc lập với Luyện tập (Quiz):
// - mã nằm trong bundle riêng /games/ltdt/ltdt-games.js (có React riêng), chỉ tải khi mở /games;
// - CSS riêng, chỉ gắn vào trang khi đang ở /games và gỡ ra khi rời trang;
// - tự chấm và lưu tiến độ trong trình duyệt (khóa localStorage "smartedu-ltdt:*"),
//   không đọc hay ghi bảng nào của Supabase, nên không đụng điểm tuần và bảng xếp hạng tuần.
import { LTDT_BUILD_ID } from "./ltdt-build";

export const LTDT_BASE_PATH = "/games/ltdt/";

/** Các trường của GamesConfig (games/ltdt-games/docs/INTEGRATION.md, mục 2.3) mà SmartEdu dùng. */
export interface LtdtGamesConfig {
  userId: string;
  courseId: string;
  hashRouting?: boolean;
  initialRoute?: string;
  unlockAll?: boolean;
  onEvent?: (name: string, payload: Record<string, unknown>) => void;
}

export interface LtdtGamesApp {
  unmount(): void;
}

export interface LtdtGamesModule {
  mountLtdtGames(el: HTMLElement, config: LtdtGamesConfig): LtdtGamesApp;
}

export function ltdtFileUrl(file: "ltdt-games.js" | "ltdt-games.css"): string {
  return `${LTDT_BASE_PATH}${file}?v=${LTDT_BUILD_ID}`;
}

const GAME_IDS = [
  "matrix_translate",
  "traversal",
  "one_stroke",
  "greedy_order",
  "dijkstra",
  "muddy_city",
] as const;

export type LtdtGameId = (typeof GAME_IDS)[number];

export function isLtdtGameId(value: unknown): value is LtdtGameId {
  return typeof value === "string" && (GAME_IDS as readonly string[]).includes(value);
}

const LEVEL_ID = /^ch\d-l\d{2}(-race)?$/;

/**
 * Màn hình mở đầu của game theo tham số trên URL của SmartEdu (/games?game=…&level=…).
 * Giá trị lạ bị bỏ qua và game mở ở sảnh.
 */
export function ltdtInitialRoute(search: { game?: unknown; level?: unknown }): string {
  if (typeof search.level === "string" && LEVEL_ID.test(search.level)) {
    return `#/play/${search.level}`;
  }
  if (isLtdtGameId(search.game)) return `#/game/${search.game}`;
  return "#/";
}

export function ltdtConfig(userId: string, initialRoute: string): LtdtGamesConfig {
  return {
    userId,
    courseId: "LTDT",
    // route của game nằm trong bộ nhớ, không đụng URL do TanStack Router quản lý
    hashRouting: false,
    initialRoute,
  };
}

let modulePromise: Promise<LtdtGamesModule> | null = null;

export function loadLtdtGames(): Promise<LtdtGamesModule> {
  // URL tuyệt đối: Vite dev không gắn thêm "?import" (vốn bị từ chối với file trong public/)
  const url = new URL(ltdtFileUrl("ltdt-games.js"), window.location.href).href;
  modulePromise ??= import(/* @vite-ignore */ url)
    .then((mod: Partial<LtdtGamesModule>) => {
      if (typeof mod.mountLtdtGames !== "function") {
        throw new Error("Bản build Trò chơi không có hàm mountLtdtGames");
      }
      return mod as LtdtGamesModule;
    })
    .catch((error: unknown) => {
      // lần sau (bấm "Thử lại") tải lại từ đầu
      modulePromise = null;
      throw error;
    });
  return modulePromise;
}

const STYLESHEET_ID = "ltdt-games-css";
let stylesheetUsers = 0;

/**
 * Gắn ltdt-games.css vào <head> và chờ tải xong. Trả về hàm gỡ:
 * thẻ <link> bị xóa khi không còn trang nào dùng game.
 */
export function attachLtdtStylesheet(doc: Document = document): {
  ready: Promise<void>;
  release: () => void;
} {
  stylesheetUsers += 1;
  let link = doc.getElementById(STYLESHEET_ID) as HTMLLinkElement | null;
  if (!link) {
    link = doc.createElement("link");
    link.id = STYLESHEET_ID;
    link.rel = "stylesheet";
    link.href = ltdtFileUrl("ltdt-games.css");
    link.dataset.state = "loading";
    const current = link;
    current.addEventListener("load", () => (current.dataset.state = "loaded"), { once: true });
    current.addEventListener("error", () => (current.dataset.state = "error"), { once: true });
    doc.head.appendChild(link);
  }
  const target = link;
  const ready = new Promise<void>((resolve, reject) => {
    if (target.dataset.state === "loaded") return resolve();
    if (target.dataset.state === "error") return reject(new Error("Không tải được CSS của Trò chơi"));
    target.addEventListener("load", () => resolve(), { once: true });
    target.addEventListener("error", () => reject(new Error("Không tải được CSS của Trò chơi")), {
      once: true,
    });
  });
  let released = false;
  return {
    ready,
    release: () => {
      if (released) return;
      released = true;
      stylesheetUsers -= 1;
      if (stylesheetUsers === 0) target.remove();
    },
  };
}
