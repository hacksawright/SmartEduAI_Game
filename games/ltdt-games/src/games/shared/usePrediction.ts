// Vòng lặp "dự đoán → kiểm tra → chạy bước" dùng chung cho BFS, DFS và Dijkstra (mục 4.1 kế hoạch).
// Sai: mất mạng, hiện giải thích; "Tiếp tục" mới chạy bước đúng (giống hệt verifySubmission).

import { useRef, useState } from "react";
import { useGames } from "../../app/GamesContext";
import type { PredictionEngine } from "../../core/engines/types";
import { MAX_LIVES } from "../../core/verify";
import type { FeedbackState } from "./Prompt";
import type { LevelSession } from "./session";

export interface PredictionOptions<S, A> {
  /** câu ngắn sau khi trả lời đúng */
  describe?: (prev: S, next: S, a: A) => string | undefined;
  /** gọi mỗi khi một bước được thực thi (đúng, hoặc sau "Tiếp tục") để chạy hiệu ứng */
  onApply?: (prev: S, next: S, a: A) => void;
  /** dựng bài làm gửi đi */
  submit: (answers: A[]) => void;
}

export function usePrediction<S, A>(engine: PredictionEngine<S, A>, session: LevelSession, opts: PredictionOptions<S, A>) {
  const g = useGames();
  const [s, setS] = useState<S>(() => engine.init());
  const [answers, setAnswers] = useState<A[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [fb, setFb] = useState<FeedbackState>({ kind: "none" });
  const [pending, setPending] = useState<A | null>(null);
  const [streak, setStreak] = useState(0);
  const [shake, setShake] = useState(0);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const done = engine.isDone(s);
  const locked = session.phase !== "play" || pending !== null || done;

  const applyStep = (prev: S, a: A, log: A[]) => {
    const next = engine.apply(prev, a);
    setS(next);
    optsRef.current.onApply?.(prev, next, a);
    if (engine.isDone(next)) optsRef.current.submit(log);
    return next;
  };

  const answer = (a: A) => {
    if (locked) return;
    const v = engine.check(s, a);
    const log = [...answers, a];
    setAnswers(log);
    if (v.correct) {
      g.play("correct", { rate: 1 + Math.min(streak, 6) * 0.04 });
      setStreak((k) => k + 1);
      const next = applyStep(s, v.expected, log);
      setFb({ kind: "ok", text: optsRef.current.describe?.(s, next, v.expected) });
    } else {
      const m = mistakes + 1;
      setMistakes(m);
      setStreak(0);
      setShake((x) => x + 1);
      setPending(v.expected);
      setFb({ kind: "bad", text: v.explain });
      g.play("wrong");
      if (m >= MAX_LIVES) g.play("fail", { gain: 0.6 });
    }
  };

  /** sau khi đọc giải thích: chạy bước đúng (hoặc kết thúc khi hết mạng) */
  const proceed = () => {
    if (pending === null) return;
    if (mistakes >= MAX_LIVES) {
      session.fail("Bạn đã sai 3 lần trong màn này.", { mistakes });
      return;
    }
    const a = pending;
    setPending(null);
    setFb({ kind: "none" });
    applyStep(s, a, answers);
  };

  return {
    s,
    answers,
    mistakes,
    lives: Math.max(0, MAX_LIVES - mistakes),
    fb,
    pending,
    streak,
    shake,
    locked,
    done,
    answer,
    proceed,
    /** ẩn phản hồi "Đúng" khi người chơi bắt đầu thao tác mới */
    clearOk: () => setFb((f) => (f.kind === "ok" ? { kind: "none" } : f)),
  };
}
