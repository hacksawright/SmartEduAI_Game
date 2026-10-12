// Cấu hình khi nhúng vào SmartEduAI (xem docs/INTEGRATION.md).

export interface GamesConfig {
  /** id sinh viên trong hệ thống SmartEduAI */
  userId: string;
  courseId: string;
  /** gốc API point transaction của TV1, ví dụ "/api/v1". Bỏ trống → LocalPointsClient */
  apiBase?: string;
  /** endpoint chatbot Socratic của TV5. Bỏ trống → gợi ý tĩnh */
  hintEndpoint?: string;
  /** thư mục chứa asset (kết thúc bằng "/"), mặc định "<base>assets/" */
  assetBase?: string;
  /** mở mọi màn (giảng viên, kiểm thử) */
  unlockAll?: boolean;
  /** true (mặc định): định tuyến bằng hash; false: giữ route trong bộ nhớ, không đụng URL trang chủ */
  hashRouting?: boolean;
  /** route ban đầu khi hashRouting = false, ví dụ "#/game/traversal" */
  initialRoute?: string;
  /** token gắn vào `Authorization: Bearer` của mọi request tới apiBase và hintEndpoint (trừ sendBeacon lúc rời trang) */
  authToken?: () => string | Promise<string>;
  /** nhận mọi sự kiện analytics và learning event */
  onEvent?: (name: string, payload: Record<string, unknown>) => void;
}

export interface ResolvedConfig extends GamesConfig {
  assetBase: string;
  hashRouting: boolean;
  unlockAll: boolean;
}

export function resolveConfig(c: GamesConfig): ResolvedConfig {
  const base = import.meta.env.BASE_URL ?? "./";
  return {
    ...c,
    assetBase: c.assetBase ?? `${base}assets/`,
    hashRouting: c.hashRouting ?? true,
    unlockAll: c.unlockAll ?? false,
  };
}
