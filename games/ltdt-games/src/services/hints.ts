// HintProvider: gợi ý tĩnh (mặc định) hoặc gọi chatbot Socratic của TV5 (GDD 2.5, câu hỏi mở 3).
// Bản remote chỉ thay phần chữ; phần tô sáng trên đồ thị luôn lấy từ gợi ý tĩnh.

import type { Hint } from "../core/engines/types";
import { authHeaders, type TokenGetter } from "./http";

export interface HintRequest {
  courseId: string;
  chapterId: string;
  gameId: string;
  levelId: string;
  hintLevel: 1 | 2;
  /** mô tả ngắn trạng thái hiện tại để chatbot hỏi đúng chỗ */
  state: string;
  fallback: Hint;
}

export interface HintProvider {
  getHint(req: HintRequest): Promise<Hint>;
}

export class StaticHintProvider implements HintProvider {
  async getHint(req: HintRequest): Promise<Hint> {
    return req.fallback;
  }
}

export class SocraticHintProvider implements HintProvider {
  constructor(
    private readonly endpoint: string,
    private readonly authToken?: TokenGetter,
    private readonly timeoutMs = 4000,
  ) {}

  async getHint(req: HintRequest): Promise<Hint> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this.timeoutMs);
    try {
      const res = await fetch(this.endpoint, {
        method: "POST",
        headers: await authHeaders(this.authToken, { "Content-Type": "application/json" }),
        signal: ctrl.signal,
        body: JSON.stringify({
          mode: "socratic",
          course_id: req.courseId,
          chapter_id: req.chapterId,
          game_id: req.gameId,
          level_id: req.levelId,
          hint_level: req.hintLevel,
          state: req.state,
          // gợi ý tĩnh để chatbot bám theo, tránh lộ đáp án
          reference_hint: req.fallback.text,
        }),
      });
      if (!res.ok) return req.fallback;
      const body = (await res.json()) as { text?: string };
      return body.text ? { ...req.fallback, text: body.text } : req.fallback;
    } catch {
      return req.fallback;
    } finally {
      clearTimeout(timer);
    }
  }
}
