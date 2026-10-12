import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import {
  Check,
  CircleAlert,
  Info,
  LayoutGrid,
  LoaderCircle,
  RotateCcw,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GraphChapter, QuizQuestion } from "@/lib/graph-chapters";
import { cn } from "@/lib/utils";
import { isCountedForWeek } from "./scoring";
import { ScoreRing, StatusChip, focusRing, surface } from "./ui";

export interface AnswerRecord {
  question: QuizQuestion;
  chosen: string;
  correct: boolean;
}

function headline(correct: number, total: number): string {
  if (correct === total) return "Xuất sắc! Trọn điểm chương này";
  if (correct / total >= 0.6) return "Làm tốt lắm!";
  if (correct > 0) return "Có tiến bộ, thử thêm lần nữa nhé";
  return "Chưa đúng câu nào, xem lại giải thích bên dưới nhé";
}

export function QuizResult({
  chapter,
  correctCount,
  savedPoints,
  maxPoints,
  previousBest,
  bestAtSubmit,
  xp,
  saving,
  saveError,
  canRestart,
  history,
  onExit,
  onRestart,
}: {
  chapter: GraphChapter;
  correctCount: number;
  savedPoints: number;
  maxPoints: number;
  /** Điểm cao nhất trong tuần của chương; sau khi lưu, đã gồm cả lần làm này (như trước đây). */
  previousBest: number;
  /** Điểm cao nhất của chương ngay trước lần làm này. */
  bestAtSubmit: number;
  xp: number;
  saving: boolean;
  saveError: boolean;
  canRestart: boolean;
  history: AnswerRecord[];
  onExit: () => void;
  onRestart: () => void;
}) {
  const reduce = useReducedMotion();
  const total = chapter.questions.length;
  const perfect = savedPoints === maxPoints;
  const counted = isCountedForWeek(savedPoints, previousBest);

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-6 md:px-8 md:py-10">
      <motion.section
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className={cn(surface, "overflow-hidden text-center")}
        aria-labelledby="result-title"
      >
        <div
          className={cn(
            "px-5 pb-6 pt-7 md:px-8",
            perfect ? "bg-gold-soft" : "bg-gradient-to-b from-primary-soft to-card",
          )}
        >
          <p className="text-sm font-semibold text-muted-foreground">
            Chương {chapter.order} · {chapter.title}
          </p>
          <h1 id="result-title" className="mt-1 text-2xl font-bold md:text-3xl">
            {headline(correctCount, total)}
          </h1>

          <div className="mt-5">
            <ScoreRing value={savedPoints} max={maxPoints} tone={perfect ? "gold" : "primary"}>
              <span
                className="text-5xl font-extrabold tracking-tight tabular-nums"
                data-testid="result-points"
              >
                {savedPoints}
              </span>
              <span className="text-sm font-medium text-muted-foreground tabular-nums">
                / {maxPoints} điểm
              </span>
            </ScoreRing>
          </div>

          <dl className="mx-auto mt-5 grid max-w-sm grid-cols-3 gap-2 text-sm">
            <div className="rounded-2xl bg-card/80 px-2 py-2.5">
              <dt className="text-xs text-muted-foreground">Câu đúng</dt>
              <dd className="font-bold tabular-nums">
                {correctCount}/{total}
              </dd>
            </div>
            <div className="rounded-2xl bg-card/80 px-2 py-2.5">
              <dt className="text-xs text-muted-foreground">Cao nhất cũ</dt>
              <dd className="font-bold tabular-nums">{bestAtSubmit}</dd>
            </div>
            <div className="rounded-2xl bg-card/80 px-2 py-2.5">
              <dt className="text-xs text-muted-foreground">XP nhận</dt>
              <dd className="font-bold tabular-nums">{saveError ? 0 : xp}</dd>
            </div>
          </dl>
        </div>

        <div className="border-t border-border px-5 py-4 md:px-8" role="status" aria-live="polite">
          {saving ? (
            <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 motion-safe:animate-spin" aria-hidden /> Đang lưu
              điểm...
            </p>
          ) : saveError ? (
            <p className="flex items-start justify-center gap-2 text-sm font-medium text-danger-strong">
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              Điểm chưa được lưu. Chạy migration trong Supabase rồi làm lại chương này.
            </p>
          ) : counted ? (
            <div className="flex flex-col items-center justify-center gap-2 text-sm font-medium text-success-strong sm:flex-row">
              <p className="flex items-start gap-2 text-left">
                <Check className="mt-0.5 size-4 shrink-0" aria-hidden />
                Điểm này được tính vào bảng xếp hạng tuần.
              </p>
              {xp > 0 && (
                <StatusChip tone="gold" icon={Sparkles}>
                  +{xp} XP
                </StatusChip>
              )}
            </div>
          ) : (
            <p className="flex items-start justify-center gap-2 text-sm text-muted-foreground">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
              Điểm cao nhất tuần này của chương vẫn là {previousBest}.
            </p>
          )}
        </div>

        <div className="grid gap-2 border-t border-border px-5 py-4 sm:grid-cols-2 md:px-8">
          <Button
            onClick={onRestart}
            disabled={!canRestart}
            className={cn("h-12 gap-2 rounded-xl text-base font-semibold sm:col-span-2", focusRing)}
          >
            <RotateCcw aria-hidden /> Làm lại chương
          </Button>
          <Button
            variant="outline"
            onClick={onExit}
            className={cn("h-12 gap-2 rounded-xl text-base font-semibold", focusRing)}
          >
            <LayoutGrid aria-hidden /> Chọn chương khác
          </Button>
          <Button
            asChild
            variant="outline"
            className={cn(
              "h-12 gap-2 rounded-xl border-gold/50 bg-gold-soft text-base font-semibold text-gold-strong hover:bg-gold/15 hover:text-gold-strong",
              focusRing,
            )}
          >
            <Link to="/leaderboard">
              <Trophy aria-hidden /> Xem bảng xếp hạng
            </Link>
          </Button>
        </div>
      </motion.section>

      {history.length > 0 && (
        <section aria-labelledby="review-title" className={cn(surface, "p-5 md:p-6")}>
          <h2 id="review-title" className="text-lg font-bold">
            Xem lại bài làm
          </h2>
          <ol className="mt-3 space-y-2.5">
            {history.map((record, i) => (
              <li
                key={record.question.id}
                className="flex gap-3 rounded-2xl border border-border p-3.5"
              >
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full text-white",
                    record.correct ? "bg-success-strong" : "bg-danger-strong",
                  )}
                  aria-hidden
                >
                  {record.correct ? <Check className="size-4" /> : <X className="size-4" />}
                </span>
                <div className="min-w-0 text-sm">
                  <p className="font-semibold">
                    <span className="sr-only">{record.correct ? "Đúng. " : "Sai. "}</span>
                    Câu {i + 1}. {record.question.prompt}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    Bạn chọn:{" "}
                    <span
                      className={cn(
                        "font-medium",
                        record.correct ? "text-success-strong" : "text-danger-strong",
                      )}
                    >
                      {record.chosen}
                    </span>
                  </p>
                  {!record.correct && (
                    <>
                      <p className="mt-0.5 text-muted-foreground">
                        Đáp án đúng:{" "}
                        <span className="font-medium text-foreground">
                          {record.question.answer}
                        </span>
                      </p>
                      <p className="mt-1.5 rounded-xl bg-muted px-3 py-2 text-foreground/80">
                        {record.question.explanation}
                      </p>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
