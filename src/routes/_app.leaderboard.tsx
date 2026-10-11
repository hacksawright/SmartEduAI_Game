import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Trophy, Crown, Medal, Gift } from "lucide-react";
import { motion } from "framer-motion";
import { getLevelTitle } from "@/lib/math-utils";
import { DEFAULT_WEEKLY_PRIZE, currentWeekStart, displayName, weekRangeLabel } from "@/lib/week";
import { GRAPH_CHAPTERS } from "@/lib/graph-chapters";

export const Route = createFileRoute("/_app/leaderboard")({
  component: Leaderboard,
});

interface RankedStudent {
  id: string;
  full_name: string | null;
  level: number;
  points: number;
  chaptersDone: number;
}

function Leaderboard() {
  const { user } = useAuth();
  const weekStart = currentWeekStart();

  const { data, isError } = useQuery({
    queryKey: ["weekly-leaderboard", weekStart],
    queryFn: async () => {
      const [{ data: attempts, error: attemptError }, { data: prize }] = await Promise.all([
        supabase
          .from("chapter_quiz_attempts")
          .select("student_id, chapter_key, points")
          .eq("week_start", weekStart),
        supabase.from("weekly_prizes").select("title, description").eq("week_start", weekStart).maybeSingle(),
      ]);
      if (attemptError) throw attemptError;

      const byStudent = new Map<string, Map<string, number>>();
      for (const attempt of attempts ?? []) {
        const chapters = byStudent.get(attempt.student_id) ?? new Map<string, number>();
        chapters.set(attempt.chapter_key, Math.max(chapters.get(attempt.chapter_key) ?? 0, attempt.points));
        byStudent.set(attempt.student_id, chapters);
      }

      const ids = [...byStudent.keys()];
      const { data: profiles } = ids.length
        ? await supabase.from("profiles").select("id, full_name, level").in("id", ids)
        : { data: [] };
      const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

      const ranking: RankedStudent[] = [...byStudent.entries()]
        .map(([id, chapters]) => {
          const profile = profileMap.get(id);
          const points = [...chapters.values()].reduce((sum, value) => sum + value, 0);
          return {
            id,
            full_name: profile?.full_name ?? null,
            level: profile?.level ?? 1,
            points,
            chaptersDone: [...chapters.values()].filter((value) => value > 0).length,
          };
        })
        .sort((a, b) => b.points - a.points || displayName(a.full_name).localeCompare(displayName(b.full_name), "vi"));

      return {
        ranking,
        prizeTitle: prize?.title ?? "Giải tuần",
        prizeDescription: prize?.description ?? DEFAULT_WEEKLY_PRIZE,
      };
    },
  });

  const ranking = data?.ranking ?? [];
  const myIdx = ranking.findIndex((student) => student.id === user?.id);
  const top3 = ranking.slice(0, 3);
  const rest = ranking.slice(3);
  const myWindow = myIdx >= 3 ? rest.slice(Math.max(0, myIdx - 5), myIdx + 2) : [];
  const leader = ranking[0];

  return (
    <div className="px-4 md:px-8 py-6 md:py-10 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <Trophy className="size-7 text-[color:var(--xp)]" /> Bảng xếp hạng tuần
        </h1>
        <p className="text-muted-foreground mt-1">
          Tuần {weekRangeLabel(weekStart)}. Điểm là tổng điểm cao nhất của từng chương. Reset vào thứ Hai.
        </p>
        {myIdx >= 0 && (
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-soft text-primary text-sm font-semibold">
            Hạng của bạn: #{myIdx + 1} · {ranking[myIdx].points} điểm
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <div className="size-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center shrink-0">
            <Gift className="size-5" />
          </div>
          <div>
            <div className="font-bold">{data?.prizeTitle ?? "Giải tuần"}</div>
            <p className="text-sm text-muted-foreground mt-1">{data?.prizeDescription ?? DEFAULT_WEEKLY_PRIZE}</p>
            {leader && (
              <p className="text-sm mt-2">
                Đang dẫn đầu: <span className="font-semibold">{displayName(leader.full_name)}</span> với {leader.points} điểm.
              </p>
            )}
          </div>
        </div>
      </div>

      {isError && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
          Chưa đọc được điểm tuần. Hãy chạy file migration `supabase/migrations/20261011090000_chapter_quiz_weekly.sql` trong SQL Editor của Supabase.
        </div>
      )}

      {top3.length >= 3 && (
        <div className="grid grid-cols-3 gap-3 items-end">
          {[1, 0, 2].map((order, idx) => {
            const student = top3[order];
            if (!student) return <div key={idx} />;
            const heights = { 0: "h-32", 1: "h-24", 2: "h-20" };
            const colors = { 0: "from-yellow-400 to-amber-500", 1: "from-slate-300 to-slate-400", 2: "from-amber-600 to-amber-700" };
            const icons = { 0: Crown, 1: Medal, 2: Medal };
            const Icon = icons[order as 0 | 1 | 2];
            return (
              <motion.div key={student.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }} className="text-center">
                <div className={`size-14 mx-auto rounded-full bg-gradient-to-br ${colors[order as 0 | 1 | 2]} flex items-center justify-center text-white font-bold mb-2`}>
                  <Icon className="size-6" />
                </div>
                <div className="font-semibold text-sm truncate">{displayName(student.full_name)}</div>
                <div className="text-xs text-muted-foreground">{student.points} điểm</div>
                <div className={`mt-2 ${heights[order as 0 | 1 | 2]} rounded-t-xl bg-gradient-to-t ${colors[order as 0 | 1 | 2]} flex items-start justify-center pt-2 text-white font-bold`}>
                  #{order + 1}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {myWindow.length > 0 && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-secondary/50 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Quanh vị trí của bạn
          </div>
          <div className="divide-y divide-border">
            {myWindow.map((student, index) => {
              const actualRank = Math.max(0, myIdx - 5) + index + 4;
              return <RankRow key={student.id} student={student} rank={actualRank} isMe={student.id === user?.id} />;
            })}
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-secondary/50 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Top tuần này · {GRAPH_CHAPTERS.length} chương
        </div>
        <div className="divide-y divide-border">
          {ranking.slice(0, 20).map((student, index) => (
            <RankRow key={student.id} student={student} rank={index + 1} isMe={student.id === user?.id} />
          ))}
          {ranking.length === 0 && !isError && (
            <div className="p-8 text-center text-muted-foreground text-sm">Chưa có điểm nào trong tuần này. Hãy làm bài ở mục Luyện tập.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function RankRow({ student, rank, isMe }: { student: RankedStudent; rank: number; isMe: boolean }) {
  const name = displayName(student.full_name);
  return (
    <div className={`flex items-center gap-3 px-5 py-3 ${isMe ? "bg-primary-soft" : ""}`}>
      <div className={`size-8 rounded-lg flex items-center justify-center font-bold text-sm ${rank <= 3 ? "bg-gradient-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
        {rank}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{name} {isMe && <span className="text-xs text-primary">(Bạn)</span>}</div>
        <div className="text-xs text-muted-foreground">Cấp {student.level} · {getLevelTitle(student.level)} · {student.chaptersDone} chương</div>
      </div>
      <div className="text-right">
        <div className="font-bold text-[color:var(--xp)]">{student.points}</div>
        <div className="text-xs text-muted-foreground">điểm</div>
      </div>
    </div>
  );
}
