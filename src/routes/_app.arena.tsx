import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { MathContent } from "@/components/MathContent";
import { localQuestionPool } from "@/lib/graph-chapters";
import { displayName } from "@/lib/week";
import { Swords, Loader2, Timer, Bot } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/_app/arena")({
  component: Arena,
});

type Phase = "idle" | "searching" | "playing" | "finished";

interface DuelRow {
  id: string;
  player1_id: string;
  player2_id: string | null;
  status: string;
  questions_json: any;
  player1_answers_json: any;
  player2_answers_json: any;
  player1_score: number;
  player2_score: number;
  winner_id: string | null;
  started_at: string | null;
  ended_at: string | null;
}

const TOTAL_Q = 5;
const PER_Q_SEC = 20;
const BOT_TIMEOUT_MS = 4000;

const BOT_NAMES = [
  "Máy Dijkstra", "Máy BFS", "Máy Kruskal", "Máy Ford", "Máy Prim", "Máy Floyd",
];

function Arena() {
  const { user, profile, refreshProfile } = useAuth();
  const [phase, setPhase] = useState<Phase>("idle");
  const [duel, setDuel] = useState<DuelRow | null>(null);
  const [opponent, setOpponent] = useState<{ full_name: string | null; level: number } | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(PER_Q_SEC);
  const channelRef = useRef<any>(null);

  // Bot mode (local-only simulation)
  const [botMode, setBotMode] = useState(false);
  const [botQuestions, setBotQuestions] = useState<any[]>([]);
  const [myAnswersLocal, setMyAnswersLocal] = useState<string[]>([]);
  const [myScoreLocal, setMyScoreLocal] = useState(0);
  const [botAnswers, setBotAnswers] = useState<string[]>([]);
  const [botScore, setBotScore] = useState(0);
  const botTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const botSpawnRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup
  useEffect(() => () => {
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    if (botTimerRef.current) clearTimeout(botTimerRef.current);
    if (botSpawnRef.current) clearTimeout(botSpawnRef.current);
  }, []);

  // Load opponent profile (real players only)
  useEffect(() => {
    if (botMode || !duel || !user) return;
    const oppId = duel.player1_id === user.id ? duel.player2_id : duel.player1_id;
    if (!oppId) { setOpponent(null); return; }
    supabase.from("profiles").select("full_name, level").eq("id", oppId).single()
      .then(({ data }) => setOpponent(data as any));
  }, [duel?.player2_id, duel?.player1_id, user, botMode]);

  // Timer per question
  useEffect(() => {
    if (phase !== "playing") return;
    setTimeLeft(PER_Q_SEC);
    setSelected(null);
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(interval); autoSubmit(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQ, phase]);

  // ----- Derived state (unified bot/real) -----
  const isP1 = duel && user && duel.player1_id === user.id;
  const questions: any[] = botMode ? botQuestions : (duel?.questions_json ?? []);
  const myAnswers: string[] = botMode
    ? myAnswersLocal
    : duel ? ((isP1 ? duel.player1_answers_json : duel.player2_answers_json) ?? []) : [];
  const oppAnswers: string[] = botMode
    ? botAnswers
    : duel ? ((isP1 ? duel.player2_answers_json : duel.player1_answers_json) ?? []) : [];
  const myScore = botMode ? myScoreLocal : duel ? (isP1 ? duel.player1_score : duel.player2_score) : 0;
  const oppScore = botMode ? botScore : duel ? (isP1 ? duel.player2_score : duel.player1_score) : 0;

  // Real duel: transition to finished
  useEffect(() => {
    if (botMode || !duel) return;
    if (duel.status === "completed") setPhase("finished");
    else if (duel.status === "active") setPhase("playing");
  }, [duel?.status, botMode]);

  // Bot mode: finish detection
  useEffect(() => {
    if (!botMode || phase !== "playing") return;
    if (myAnswersLocal.length >= TOTAL_Q && botAnswers.length >= TOTAL_Q) {
      setPhase("finished");
    }
  }, [botMode, phase, myAnswersLocal.length, botAnswers.length]);

  // Bot brain: answer current question after random delay
  useEffect(() => {
    if (!botMode || phase !== "playing") return;
    if (botAnswers.length > currentQ) return; // already answered this Q
    if (botAnswers.length >= TOTAL_Q) return;
    const q = botQuestions[currentQ];
    if (!q) return;
    const delay = 3000 + Math.random() * 9000; // 3–12s
    botTimerRef.current = setTimeout(() => {
      // 65% correct rate, otherwise random wrong option
      const opts: string[] = Array.isArray(q.options_json) ? q.options_json : [];
      const correct = Math.random() < 0.65;
      let ans: string;
      if (correct) ans = q.correct_answer;
      else {
        const wrong = opts.filter((o) => o !== q.correct_answer);
        ans = wrong.length ? wrong[Math.floor(Math.random() * wrong.length)] : (opts[0] ?? "");
      }
      setBotAnswers((a) => [...a, ans]);
      if (ans === q.correct_answer) setBotScore((s) => s + 1);
    }, Math.min(delay, (PER_Q_SEC - 1) * 1000));
    return () => { if (botTimerRef.current) clearTimeout(botTimerRef.current); };
  }, [botMode, phase, currentQ, botQuestions, botAnswers.length]);

  const subscribeToDuel = (duelId: string) => {
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    const ch = supabase
      .channel(`duel-${duelId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "duel_sessions", filter: `id=eq.${duelId}` },
        (payload) => setDuel(payload.new as DuelRow))
      .subscribe();
    channelRef.current = ch;
  };

  const startBotMatch = (questionsPool: any[]) => {
    const picked = [...questionsPool].sort(() => Math.random() - 0.5).slice(0, TOTAL_Q);
    const botName = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
    setBotQuestions(picked);
    setMyAnswersLocal([]);
    setMyScoreLocal(0);
    setBotAnswers([]);
    setBotScore(0);
    setOpponent({ full_name: botName, level: 3 + Math.floor(Math.random() * 8) });
    setBotMode(true);
    setCurrentQ(0);
    setPhase("playing");
  };

  const startSearch = async () => {
    if (!user) return;
    setPhase("searching");
    setBotMode(false);
    setDuel(null);

    // Try to find a waiting duel
    const { data: waiting } = await supabase
      .from("duel_sessions")
      .select("*")
      .eq("status", "waiting")
      .is("player2_id", null)
      .neq("player1_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1);

    if (waiting && waiting.length > 0) {
      const target = waiting[0] as DuelRow;
      const { data: updated } = await supabase
        .from("duel_sessions")
        .update({ player2_id: user.id, status: "active", started_at: new Date().toISOString() })
        .eq("id", target.id).eq("status", "waiting").is("player2_id", null)
        .select().single();
      if (updated) {
        setDuel(updated as DuelRow);
        subscribeToDuel(updated.id);
        setCurrentQ(0);
        setPhase("playing");
        return;
      }
    }

    // Fetch question pool
    const pool = localQuestionPool();

    // Create waiting duel
    const picked = [...pool].sort(() => Math.random() - 0.5).slice(0, TOTAL_Q);
    const { data: created } = await supabase
      .from("duel_sessions")
      .insert({ player1_id: user.id, questions_json: picked as any, status: "waiting" })
      .select().single();
    if (!created) { setPhase("idle"); return; }
    setDuel(created as DuelRow);
    subscribeToDuel(created.id);

    // Fallback to bot opponent after BOT_TIMEOUT_MS if no real player joins
    botSpawnRef.current = setTimeout(async () => {
      const { data: fresh } = await supabase.from("duel_sessions").select("status").eq("id", created.id).single();
      if (fresh?.status === "waiting") {
        await supabase.from("duel_sessions").update({ status: "completed" }).eq("id", created.id);
        if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }
        setDuel(null);
        startBotMatch(pool);
      }
    }, BOT_TIMEOUT_MS);
  };

  const cancelSearch = async () => {
    if (botSpawnRef.current) { clearTimeout(botSpawnRef.current); botSpawnRef.current = null; }
    if (duel && user && duel.player1_id === user.id && duel.status === "waiting") {
      await supabase.from("duel_sessions").update({ status: "completed" }).eq("id", duel.id);
    }
    if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }
    setDuel(null);
    setPhase("idle");
  };

  // Auto-start when 2nd real player joins
  useEffect(() => {
    if (!botMode && duel && duel.status === "active" && phase === "searching") {
      if (botSpawnRef.current) { clearTimeout(botSpawnRef.current); botSpawnRef.current = null; }
      setCurrentQ(0);
      setPhase("playing");
    }
  }, [duel?.status, phase, botMode]);

  const submitAnswer = async (answer: string | null) => {
    if (phase !== "playing") return;
    const q = questions[currentQ];
    if (!q) return;
    const ans = answer ?? "";
    const correct = ans === q.correct_answer;

    if (botMode) {
      if (myAnswersLocal.length > currentQ) return;
      const newAnswers = [...myAnswersLocal, ans];
      setMyAnswersLocal(newAnswers);
      if (correct) setMyScoreLocal((s) => s + 1);
      if (newAnswers.length < TOTAL_Q) {
        setTimeout(() => setCurrentQ((c) => c + 1), 600);
      }
      return;
    }

    if (!duel || !user) return;
    const newAnswers = [...myAnswers, ans];
    const newScore = correct ? myScore + 1 : myScore;
    const update: any = isP1
      ? { player1_answers_json: newAnswers, player1_score: newScore }
      : { player2_answers_json: newAnswers, player2_score: newScore };
    const otherLen = oppAnswers.length;
    if (newAnswers.length >= TOTAL_Q && otherLen >= TOTAL_Q) {
      const finalMy = newScore;
      const finalOpp = oppScore;
      update.status = "completed";
      update.ended_at = new Date().toISOString();
      update.winner_id = finalMy > finalOpp ? user.id : finalOpp > finalMy ? (isP1 ? duel.player2_id : duel.player1_id) : null;
    }
    const { data: updated } = await supabase.from("duel_sessions").update(update).eq("id", duel.id).select().single();
    if (updated) setDuel(updated as DuelRow);
    if (newAnswers.length < TOTAL_Q) {
      setTimeout(() => setCurrentQ((c) => c + 1), 600);
    }
  };

  const autoSubmit = () => {
    if (phase !== "playing") return;
    // Avoid double-submit if already answered this question
    if (myAnswers.length > currentQ) return;
    submitAnswer(selected);
  };
  const handleSubmit = () => submitAnswer(selected);

  // Award XP on finish (one-time)
  const awardedRef = useRef(false);
  useEffect(() => {
    if (phase !== "finished" || awardedRef.current || !user) return;
    awardedRef.current = true;
    const winnerIsMe = botMode
      ? myScore > oppScore
      : duel ? duel.winner_id === user.id : false;
    const isDraw = botMode
      ? myScore === oppScore
      : duel ? duel.winner_id === null : false;
    const xp = winnerIsMe ? 40 : isDraw ? 20 : 10;
    (async () => {
      await supabase.from("student_xp_log").insert({
        student_id: user.id, xp_amount: xp, reason: "duel_win", reference_id: duel?.id ?? null,
      });
      const { data: p } = await supabase.from("profiles").select("xp_total").eq("id", user.id).single();
      if (p) await supabase.from("profiles").update({ xp_total: (p.xp_total ?? 0) + xp }).eq("id", user.id);
      if (winnerIsMe) {
        await supabase.from("social_feed_events").insert({
          student_id: user.id, event_type: "duel_win", event_data_json: { score: myScore, opponent_score: oppScore, vs_bot: botMode },
        });
      }
      await refreshProfile();
    })();
  }, [phase, duel, user, myScore, oppScore, botMode, refreshProfile]);

  const resetAll = () => {
    setDuel(null);
    setPhase("idle");
    setBotMode(false);
    setMyAnswersLocal([]);
    setMyScoreLocal(0);
    setBotAnswers([]);
    setBotScore(0);
    setBotQuestions([]);
    setCurrentQ(0);
    awardedRef.current = false;
  };

  // ----- Render -----
  if (phase === "idle") {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="size-24 mx-auto rounded-3xl bg-gradient-to-br from-rose-500 to-red-700 flex items-center justify-center text-white shadow-[var(--shadow-glow)] mb-6">
            <Swords className="size-12" />
          </div>
          <h1 className="text-3xl font-bold">Đấu trường PvP</h1>
          <p className="text-muted-foreground mt-2">Đối đầu qua 5 câu hỏi nhanh. Thắng để nhận 40 XP!</p>
          <div className="mt-6 grid grid-cols-3 gap-3 text-sm">
            <Stat n="5" l="câu hỏi" />
            <Stat n={`${PER_Q_SEC}s`} l="mỗi câu" />
            <Stat n="40" l="XP thắng" />
          </div>
          <Button onClick={startSearch} size="lg" className="mt-8 w-full bg-gradient-to-r from-rose-500 to-red-700 text-white">
            Tìm đối thủ
          </Button>
          <p className="text-xs text-muted-foreground mt-3">
            Nếu không tìm thấy người chơi, hệ thống sẽ ghép bạn với <Bot className="inline size-3 -mt-0.5" /> đối thủ máy.
          </p>
        </div>
      </div>
    );
  }

  if (phase === "searching") {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="text-center">
          <Loader2 className="size-12 mx-auto animate-spin text-primary" />
          <h2 className="text-2xl font-bold mt-4">Đang tìm đối thủ…</h2>
          <p className="text-muted-foreground mt-1">Trận đấu sẽ bắt đầu trong giây lát.</p>
          <Button variant="outline" onClick={cancelSearch} className="mt-6">Hủy tìm</Button>
        </div>
      </div>
    );
  }

  if (phase === "finished") {
    const isWinner = botMode ? myScore > oppScore : duel?.winner_id === user?.id;
    const isDraw = botMode ? myScore === oppScore : duel?.winner_id === null;
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="bg-card border border-border rounded-3xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-3">{isWinner ? "👑" : isDraw ? "🤝" : "💪"}</div>
          <h1 className="text-2xl font-bold">
            {isWinner ? "Chiến thắng!" : isDraw ? "Hòa!" : "Thua trận"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isWinner ? "Bạn đã chứng tỏ thực lực." : isDraw ? "Cân tài cân sức!" : "Cố gắng lần sau nhé!"}
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-primary-soft">
              <div className="text-xs text-muted-foreground">Bạn</div>
              <div className="text-3xl font-bold text-primary">{myScore}</div>
            </div>
            <div className="p-4 rounded-2xl bg-secondary">
              <div className="text-xs text-muted-foreground truncate flex items-center justify-center gap-1">
                {botMode && <Bot className="size-3" />} {opponent?.full_name ?? "Đối thủ"}
              </div>
              <div className="text-3xl font-bold">{oppScore}</div>
            </div>
          </div>
          <Button onClick={resetAll} size="lg" className="mt-6 w-full bg-gradient-primary">Đấu trận khác</Button>
        </motion.div>
      </div>
    );
  }

  // Playing
  const q = questions[currentQ];
  const myDone = myAnswers.length >= TOTAL_Q;
  const options: string[] = q ? (Array.isArray(q.options_json) ? q.options_json : []) : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-950/95 via-foreground/95 to-indigo-950/95 text-background flex flex-col">
      <div className="px-4 py-3 border-b border-white/10">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <PlayerBadge name={displayName(profile?.full_name)} score={myScore} progress={myAnswers.length} highlight />
          <div className="flex flex-col items-center">
            <Timer className={`size-4 ${timeLeft < 6 ? "text-rose-400" : ""}`} />
            <span className={`font-mono font-bold text-sm ${timeLeft < 6 ? "text-rose-400" : ""}`}>{timeLeft}s</span>
          </div>
          <PlayerBadge
            name={opponent?.full_name ?? "Đối thủ"}
            score={oppScore}
            progress={oppAnswers.length}
            isBot={botMode}
          />
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        {myDone ? (
          <div className="text-center max-w-md">
            <Loader2 className="size-10 mx-auto animate-spin text-white/70" />
            <h2 className="text-xl font-bold mt-4">Đang chờ đối thủ…</h2>
            <p className="text-white/60 mt-1 text-sm">Bạn đã hoàn thành tất cả câu hỏi.</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={currentQ} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="max-w-2xl w-full">
              <div className="p-6 rounded-2xl bg-card text-card-foreground mb-4">
                <div className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-2">
                  Câu {currentQ + 1}/{TOTAL_Q}
                </div>
                <div className="text-lg font-medium"><MathContent text={q?.question_text ?? ""} /></div>
              </div>
              <div className="space-y-2">
                {options.map((opt, i) => (
                  <button key={i} onClick={() => setSelected(opt)}
                    className={`w-full p-4 rounded-xl text-left border-2 transition-all ${
                      selected === opt ? "border-rose-400 bg-rose-500/15 text-foreground" :
                      "border-white/10 bg-card/60 text-card-foreground hover:border-rose-400/60"
                    }`}>
                    <MathContent text={opt} />
                  </button>
                ))}
              </div>
              <Button onClick={handleSubmit} disabled={!selected}
                className="w-full mt-4 bg-gradient-to-r from-rose-500 to-red-700 text-white" size="lg">
                Trả lời
              </Button>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

function Stat({ n, l }: { n: string; l: string }) {
  return (
    <div className="p-3 rounded-xl bg-card border border-border">
      <div className="text-2xl font-bold">{n}</div>
      <div className="text-xs text-muted-foreground">{l}</div>
    </div>
  );
}

function PlayerBadge({ name, score, progress, highlight, isBot }: { name: string; score: number; progress: number; highlight?: boolean; isBot?: boolean }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${highlight ? "bg-white/15" : "bg-white/5"} flex-1 min-w-0 max-w-[40%]`}>
      <div className="size-8 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground text-sm font-bold shrink-0">
        {isBot ? <Bot className="size-4" /> : name.charAt(0)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs truncate flex items-center gap-1">
          {name}{isBot && <span className="text-[10px] text-white/50">(Bot)</span>}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-sm">{score}</span>
          <div className="flex gap-0.5">
            {Array.from({ length: TOTAL_Q }).map((_, i) => (
              <div key={i} className={`size-1.5 rounded-full ${i < progress ? "bg-emerald-400" : "bg-white/20"}`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
