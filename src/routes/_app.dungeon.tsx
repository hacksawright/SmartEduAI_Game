import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { MathContent } from "@/components/MathContent";
import { localQuestionPool } from "@/lib/graph-chapters";
import { Swords, Flame, Timer, Check, X, Trophy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/_app/dungeon")({
  component: Dungeon,
});

interface DungeonQ { id: string; question_text: string; options_json: string[]; correct_answer: string; explanation: string }

function Dungeon() {
  const { user, profile, refreshProfile } = useAuth();
  const today = new Date().toISOString().slice(0, 10);

  const { data: todaySession, refetch } = useQuery({
    queryKey: ["dungeon-session", user?.id, today],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("daily_dungeon_sessions")
        .select("*").eq("student_id", user!.id).eq("session_date", today).maybeSingle();
      return data;
    },
  });

  const [questions, setQuestions] = useState<DungeonQ[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [phase, setPhase] = useState<"idle" | "playing" | "done">("idle");
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);

  useEffect(() => {
    if (todaySession?.completed_at) setPhase("done");
  }, [todaySession]);

  // timer
  useEffect(() => {
    if (phase !== "playing" || showAnswer) return;
    if (timeLeft <= 0) { handleSubmit(); return; }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, timeLeft, showAnswer]);

  const startDungeon = async () => {
    const source = localQuestionPool();
    // try to pick 3 from different chapters
    const shuffled = [...source].sort(() => Math.random() - 0.5);
    const picked: any[] = [];
    const seenChapters = new Set<string>();
    for (const q of shuffled) {
      if (picked.length >= 3) break;
      if (!seenChapters.has(q.chapter_id ?? "_")) {
        picked.push(q);
        seenChapters.add(q.chapter_id ?? "_");
      }
    }
    // fill if not enough
    while (picked.length < 3 && shuffled.length > picked.length) {
      const next = shuffled.find((q) => !picked.includes(q));
      if (next) picked.push(next); else break;
    }
    setQuestions(picked.slice(0, 3) as DungeonQ[]);
    setAnswers([]);
    setCurrentQ(0);
    setScore(0);
    setTimeLeft(60);
    setPhase("playing");
    setSelected(null);
    setShowAnswer(false);
  };

  const handleSubmit = async () => {
    if (showAnswer) return;
    const q = questions[currentQ];
    const correct = selected === q.correct_answer;
    const newScore = correct ? score + 1 : score;
    const newAnswers = [...answers, selected ?? ""];
    setScore(newScore);
    setAnswers(newAnswers);
    setShowAnswer(true);
    setTimeout(async () => {
      if (currentQ + 1 < questions.length) {
        setCurrentQ((c) => c + 1);
        setSelected(null);
        setShowAnswer(false);
        setTimeLeft(60);
      } else {
        // finished
        if (user) {
          const xp = newScore === 3 ? 30 : newScore === 2 ? 20 : newScore === 1 ? 10 : 0;
          await supabase.from("daily_dungeon_sessions").upsert({
            student_id: user.id,
            session_date: today,
            questions_json: questions as any,
            answers_json: newAnswers as any,
            score: newScore,
            completed_at: new Date().toISOString(),
            streak_contribution: newScore >= 1,
          }, { onConflict: "student_id,session_date" });
          if (xp > 0) {
            await supabase.from("student_xp_log").insert({
              student_id: user.id, xp_amount: xp, reason: "daily_dungeon",
            });
            const { data: p } = await supabase.from("profiles").select("xp_total, streak_current, streak_longest, last_active_date").eq("id", user.id).single();
            if (p) {
              const last = p.last_active_date;
              const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
              const newStreak = last === today ? p.streak_current : last === yesterday ? p.streak_current + 1 : 1;
              await supabase.from("profiles").update({
                xp_total: (p.xp_total ?? 0) + xp,
                streak_current: newStreak,
                streak_longest: Math.max(p.streak_longest ?? 0, newStreak),
                last_active_date: today,
              }).eq("id", user.id);
            }
            await refreshProfile();
          }
          if (newScore === 3) {
            await supabase.from("social_feed_events").insert({
              student_id: user.id, event_type: "dungeon_perfect", event_data_json: { score: newScore },
            });
          }
        }
        setPhase("done");
        refetch();
      }
    }, 1800);
  };

  // Done state
  if (phase === "done" || todaySession?.completed_at) {
    const finalScore = phase === "done" ? score : (todaySession?.score ?? 0);
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-card border border-border rounded-3xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">{finalScore === 3 ? "🏆" : finalScore >= 1 ? "🎉" : "💪"}</div>
          <h1 className="text-2xl font-bold">Phó bản hoàn thành!</h1>
          <p className="text-muted-foreground mt-1">Hôm nay bạn đã hoàn thành phần ôn tập.</p>
          <div className="mt-6 grid grid-cols-3 gap-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className={`p-4 rounded-xl ${s <= finalScore ? "bg-gradient-streak text-white" : "bg-muted text-muted-foreground"}`}>
                <Trophy className="size-6 mx-auto" />
              </div>
            ))}
          </div>
          <div className="mt-6 flex items-center justify-center gap-2 text-sm">
            <Flame className="size-4 text-[color:var(--streak)] streak-flame" />
            <span className="font-semibold">Chuỗi: {profile?.streak_current ?? 0} ngày</span>
          </div>
          <p className="text-xs text-muted-foreground mt-4">Gặp lại bạn vào ngày mai 👋</p>
        </motion.div>
      </div>
    );
  }

  // Idle / start
  if (phase === "idle") {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="relative mb-6 inline-block">
            <div className="size-24 mx-auto rounded-3xl bg-gradient-primary flex items-center justify-center text-primary-foreground shadow-[var(--shadow-glow)]">
              <Swords className="size-12" />
            </div>
          </div>
          <h1 className="text-3xl font-bold">Phó bản hôm nay</h1>
          <p className="text-muted-foreground mt-2">3 câu ôn tập từ những bài bạn đã học. Đáp đúng ≥1 câu để giữ chuỗi ngày 🔥</p>
          <div className="mt-6 grid grid-cols-3 gap-3 text-sm">
            <div className="p-3 rounded-xl bg-card border border-border">
              <div className="text-2xl font-bold">3</div>
              <div className="text-xs text-muted-foreground">câu hỏi</div>
            </div>
            <div className="p-3 rounded-xl bg-card border border-border">
              <div className="text-2xl font-bold">60s</div>
              <div className="text-xs text-muted-foreground">mỗi câu</div>
            </div>
            <div className="p-3 rounded-xl bg-card border border-border">
              <div className="text-2xl font-bold">30</div>
              <div className="text-xs text-muted-foreground">XP tối đa</div>
            </div>
          </div>
          <Button onClick={startDungeon} size="lg" className="mt-8 w-full bg-gradient-primary">
            Tham chiến ngay
          </Button>
        </div>
      </div>
    );
  }

  // Playing
  const q = questions[currentQ];
  if (!q) return null;
  const options = Array.isArray(q.options_json) ? q.options_json : [];

  return (
    <div className="min-h-screen bg-foreground/95 text-background flex flex-col">
      <div className="px-4 py-4 border-b border-white/10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="text-sm font-semibold">Phòng {currentQ + 1}/3</div>
          <div className="flex items-center gap-2 text-sm">
            <Timer className={`size-4 ${timeLeft < 15 ? "text-[color:var(--danger)]" : ""}`} />
            <span className={`font-mono font-bold ${timeLeft < 15 ? "text-[color:var(--danger)]" : ""}`}>{timeLeft}s</span>
          </div>
          <div className="text-sm">Điểm: {score}</div>
        </div>
        <div className="max-w-2xl mx-auto mt-3 h-1 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-primary" style={{ width: `${(timeLeft / 60) * 100}%`, transition: "width 1s linear" }} />
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <AnimatePresence mode="wait">
          <motion.div key={currentQ} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="max-w-2xl w-full">
            <div className="p-6 rounded-2xl bg-card text-card-foreground mb-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-2">Câu hỏi {currentQ + 1}</div>
              <div className="text-lg font-medium"><MathContent text={q.question_text} /></div>
            </div>
            <div className="space-y-2">
              {options.map((opt, i) => {
                const isCorrect = showAnswer && opt === q.correct_answer;
                const isWrong = showAnswer && opt === selected && opt !== q.correct_answer;
                return (
                  <button key={i} onClick={() => !showAnswer && setSelected(opt)} disabled={showAnswer}
                    className={`w-full p-4 rounded-xl text-left border-2 transition-all ${
                      isCorrect ? "border-[color:var(--success)] bg-success/15 text-foreground" :
                      isWrong ? "border-[color:var(--danger)] bg-danger/15 text-foreground" :
                      selected === opt ? "border-primary bg-primary-soft text-foreground" :
                      "border-white/10 bg-card/60 text-card-foreground hover:border-primary/60"
                    }`}>
                    <div className="flex items-center justify-between">
                      <MathContent text={opt} />
                      {isCorrect && <Check className="size-5 text-[color:var(--success)]" />}
                      {isWrong && <X className="size-5 text-[color:var(--danger)]" />}
                    </div>
                  </button>
                );
              })}
            </div>
            {!showAnswer && (
              <Button onClick={handleSubmit} disabled={!selected} className="w-full mt-4 bg-gradient-primary" size="lg">
                Trả lời
              </Button>
            )}
            {showAnswer && q.explanation && (
              <div className="mt-4 p-3 rounded-lg bg-card text-card-foreground text-sm">
                💡 {q.explanation}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
