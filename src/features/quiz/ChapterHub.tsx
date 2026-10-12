import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarDays,
  Check,
  CircleDot,
  ClipboardList,
  Gamepad2,
  RotateCcw,
  TriangleAlert,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { GRAPH_CHAPTERS, type GraphChapter } from "@/lib/graph-chapters";
import { cn } from "@/lib/utils";
import { POINTS_PER_CORRECT, weekRangeLabel } from "@/lib/week";
import { chapterMaxPoints, weekPoints } from "./scoring";
import { StatusChip, focusRing, surface } from "./ui";

const WEEK_MAX = GRAPH_CHAPTERS.reduce((sum, chapter) => sum + chapterMaxPoints(chapter), 0);

export function ChapterHub({
  weekStart,
  best,
  loading,
  error,
  onRetry,
  onStart,
}: {
  weekStart: string;
  best: Record<string, number>;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  onStart: (chapterKey: string) => void;
}) {
  const total = weekPoints(best);
  const attempted = GRAPH_CHAPTERS.filter((chapter) => chapter.key in best).length;
  const perfect = GRAPH_CHAPTERS.filter(
    (chapter) => (best[chapter.key] ?? 0) === chapterMaxPoints(chapter),
  ).length;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 md:px-8 md:py-10">
      <header>
        <p className="flex items-center gap-2 text-sm font-semibold text-primary-strong">
          <ClipboardList className="size-4" aria-hidden /> Luyện tập · Lý thuyết đồ thị
        </p>
        <h1 className="mt-1 text-2xl font-bold md:text-3xl">Luyện theo chương</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Mỗi chương 5 câu, mỗi câu đúng được {POINTS_PER_CORRECT} điểm. Trong tuần, mỗi chương chỉ
          lấy lần điểm cao nhất, rồi cộng lại để xếp hạng.
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-2xl border border-danger-strong/30 bg-danger-soft p-4 sm:flex-row sm:items-center"
        >
          <TriangleAlert className="size-5 shrink-0 text-danger-strong" aria-hidden />
          <div className="flex-1 text-sm">
            <p className="font-semibold text-danger-strong">Chưa đọc được điểm tuần</p>
            <p className="mt-0.5">
              Bảng điểm tuần chưa có trên Supabase. Chạy file migration trong thư mục
              supabase/migrations, rồi làm lại bài.
            </p>
          </div>
          <Button variant="outline" className="min-h-11 gap-2 bg-card" onClick={onRetry}>
            <RotateCcw aria-hidden /> Thử lại
          </Button>
        </div>
      )}

      <section aria-labelledby="week-score-title" className={cn(surface, "p-5 md:p-6")}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 id="week-score-title" className="text-sm font-semibold text-muted-foreground">
              Điểm tuần của bạn
            </h2>
            <div className="mt-1 flex items-baseline gap-2">
              {loading ? (
                <Skeleton className="h-12 w-24" />
              ) : (
                <span
                  className="text-5xl font-extrabold tracking-tight tabular-nums"
                  data-testid="week-points"
                >
                  {total}
                </span>
              )}
              <span className="text-base font-semibold text-muted-foreground tabular-nums">
                / {WEEK_MAX} điểm
              </span>
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarDays className="size-3.5" aria-hidden />
              Tuần {weekRangeLabel(weekStart)} · bảng xếp hạng đặt lại vào thứ Hai
            </p>
          </div>
          <Link
            to="/leaderboard"
            className={cn(
              "inline-flex min-h-11 items-center gap-2 rounded-xl border border-gold/50 bg-gold-soft px-4 text-sm font-semibold text-gold-strong transition-colors hover:bg-gold/15",
              focusRing,
            )}
          >
            <Trophy className="size-4" aria-hidden /> Xem bảng xếp hạng
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-8 gap-1.5" aria-hidden>
          {GRAPH_CHAPTERS.map((chapter) => {
            const value = best[chapter.key] ?? 0;
            const max = chapterMaxPoints(chapter);
            return (
              <div key={chapter.key} className="h-2.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-[width] duration-500",
                    value === max ? "bg-success" : "bg-primary",
                  )}
                  style={{ width: `${(value / max) * 100}%` }}
                />
              </div>
            );
          })}
        </div>

        <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Đã làm</dt>
            <dd className="font-bold tabular-nums">
              {attempted}/{GRAPH_CHAPTERS.length} chương
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Đạt tối đa</dt>
            <dd className="font-bold tabular-nums">
              {perfect}/{GRAPH_CHAPTERS.length} chương
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Mỗi câu đúng</dt>
            <dd className="font-bold tabular-nums">+{POINTS_PER_CORRECT} điểm</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="chapters-title">
        <h2 id="chapters-title" className="sr-only">
          Danh sách chương
        </h2>
        <ul className="grid gap-3 md:grid-cols-2">
          {GRAPH_CHAPTERS.map((chapter) => (
            <li key={chapter.key}>
              <ChapterCard
                chapter={chapter}
                best={best[chapter.key]}
                loading={loading}
                onStart={() => onStart(chapter.key)}
              />
            </li>
          ))}
        </ul>
      </section>

      <aside className="flex flex-col gap-3 rounded-2xl border border-dashed border-primary/30 bg-primary-soft/50 p-4 sm:flex-row sm:items-center">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-card text-primary-strong">
          <Gamepad2 className="size-5" aria-hidden />
        </div>
        <p className="flex-1 text-sm">
          <span className="font-semibold">Muốn học bằng trò chơi?</span> Trò chơi đồ thị chấm điểm
          riêng, không cộng vào điểm tuần và bảng xếp hạng này.
        </p>
        <Link
          to="/games"
          className={cn(
            "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-card px-4 text-sm font-semibold text-primary-strong shadow-[var(--shadow-soft)] transition-colors hover:bg-primary-soft",
            focusRing,
          )}
        >
          Mở Trò chơi <ArrowRight className="size-4" aria-hidden />
        </Link>
      </aside>
    </div>
  );
}

function ChapterCard({
  chapter,
  best,
  loading,
  onStart,
}: {
  chapter: GraphChapter;
  best: number | undefined;
  loading: boolean;
  onStart: () => void;
}) {
  const max = chapterMaxPoints(chapter);
  const value = best ?? 0;
  const attempted = best !== undefined;
  const isPerfect = value === max;

  return (
    <button
      type="button"
      onClick={onStart}
      className={cn(
        "group flex h-full w-full cursor-pointer flex-col rounded-2xl border border-border bg-card p-5 text-left shadow-[var(--shadow-soft)] transition-[border-color,box-shadow] duration-150 hover:border-primary hover:shadow-[var(--shadow-card)]",
        focusRing,
      )}
    >
      <div className="flex w-full items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-sm font-bold text-primary-strong tabular-nums">
          {String(chapter.order).padStart(2, "0")}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-muted-foreground">
            Chương {chapter.order} · {chapter.questions.length} câu
          </p>
          <h3 className="mt-0.5 font-bold leading-snug">{chapter.title}</h3>
        </div>
        {loading ? (
          <Skeleton className="h-6 w-16 rounded-full" />
        ) : isPerfect ? (
          <StatusChip tone="success" icon={Check}>
            Tối đa
          </StatusChip>
        ) : attempted ? (
          <StatusChip tone="primary" icon={CircleDot}>
            Đã làm
          </StatusChip>
        ) : (
          <StatusChip tone="muted">Chưa làm</StatusChip>
        )}
      </div>

      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{chapter.summary}</p>

      <div className="mt-auto w-full pt-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Cao nhất tuần này</span>
          {loading ? (
            <Skeleton className="h-4 w-12" />
          ) : (
            <span className="font-bold tabular-nums">
              {value}/{max} điểm
            </span>
          )}
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-500",
              isPerfect ? "bg-success" : "bg-primary",
            )}
            style={{ width: `${(value / max) * 100}%` }}
          />
        </div>
        <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary-strong">
          {attempted ? "Làm lại" : "Bắt đầu"}
          <ArrowRight
            className="size-4 transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none"
            aria-hidden
          />
        </span>
      </div>
    </button>
  );
}
