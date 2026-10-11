import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { GRAPH_CHAPTERS, chapterByKey, type GraphChapter } from "@/lib/graph-chapters";
import { POINTS_PER_CORRECT, currentWeekStart } from "@/lib/week";
import { getLevelFromXp } from "@/lib/math-utils";
import { Check, ChevronLeft, ClipboardList, Trophy, X } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/practice")({
  component: Practice,
});

function Practice() {
  const { user, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const weekStart = currentWeekStart();
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const { data: bestByChapter = {}, isError } = useQuery({
    queryKey: ["chapter-best", user?.id, weekStart],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chapter_quiz_attempts")
        .select("chapter_key, points")
        .eq("student_id", user!.id)
        .eq("week_start", weekStart);
      if (error) throw error;
      const best: Record<string, number> = {};
      for (const row of data ?? []) {
        best[row.chapter_key] = Math.max(best[row.chapter_key] ?? 0, row.points);
      }
      return best;
    },
  });

  const active = activeKey ? chapterByKey(activeKey) : undefined;
  const weekPoints = Object.values(bestByChapter).reduce((sum, points) => sum + points, 0);

  if (active) {
    return (
      <ChapterQuiz
        chapter={active}
        weekStart={weekStart}
        previousBest={bestByChapter[active.key] ?? 0}
        onExit={() => setActiveKey(null)}
        onSaved={async () => {
          await queryClient.invalidateQueries({ queryKey: ["chapter-best", user?.id, weekStart] });
          await queryClient.invalidateQueries({ queryKey: ["weekly-leaderboard"] });
          await refreshProfile();
        }}
      />
    );
  }

  return (
    <div className="px-4 md:px-8 py-6 md:py-10 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <ClipboardList className="size-7 text-primary" /> Luyện theo chương
        </h1>
        <p className="text-muted-foreground mt-1">
          Mỗi câu đúng được {POINTS_PER_CORRECT} điểm. Trong tuần, mỗi chương chỉ lấy lần điểm cao nhất, rồi cộng lại để xếp hạng.
        </p>
      </div>

      {isError && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
          Bảng điểm tuần chưa có trên Supabase. Chạy file migration trong thư mục supabase/migrations, rồi làm lại bài.
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl p-5 flex items-center justify-between gap-4">
        <div>
          <div className="text-xs text-muted-foreground">Điểm tuần của bạn</div>
          <div className="text-3xl font-bold text-[color:var(--xp)]">{weekPoints}</div>
          <div className="text-xs text-muted-foreground mt-1">Tối đa {GRAPH_CHAPTERS.length * 100} điểm</div>
        </div>
        <div className="size-12 rounded-2xl bg-primary-soft text-primary flex items-center justify-center">
          <Trophy className="size-6" />
        </div>
      </div>

      <div className="space-y-3">
        {GRAPH_CHAPTERS.map((chapter) => {
          const best = bestByChapter[chapter.key] ?? 0;
          const max = chapter.questions.length * POINTS_PER_CORRECT;
          return (
            <button
              key={chapter.key}
              type="button"
              onClick={() => setActiveKey(chapter.key)}
              className="w-full text-left bg-card border border-border rounded-2xl p-5 hover:border-primary hover:shadow-[var(--shadow-glow)] transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-primary">Chương {chapter.order}</div>
                  <div className="font-bold mt-0.5">{chapter.title}</div>
                  <p className="text-sm text-muted-foreground mt-1">{chapter.summary}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold">{best}/{max}</div>
                  <div className="text-xs text-muted-foreground">điểm cao nhất</div>
                </div>
              </div>
              <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-gradient-primary" style={{ width: `${(best / max) * 100}%` }} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ChapterQuiz({
  chapter,
  weekStart,
  previousBest,
  onExit,
  onSaved,
}: {
  chapter: GraphChapter;
  weekStart: string;
  previousBest: number;
  onExit: () => void;
  onSaved: () => Promise<void>;
}) {
  const { user } = useAuth();
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedPoints, setSavedPoints] = useState<number | null>(null);
  const [saveError, setSaveError] = useState(false);

  const question = chapter.questions[index];
  const maxPoints = chapter.questions.length * POINTS_PER_CORRECT;

  const reveal = () => {
    if (!selected || revealed) return;
    if (selected === question.answer) setCorrectCount((count) => count + 1);
    setRevealed(true);
  };

  const next = async () => {
    if (index + 1 < chapter.questions.length) {
      setIndex((value) => value + 1);
      setSelected(null);
      setRevealed(false);
      return;
    }
    const finalCorrect = correctCount;
    const finalPoints = finalCorrect * POINTS_PER_CORRECT;
    setDone(true);
    setSavedPoints(finalPoints);
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("chapter_quiz_attempts").insert({
      student_id: user.id,
      chapter_key: chapter.key,
      correct_count: finalCorrect,
      question_count: chapter.questions.length,
      points: finalPoints,
      week_start: weekStart,
    });
    if (error) {
      setSaveError(true);
      toast.error("Chưa lưu được điểm. Hãy chạy migration chương trong Supabase, rồi làm lại.");
      setSaving(false);
      return;
    }
    const xp = Math.max(0, finalPoints - previousBest);
    if (xp > 0) {
      await supabase.from("student_xp_log").insert({
        student_id: user.id,
        xp_amount: xp,
        reason: "check_correct",
      });
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("xp_total, streak_current, streak_longest, last_active_date")
      .eq("id", user.id)
      .single();
    if (profile) {
      const today = new Date().toISOString().slice(0, 10);
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const last = profile.last_active_date;
      const streak = last === today ? profile.streak_current : last === yesterday ? profile.streak_current + 1 : 1;
      const xpTotal = (profile.xp_total ?? 0) + xp;
      await supabase
        .from("profiles")
        .update({
          xp_total: xpTotal,
          level: getLevelFromXp(xpTotal),
          streak_current: streak,
          streak_longest: Math.max(profile.streak_longest ?? 0, streak),
          last_active_date: today,
        })
        .eq("id", user.id);
    }
    if (finalPoints === maxPoints) {
      await supabase.from("social_feed_events").insert({
        student_id: user.id,
        event_type: "chapter_complete",
        event_data_json: { title: chapter.title },
      });
    }
    setSaving(false);
    await onSaved();
  };

  if (done) {
    const counted = savedPoints !== null && savedPoints >= previousBest;
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center">
          <div className="text-sm text-muted-foreground">Chương {chapter.order}</div>
          <h2 className="text-2xl font-bold mt-1">{chapter.title}</h2>
          <div className="text-5xl font-bold text-[color:var(--xp)] mt-4">{savedPoints ?? 0}</div>
          <p className="text-sm text-muted-foreground mt-1">/ {maxPoints} điểm</p>
          <p className="text-sm mt-4">
            {saveError
              ? "Điểm chưa được lưu. Chạy migration trong Supabase rồi làm lại chương này."
              : counted
                ? "Điểm này được tính vào bảng xếp hạng tuần."
                : `Điểm cao nhất tuần này của chương vẫn là ${previousBest}.`}
          </p>
          {saving && <p className="text-xs text-muted-foreground mt-2">Đang lưu điểm...</p>}
          <Button className="mt-6 bg-gradient-primary hover:opacity-90" onClick={onExit}>
            Về danh sách chương
          </Button>
        </motion.div>
      </div>
    );
  }

  const correct = selected === question.answer;

  return (
    <div className="px-4 md:px-8 py-6 md:py-10 max-w-2xl mx-auto space-y-5">
      <button type="button" onClick={onExit} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Thoát
      </button>
      <div>
        <div className="text-xs font-semibold text-primary">Chương {chapter.order} · Câu {index + 1}/{chapter.questions.length}</div>
        <h1 className="text-xl font-bold mt-1">{chapter.title}</h1>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-gradient-primary" style={{ width: `${(index / chapter.questions.length) * 100}%` }} />
      </div>
      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <p className="text-lg font-medium">{question.prompt}</p>
        <div className="space-y-2">
          {question.options.map((option) => {
            const isSelected = selected === option;
            const showCorrect = revealed && option === question.answer;
            const showWrong = revealed && isSelected && option !== question.answer;
            return (
              <button
                key={option}
                type="button"
                disabled={revealed}
                onClick={() => setSelected(option)}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                  showCorrect
                    ? "border-[color:var(--success)] bg-success/10"
                    : showWrong
                      ? "border-destructive bg-destructive/10"
                      : isSelected
                        ? "border-primary bg-primary-soft"
                        : "border-border hover:border-primary"
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>
        {revealed && (
          <div className={`flex items-start gap-2 text-sm ${correct ? "text-[color:var(--success)]" : "text-destructive"}`}>
            {correct ? <Check className="size-4 mt-0.5" /> : <X className="size-4 mt-0.5" />}
            <span>{question.explanation}</span>
          </div>
        )}
        {!revealed ? (
          <Button disabled={!selected} onClick={reveal} className="bg-gradient-primary hover:opacity-90">
            Kiểm tra
          </Button>
        ) : (
          <Button onClick={next} className="bg-gradient-primary hover:opacity-90">
            {index + 1 < chapter.questions.length ? "Câu tiếp" : "Xem điểm"}
          </Button>
        )}
      </div>
    </div>
  );
}
