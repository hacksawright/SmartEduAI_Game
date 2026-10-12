import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  CalendarDays,
  ClipboardList,
  Crown,
  Gamepad2,
  Gift,
  RotateCcw,
  TrendingUp,
  TriangleAlert,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { GRAPH_CHAPTERS } from "@/lib/graph-chapters";
import { getLevelTitle } from "@/lib/math-utils";
import { cn } from "@/lib/utils";
import { DEFAULT_WEEKLY_PRIZE, displayName, weekRangeLabel } from "@/lib/week";
import type { WeeklyLeaderboard } from "./api";
import { gapToNextRank, initialOf, rankingWindow, type RankedStudent } from "./scoring";
import { StatusChip, focusRing, surface } from "./ui";

const TOP_LIMIT = 20;

export function LeaderboardView({
  weekStart,
  data,
  userId,
  loading,
  error,
  onRetry,
}: {
  weekStart: string;
  data: WeeklyLeaderboard | undefined;
  userId: string | undefined;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  const ranking = data?.ranking ?? [];
  const myIdx = ranking.findIndex((student) => student.id === userId);
  const top3 = ranking.slice(0, 3);
  const myWindow = rankingWindow(ranking, myIdx);
  const leader = ranking[0];

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 md:px-8 md:py-10">
      <header>
        <p className="flex items-center gap-2 text-sm font-semibold text-gold-strong">
          <Trophy className="size-4" aria-hidden /> Bảng xếp hạng · Luyện tập
        </p>
        <h1 className="mt-1 text-2xl font-bold md:text-3xl">Bảng xếp hạng tuần</h1>
        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-4" aria-hidden /> Tuần {weekRangeLabel(weekStart)}.
          </span>
          <span>Điểm là tổng điểm cao nhất của từng chương. Reset vào thứ Hai.</span>
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
            <p className="mt-0.5 break-words">
              Hãy chạy file migration{" "}
              <code className="rounded bg-card px-1 py-0.5 text-xs">
                supabase/migrations/20261011090000_chapter_quiz_weekly.sql
              </code>{" "}
              trong SQL Editor của Supabase.
            </p>
          </div>
          <Button variant="outline" className="min-h-11 gap-2 bg-card" onClick={onRetry}>
            <RotateCcw aria-hidden /> Thử lại
          </Button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-5">
        <MyRankCard className="md:col-span-3" loading={loading} ranking={ranking} myIdx={myIdx} />
        <section
          aria-labelledby="prize-title"
          className="flex gap-3 rounded-3xl border border-gold/40 bg-gold-soft p-5 md:col-span-2"
        >
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gold text-foreground">
            <Gift className="size-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 id="prize-title" className="font-bold">
              {data?.prizeTitle ?? "Giải tuần"}
            </h2>
            <p className="mt-1 text-sm text-foreground/80">
              {data?.prizeDescription ?? DEFAULT_WEEKLY_PRIZE}
            </p>
            {leader && (
              <p className="mt-2 text-sm">
                Đang dẫn đầu: <span className="font-semibold">{displayName(leader.full_name)}</span>{" "}
                với <span className="font-semibold tabular-nums">{leader.points}</span> điểm.
              </p>
            )}
          </div>
        </section>
      </div>

      {top3.length >= 3 && <Podium top3={top3} userId={userId} />}

      {myWindow.length > 0 && (
        <section aria-labelledby="window-title" className={cn(surface, "overflow-hidden")}>
          <h2
            id="window-title"
            className="border-b border-border bg-muted/60 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Quanh vị trí của bạn
          </h2>
          <ol className="divide-y divide-border">
            {myWindow.map(({ student, rank }) => (
              <RankRow
                key={student.id}
                student={student}
                rank={rank}
                isMe={student.id === userId}
              />
            ))}
          </ol>
        </section>
      )}

      <section aria-labelledby="top-title" className={cn(surface, "overflow-hidden")}>
        <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/60 px-5 py-3">
          <h2
            id="top-title"
            className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Top tuần này · {GRAPH_CHAPTERS.length} chương
          </h2>
          {ranking.length > 0 && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {ranking.length} người tham gia
            </span>
          )}
        </div>
        {loading ? (
          <div
            className="divide-y divide-border"
            aria-busy="true"
            aria-label="Đang tải bảng xếp hạng"
          >
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3.5">
                <Skeleton className="size-9 rounded-xl" />
                <Skeleton className="size-10 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
                <Skeleton className="h-6 w-12" />
              </div>
            ))}
          </div>
        ) : ranking.length > 0 ? (
          <ol className="divide-y divide-border">
            {ranking.slice(0, TOP_LIMIT).map((student, index) => (
              <RankRow
                key={student.id}
                student={student}
                rank={index + 1}
                isMe={student.id === userId}
              />
            ))}
          </ol>
        ) : (
          !error && (
            <div className="flex flex-col items-center px-6 py-12 text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-gold-soft text-gold-strong">
                <Trophy className="size-7" aria-hidden />
              </div>
              <p className="mt-4 font-semibold">Chưa có điểm nào trong tuần này</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Hãy làm bài ở mục Luyện tập. Người đầu tiên hoàn thành một chương sẽ đứng đầu bảng.
              </p>
              <Button asChild className={cn("mt-5 h-11 gap-2 rounded-xl px-5", focusRing)}>
                <Link to="/practice">
                  <ClipboardList aria-hidden /> Làm bài Luyện tập
                </Link>
              </Button>
            </div>
          )
        )}
      </section>

      <p className="flex items-start gap-2 text-sm text-muted-foreground">
        <Gamepad2 className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>
          Bảng này chỉ tính điểm Luyện tập theo chương. Điểm và huy hiệu của{" "}
          <Link
            to="/games"
            className={cn(
              "font-semibold text-primary-strong underline-offset-4 hover:underline",
              focusRing,
              "rounded",
            )}
          >
            Trò chơi đồ thị
          </Link>{" "}
          được tính riêng, không cộng vào đây.
        </span>
      </p>
    </div>
  );
}

function MyRankCard({
  ranking,
  myIdx,
  loading,
  className,
}: {
  ranking: RankedStudent[];
  myIdx: number;
  loading: boolean;
  className?: string;
}) {
  if (loading) {
    return (
      <section className={cn(surface, "p-5", className)} aria-busy="true">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-3 h-10 w-32" />
        <Skeleton className="mt-3 h-4 w-56" />
      </section>
    );
  }

  if (myIdx < 0) {
    return (
      <section
        aria-labelledby="my-rank-title"
        className={cn(
          surface,
          "flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center",
          className,
        )}
      >
        <div>
          <h2 id="my-rank-title" className="text-sm font-semibold text-muted-foreground">
            Hạng của bạn
          </h2>
          <p className="mt-1 text-lg font-bold">Bạn chưa có điểm tuần này</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Làm một chương bất kỳ để có tên trên bảng.
          </p>
        </div>
        <Button asChild className={cn("h-11 shrink-0 gap-2 rounded-xl px-5", focusRing)}>
          <Link to="/practice">
            Luyện tập ngay <ArrowRight aria-hidden />
          </Link>
        </Button>
      </section>
    );
  }

  const me = ranking[myIdx];
  const gap = gapToNextRank(ranking, myIdx);
  return (
    <section
      aria-labelledby="my-rank-title"
      className={cn(surface, "border-primary/30 bg-primary-soft/60 p-5", className)}
      data-testid="my-rank"
    >
      <h2 id="my-rank-title" className="text-sm font-semibold text-primary-strong">
        Hạng của bạn
      </h2>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="text-4xl font-extrabold tracking-tight tabular-nums">#{myIdx + 1}</span>
        <span className="text-lg font-bold tabular-nums">{me.points} điểm</span>
        <span className="text-sm text-muted-foreground tabular-nums">
          {me.chaptersDone}/{GRAPH_CHAPTERS.length} chương có điểm
        </span>
      </div>
      <p className="mt-3 flex items-start gap-2 text-sm">
        {gap === null ? (
          <>
            <Crown className="mt-0.5 size-4 shrink-0 text-gold-strong" aria-hidden />
            <span>Bạn đang dẫn đầu tuần này. Giữ vững nhé!</span>
          </>
        ) : gap.gap > 0 ? (
          <>
            <TrendingUp className="mt-0.5 size-4 shrink-0 text-primary-strong" aria-hidden />
            <span>
              Còn <span className="font-semibold tabular-nums">{gap.gap}</span> điểm nữa là bằng{" "}
              <span className="font-semibold">{displayName(gap.above.full_name)}</span> (hạng #
              {gap.rank}).
            </span>
          </>
        ) : (
          <>
            <TrendingUp className="mt-0.5 size-4 shrink-0 text-primary-strong" aria-hidden />
            <span>
              Bằng điểm với{" "}
              <span className="font-semibold">{displayName(gap.above.full_name)}</span> (hạng #
              {gap.rank}); bằng điểm thì xếp theo tên.
            </span>
          </>
        )}
      </p>
    </section>
  );
}

const MEDALS = {
  1: { block: "bg-gold text-foreground", ring: "ring-gold", height: "h-28 md:h-32" },
  2: { block: "bg-silver text-foreground", ring: "ring-silver", height: "h-20 md:h-24" },
  3: { block: "bg-bronze text-white", ring: "ring-bronze", height: "h-16 md:h-20" },
} as const;

function Podium({ top3, userId }: { top3: RankedStudent[]; userId: string | undefined }) {
  const reduce = useReducedMotion();
  // DOM theo hạng 1–2–3 (trình đọc màn hình đọc đúng thứ tự), CSS order xếp thành 2–1–3
  const slots = [
    { student: top3[0], rank: 1 as const, order: "order-2", delay: 0 },
    { student: top3[1], rank: 2 as const, order: "order-1", delay: 0.08 },
    { student: top3[2], rank: 3 as const, order: "order-3", delay: 0.16 },
  ];
  return (
    <section aria-labelledby="podium-title" className={cn(surface, "px-4 pt-6 md:px-8")}>
      <h2 id="podium-title" className="sr-only">
        Ba hạng đầu
      </h2>
      <ol className="mx-auto grid max-w-xl grid-cols-3 items-end gap-3 md:gap-5">
        {slots.map(({ student, rank, order, delay }) => {
          const name = displayName(student.full_name);
          const medal = MEDALS[rank];
          return (
            <motion.li
              key={student.id}
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduce ? 0 : delay, duration: 0.3 }}
              className={cn("flex min-w-0 flex-col items-center text-center", order)}
            >
              <div className="relative">
                {rank === 1 && (
                  <Crown
                    className="absolute -top-5 left-1/2 size-5 -translate-x-1/2 text-gold-strong"
                    aria-hidden
                  />
                )}
                <div
                  className={cn(
                    "flex items-center justify-center rounded-full bg-primary-soft font-bold text-primary-strong ring-4",
                    medal.ring,
                    rank === 1 ? "size-16 text-xl" : "size-14 text-lg",
                  )}
                  aria-hidden
                >
                  {initialOf(name)}
                </div>
              </div>
              <p className="mt-2 w-full truncate text-sm font-semibold">
                <span className="sr-only">Hạng {rank}: </span>
                {name}
                {student.id === userId && <span className="text-primary-strong"> (Bạn)</span>}
              </p>
              <p className="text-xs text-muted-foreground tabular-nums">{student.points} điểm</p>
              <div
                className={cn(
                  "mt-2 flex w-full items-start justify-center rounded-t-2xl pt-2 text-lg font-extrabold tabular-nums",
                  medal.block,
                  medal.height,
                )}
                aria-hidden
              >
                {rank}
              </div>
            </motion.li>
          );
        })}
      </ol>
    </section>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const medal = rank <= 3 ? MEDALS[rank as 1 | 2 | 3] : null;
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold tabular-nums",
        medal ? medal.block : "bg-muted text-muted-foreground",
      )}
    >
      <span className="sr-only">Hạng </span>
      {rank}
    </span>
  );
}

function RankRow({ student, rank, isMe }: { student: RankedStudent; rank: number; isMe: boolean }) {
  const name = displayName(student.full_name);
  return (
    <li
      className={cn(
        "flex items-center gap-3 px-4 py-3 md:px-5",
        isMe && "bg-primary-soft shadow-[inset_4px_0_0_var(--primary)]",
      )}
      aria-current={isMe ? "true" : undefined}
      data-testid="rank-row"
    >
      <RankBadge rank={rank} />
      <span
        className="hidden size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft font-bold text-primary-strong sm:flex"
        aria-hidden
      >
        {initialOf(name)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 font-medium">
          <span className="truncate">{name}</span>
          {isMe && (
            <StatusChip tone="primary" className="py-0.5">
              Bạn
            </StatusChip>
          )}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          Cấp {student.level} · {getLevelTitle(student.level)} · {student.chaptersDone} chương
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="font-bold text-gold-strong tabular-nums">{student.points}</p>
        <p className="text-xs text-muted-foreground">điểm</p>
      </div>
    </li>
  );
}
