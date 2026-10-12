// Phiên chơi một màn: giới thiệu → chơi → thắng/thua; gợi ý (trừ sao, hỏi xác nhận lần đầu),
// đo lường (bắt đầu, dùng gợi ý, thua, bỏ dở) và gửi kết quả. Dùng chung cho mọi game.

import { useCallback, useEffect, useRef, useState } from "react";
import { useGames, type CompletionResult } from "../../app/GamesContext";
import type { Hint } from "../../core/engines/types";
import type { Level } from "../../core/levels/types";
import type { Submission } from "../../core/verify";
import { bestStars } from "../../services/progress";

export type SessionPhase = "intro" | "play" | "won" | "failed";

export interface HintCardState extends Hint {
  level: 1 | 2;
  /** gợi ý gắn với một bước cụ thể; sang bước khác thì ẩn */
  stepKey: string;
  loading: boolean;
}

export interface LevelSession {
  level: Level;
  levelId: string;
  race: boolean;
  phase: SessionPhase;
  hints: number;
  begin(): void;
  /** gợi ý đang hiện cho bước này (nếu có) */
  hintFor(stepKey: string): HintCardState | null;
  canHint(stepKey: string): boolean;
  requestHint(stepKey: string, getHint: (lvl: 1 | 2) => Hint, stateDesc: string): void;
  confirmOpen: boolean;
  confirmHint(): void;
  cancelHint(): void;
  complete(make: (hints: number) => Submission): Promise<void>;
  fail(reason: string, detail?: Record<string, unknown>): void;
  result: CompletionResult | null;
  failReason: string | null;
  elapsedMs(): number;
}

export function useLevelSession(level: Level, levelId: string, race: boolean): LevelSession {
  const g = useGames();
  const [phase, setPhase] = useState<SessionPhase>("intro");
  const [hints, setHints] = useState(0);
  const [hint, setHint] = useState<HintCardState | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<CompletionResult | null>(null);
  const [failReason, setFailReason] = useState<string | null>(null);

  const phaseRef = useRef<SessionPhase>(phase);
  const hintsRef = useRef(0);
  const startedAt = useRef(0);
  const confirmed = useRef(false);
  const pending = useRef<null | (() => void)>(null);

  const base = { chapter_id: level.chapter, game_id: level.game, level_id: levelId, race };
  const baseRef = useRef(base);
  baseRef.current = base;

  const elapsedMs = useCallback(() => (startedAt.current ? performance.now() - startedAt.current : 0), []);

  const setPhaseBoth = (p: SessionPhase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  // Bỏ dở: rời trang hoặc rời màn khi đang chơi
  const { track } = g;
  useEffect(() => {
    const onHide = () => {
      if (phaseRef.current === "play") {
        track("game_level_abandoned", { ...baseRef.current, duration_ms: Math.round(elapsedMs()), hints_used: hintsRef.current });
      }
    };
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      onHide();
    };
  }, [track, elapsedMs]);

  const begin = () => {
    if (phaseRef.current !== "intro") return;
    startedAt.current = performance.now();
    setPhaseBoth("play");
    g.startLevel(levelId);
    g.markTutorialSeen(level.game);
    g.track("game_level_started", { ...base, is_voluntary_replay: bestStars(g.progress, levelId) === 3 });
  };

  const nextLevelFor = (stepKey: string): 1 | 2 | null => {
    if (!hint || hint.stepKey !== stepKey) return 1;
    return hint.level === 1 ? 2 : null;
  };

  const requestHint = (stepKey: string, getHint: (lvl: 1 | 2) => Hint, stateDesc: string) => {
    if (phaseRef.current !== "play") return;
    const lvl = nextLevelFor(stepKey);
    if (!lvl) return;
    const run = () => {
      hintsRef.current += 1;
      setHints(hintsRef.current);
      g.play("hint");
      const fallback = getHint(lvl);
      const remote = !!g.config.hintEndpoint;
      setHint({ ...fallback, level: lvl, stepKey, loading: remote });
      g.track("game_hint_used", { ...base, hint_level: lvl, hints_used: hintsRef.current });
      if (remote) {
        void g.hints
          .getHint({
            courseId: g.config.courseId,
            chapterId: level.chapter,
            gameId: level.game,
            levelId,
            hintLevel: lvl,
            state: stateDesc,
            fallback,
          })
          .then((h) =>
            setHint((cur) => (cur && cur.stepKey === stepKey && cur.level === lvl ? { ...cur, text: h.text, loading: false } : cur)),
          );
      }
    };
    if (!confirmed.current) {
      pending.current = run;
      setConfirmOpen(true);
    } else run();
  };

  const confirmHint = () => {
    confirmed.current = true;
    setConfirmOpen(false);
    const run = pending.current;
    pending.current = null;
    run?.();
  };

  const cancelHint = () => {
    pending.current = null;
    setConfirmOpen(false);
  };

  const complete = async (make: (hints: number) => Submission) => {
    if (phaseRef.current !== "play") return;
    phaseRef.current = "won";
    const durationMs = elapsedMs();
    const res = await g.completeLevel({ level, levelId, submission: make(hintsRef.current), durationMs, hints: hintsRef.current });
    if (!res.ok) {
      // không xảy ra nếu client và bộ chấm khớp nhau; vẫn báo rõ thay vì im lặng
      g.toast(`Không ghi nhận được kết quả: ${res.reason ?? "lỗi không rõ"}`, "error");
      phaseRef.current = "play";
      return;
    }
    setResult(res);
    setPhase("won");
    g.play("win");
    g.celebrate();
    if (res.badges.length) {
      window.setTimeout(() => g.play("badge"), 1400);
      for (const b of res.badges) g.toast(`Huy hiệu mới: ${b.title}`, "success");
    }
  };

  const fail = (reason: string, detail: Record<string, unknown> = {}) => {
    if (phaseRef.current !== "play") return;
    setFailReason(reason);
    setPhaseBoth("failed");
    g.play("fail");
    g.track("game_level_failed", {
      ...base,
      reason,
      duration_ms: Math.round(elapsedMs()),
      hints_used: hintsRef.current,
      ...detail,
    });
  };

  return {
    level,
    levelId,
    race,
    phase,
    hints,
    begin,
    hintFor: (k) => (hint && hint.stepKey === k ? hint : null),
    canHint: (k) => phase === "play" && nextLevelFor(k) !== null,
    requestHint,
    confirmOpen,
    confirmHint,
    cancelHint,
    complete,
    fail,
    result,
    failReason,
    elapsedMs,
  };
}
