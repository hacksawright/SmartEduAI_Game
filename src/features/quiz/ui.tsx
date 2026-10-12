// Thành phần giao diện dùng chung của Luyện tập và Bảng xếp hạng
// (design-system/smartedu-quiz/MASTER.md).
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/** Viền focus 3px màu primary (5.2:1 trên nền trắng), cách phần tử 2px. */
export const focusRing =
  "outline-none focus-visible:ring-[3px] focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** Thẻ nội dung chuẩn của Quiz: nền trắng, viền nhạt, bo 24px. */
export const surface = "rounded-3xl border border-border bg-card shadow-[var(--shadow-soft)]";

export function ScoreRing({
  value,
  max,
  tone = "primary",
  size = 168,
  children,
}: {
  value: number;
  max: number;
  tone?: "primary" | "gold";
  size?: number;
  children?: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const offset = circumference * (1 - ratio);
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden>
        <circle cx="60" cy="60" r={radius} fill="none" strokeWidth="10" className="stroke-muted" />
        <motion.circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: reduce ? offset : circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: reduce ? 0 : 0.8, ease: [0.22, 1, 0.36, 1] }}
          className={tone === "gold" ? "stroke-gold" : "stroke-primary"}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

export function StatusChip({
  tone,
  icon: Icon,
  children,
  className,
}: {
  tone: "muted" | "primary" | "success" | "danger" | "gold";
  icon?: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  children: React.ReactNode;
  className?: string;
}) {
  const tones = {
    muted: "bg-muted text-muted-foreground",
    primary: "bg-primary-soft text-primary-strong",
    success: "bg-success-soft text-success-strong",
    danger: "bg-danger-soft text-danger-strong",
    gold: "bg-gold-soft text-gold-strong",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
        tones[tone],
        className,
      )}
    >
      {Icon && <Icon className="size-3.5" aria-hidden />}
      {children}
    </span>
  );
}
