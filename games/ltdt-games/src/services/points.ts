// Client của API point transaction (TV1). Hai bản cùng hợp đồng:
// - HttpPointsClient: gửi event lên server; mất mạng thì xếp hàng và gửi lại (idempotency_key
//   bảo đảm gửi lại không bị cộng trùng).
// - LocalPointsClient: chưa có API thì chạy đúng logic của server ngay trong trình duyệt.

import { creditFor, type LearningEvent } from "../core/events";
import { verifySubmission } from "../core/verify";
import { authHeaders, type TokenGetter } from "./http";
import { readJson, writeJson } from "./storage";

export type PointsStatus = "credited" | "no_improvement" | "duplicate" | "queued" | "rejected";

export interface PointsResult {
  status: PointsStatus;
  credited: number;
  /** tổng điểm sau giao dịch (null khi chưa biết, ví dụ đang xếp hàng) */
  total: number | null;
  stars: number;
  score: number;
  reason?: string;
}

/** Tiến độ đã ghi trên server (GET /progress), dùng để đồng bộ khi SV đổi máy. */
export interface RemoteProgress {
  total: number;
  levels: Record<string, { best_stars: number; best_score: number }>;
}

export interface PointsClient {
  submit(ev: LearningEvent): Promise<PointsResult>;
  /** gửi lại các event đang xếp hàng (nếu có) */
  flush?(): Promise<void>;
  /** tiến độ trên server; null khi không lấy được */
  fetchProgress?(): Promise<RemoteProgress | null>;
}

interface Ledger {
  keys: string[];
  best: Record<string, number>;
  total: number;
}

export class LocalPointsClient implements PointsClient {
  constructor(private readonly userId: string) {}

  private get storageKey() {
    return `smartedu-ltdt:ledger:v1:${this.userId}`;
  }

  async submit(ev: LearningEvent): Promise<PointsResult> {
    const v = verifySubmission(ev.level_id, ev.submission);
    if (!v.ok) return { status: "rejected", credited: 0, total: null, stars: 0, score: 0, reason: v.reason };
    const L = readJson<Ledger>(this.storageKey, { keys: [], best: {}, total: 0 });
    const key = `${ev.user_id}:${ev.game_id}:${ev.level_id}:${v.stars}`;
    if (L.keys.includes(key)) return { status: "duplicate", credited: 0, total: L.total, stars: v.stars, score: v.score };
    L.keys.push(key);
    const credited = creditFor(L.best[ev.level_id] ?? 0, v.stars);
    if (credited > 0) {
      L.best[ev.level_id] = v.stars;
      L.total += credited;
    }
    writeJson(this.storageKey, L);
    return { status: credited > 0 ? "credited" : "no_improvement", credited, total: L.total, stars: v.stars, score: v.score };
  }
}

export class HttpPointsClient implements PointsClient {
  constructor(
    private readonly apiBase: string,
    private readonly userId: string,
    private readonly authToken?: TokenGetter,
  ) {}

  private get outboxKey() {
    return `smartedu-ltdt:outbox:v1:${this.userId}`;
  }

  private get base() {
    return this.apiBase.replace(/\/$/, "");
  }

  private async post(ev: LearningEvent): Promise<Response> {
    return fetch(`${this.base}/learning-events`, {
      method: "POST",
      headers: await authHeaders(this.authToken, { "Content-Type": "application/json" }),
      body: JSON.stringify(ev),
    });
  }

  async fetchProgress(): Promise<RemoteProgress | null> {
    try {
      const res = await fetch(`${this.base}/progress?user_id=${encodeURIComponent(this.userId)}`, {
        headers: await authHeaders(this.authToken),
      });
      if (!res.ok) return null;
      const body = (await res.json()) as { points_total?: unknown; levels?: unknown };
      if (typeof body.points_total !== "number" || typeof body.levels !== "object" || body.levels === null) return null;
      return { total: body.points_total, levels: body.levels as RemoteProgress["levels"] };
    } catch {
      return null;
    }
  }

  async submit(ev: LearningEvent): Promise<PointsResult> {
    await this.flush();
    try {
      const res = await this.post(ev);
      const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (res.status === 422 || res.status === 400) {
        return { status: "rejected", credited: 0, total: null, stars: 0, score: 0, reason: String(body.reason ?? "") };
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return {
        status: (body.status as PointsStatus) ?? "credited",
        credited: Number(body.credited ?? 0),
        total: typeof body.points_total === "number" ? body.points_total : null,
        stars: Number(body.stars ?? ev.stars),
        score: Number(body.score ?? ev.score),
      };
    } catch {
      const box = readJson<LearningEvent[]>(this.outboxKey, []);
      if (!box.some((e) => e.idempotency_key === ev.idempotency_key)) box.push(ev);
      writeJson(this.outboxKey, box);
      return { status: "queued", credited: 0, total: null, stars: ev.stars, score: ev.score };
    }
  }

  async flush(): Promise<void> {
    const box = readJson<LearningEvent[]>(this.outboxKey, []);
    if (!box.length) return;
    const left: LearningEvent[] = [];
    for (const ev of box) {
      try {
        const res = await this.post(ev);
        if (res.status >= 500) left.push(ev);
      } catch {
        left.push(ev);
      }
    }
    writeJson(this.outboxKey, left);
  }
}
