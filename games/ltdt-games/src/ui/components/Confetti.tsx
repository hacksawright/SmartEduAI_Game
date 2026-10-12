import { useEffect, useRef } from "react";

const COLORS = ["#0D9488", "#EA580C", "#FDE68A", "#2DD4BF", "#F59E0B"];
const COUNT = 80;
const DURATION = 1800;

interface Bit {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  w: number;
  h: number;
  color: string;
}

/** Pháo giấy khi thắng màn (≤ 80 hạt, tự dọn sau 1.8 giây; tắt khi giảm chuyển động). */
export function Confetti({ trigger, reduced }: { trigger: number; reduced: boolean }) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!trigger || reduced || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = window.innerWidth;
    const H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const bits: Bit[] = Array.from({ length: COUNT }, (_, i) => {
      const fromLeft = i % 2 === 0;
      const angle = (fromLeft ? -60 : -120) * (Math.PI / 180) + (Math.random() - 0.5) * 0.9;
      const speed = 9 + Math.random() * 7;
      return {
        x: fromLeft ? W * 0.18 : W * 0.82,
        y: H * 0.72,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.35,
        w: 6 + Math.random() * 6,
        h: 8 + Math.random() * 8,
        color: COLORS[i % COLORS.length],
      };
    });

    let raf = 0;
    const t0 = performance.now();
    let last = t0;
    const frame = (now: number) => {
      const dt = Math.min(2.5, (now - last) / 16.67);
      last = now;
      const t = now - t0;
      ctx.clearRect(0, 0, W, H);
      const fade = t > DURATION - 400 ? Math.max(0, (DURATION - t) / 400) : 1;
      for (const b of bits) {
        b.vy += 0.32 * dt;
        b.vx *= 0.99;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.rot += b.vr * dt;
        ctx.save();
        ctx.globalAlpha = fade;
        ctx.translate(b.x, b.y);
        ctx.rotate(b.rot);
        ctx.fillStyle = b.color;
        ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h * Math.abs(Math.cos(b.rot * 1.7)) + 2);
        ctx.restore();
      }
      if (t < DURATION) raf = requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, W, H);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ctx.clearRect(0, 0, W, H);
    };
  }, [trigger, reduced]);

  return <canvas ref={ref} className="lg-confetti" aria-hidden="true" />;
}
