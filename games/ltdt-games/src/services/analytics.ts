// Sự kiện đo lường cho thí điểm (mục 9 kế hoạch, GDD 2.9).

import { authHeaders, type TokenGetter } from "./http";

export type AnalyticsName =
  | "game_level_started"
  | "game_level_completed"
  | "game_level_failed"
  | "game_level_abandoned"
  | "game_hint_used";

export interface AnalyticsSink {
  (name: AnalyticsName, payload: Record<string, unknown>): void;
}

export class Analytics {
  private sinks: AnalyticsSink[] = [];

  constructor(private readonly base: Record<string, unknown>) {}

  addSink(s: AnalyticsSink) {
    this.sinks.push(s);
  }

  track(name: AnalyticsName, payload: Record<string, unknown> = {}) {
    const full = { ...this.base, ...payload, timestamp: new Date().toISOString() };
    for (const s of this.sinks) {
      try {
        s(name, full);
      } catch {
        /* sink lỗi không được làm hỏng game */
      }
    }
  }
}

/**
 * Gửi lên `${apiBase}/analytics`. Sự kiện rời trang dùng sendBeacon: trình duyệt vẫn gửi khi trang đóng
 * nhưng không gắn được header Authorization (cookie cùng origin vẫn đi kèm).
 */
export function httpSink(apiBase: string, authToken?: TokenGetter): AnalyticsSink {
  const url = `${apiBase.replace(/\/$/, "")}/analytics`;
  return (name, payload) => {
    const body = JSON.stringify({ event: name, ...payload });
    if (name === "game_level_abandoned" && typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
      return;
    }
    void authHeaders(authToken, { "Content-Type": "application/json" })
      .then((headers) => fetch(url, { method: "POST", headers, body, keepalive: true }))
      .catch(() => undefined);
  };
}
