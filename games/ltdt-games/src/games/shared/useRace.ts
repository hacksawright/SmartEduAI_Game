import { useEffect, useRef, useState } from "react";

/** Máy trả lời một câu sau mỗi `seconds` giây; xong hết trước người chơi thì gọi onLose. */
export function useRace(active: boolean, seconds: number, total: number, onLose: () => void) {
  const [bot, setBot] = useState(0);
  const [nextIn, setNextIn] = useState(seconds);
  const loseRef = useRef(onLose);
  loseRef.current = onLose;

  useEffect(() => {
    if (!active) return;
    const t0 = performance.now();
    const id = window.setInterval(() => {
      const el = (performance.now() - t0) / 1000;
      const steps = Math.min(total, Math.floor(el / seconds));
      setBot(steps);
      setNextIn(Math.max(0, Math.ceil(seconds - (el % seconds))));
      if (steps >= total) {
        window.clearInterval(id);
        loseRef.current();
      }
    }, 200);
    return () => window.clearInterval(id);
  }, [active, seconds, total]);

  return { bot, nextIn };
}
