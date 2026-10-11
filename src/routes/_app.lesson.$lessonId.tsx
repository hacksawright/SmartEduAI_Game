import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { MathContent } from "@/components/MathContent";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Check, X, Sparkles, Lightbulb, BookMarked, Trophy,
  BookOpen, PlayCircle, ChevronDown, Rocket,
} from "lucide-react";
import { toast } from "sonner";
import { LessonForum } from "@/components/LessonForum";

export const Route = createFileRoute("/_app/lesson/$lessonId")({
  component: LessonPlayer,
});

// ---------------- Types ----------------
interface PriorKnowledge {
  question: string; options: string[]; correct: number; explanation?: string; hint?: string;
}
interface CheckQ {
  question: string; options: string[]; correct: number; hint?: string; explanation?: string;
}
interface PageRow {
  id: string;
  page_type: string;
  order_index: number;
  title: string | null;
  content_json: any;
  questions?: any[];
}

const SHORT_TITLES: Record<string, string> = {
  opening: "Mở đầu",
  prior_knowledge: "Ôn lại",
  vocabulary: "Khái niệm",
  example: "Ví dụ",
  summary_practice: "Luyện tập",
};

// ---------------- Main ----------------
function LessonPlayer() {
  const { lessonId } = Route.useParams();
  const { user, refreshProfile } = useAuth();
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(0);
  const [maxVisited, setMaxVisited] = useState(0);
  const [practiceAnswers, setPracticeAnswers] = useState<Record<string, string>>({});
  const [practiceSubmitted, setPracticeSubmitted] = useState(false);
  const [practiceScore, setPracticeScore] = useState<{ correct: number; total: number } | null>(null);
  const [showComplete, setShowComplete] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);

  const { data, isLoading, error } = useQuery({
    queryKey: ["lesson-full", lessonId],
    queryFn: async () => {
      const [{ data: l, error: le }, { data: pages, error: pe }] = await Promise.all([
        supabase.from("lessons").select("*, chapters(title)").eq("id", lessonId).maybeSingle(),
        supabase.from("lesson_pages").select("*, questions(*)")
          .eq("lesson_id", lessonId).order("order_index"),
      ]);
      if (le) throw le;
      if (pe) throw pe;
      return { lesson: l, pages: (pages ?? []) as PageRow[] };
    },
  });

  // Load progress
  useEffect(() => {
    if (!user || !lessonId) return;
    supabase.from("student_lesson_progress")
      .select("current_page_index, status")
      .eq("student_id", user.id).eq("lesson_id", lessonId).maybeSingle()
      .then(({ data }) => {
        if (data?.current_page_index != null) {
          setCurrentPage(data.current_page_index);
          setMaxVisited(data.current_page_index);
        }
      });
  }, [user, lessonId]);

  // Auto-save progress
  useEffect(() => {
    if (!user || !data?.lesson) return;
    const t = setTimeout(async () => {
      await supabase.from("student_lesson_progress").upsert({
        student_id: user.id,
        lesson_id: lessonId,
        current_page_index: currentPage,
        status: "in_progress",
        started_at: new Date().toISOString(),
      }, { onConflict: "student_id,lesson_id" });
    }, 800);
    return () => clearTimeout(t);
  }, [currentPage, user, lessonId, data]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="size-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }
  if (error || !data?.lesson) {
    return (
      <div className="max-w-md mx-auto mt-20 p-6 text-center">
        <div className="text-5xl mb-3">😕</div>
        <h2 className="font-semibold text-lg">Không tìm thấy bài học</h2>
        <p className="text-sm text-muted-foreground mt-1">Bài học có thể đã bị xoá hoặc chưa xuất bản.</p>
        <Button asChild className="mt-4"><Link to="/courses">Quay lại khoá học</Link></Button>
      </div>
    );
  }

  const pages = data.pages;
  const page = pages[currentPage];
  const totalPages = pages.length;
  if (!page) {
    return <div className="p-8 text-center text-muted-foreground">Bài học chưa có nội dung.</div>;
  }

  const goNext = () => {
    const next = Math.min(currentPage + 1, totalPages - 1);
    setCurrentPage(next);
    setMaxVisited((m) => Math.max(m, next));
  };
  const goPrev = () => setCurrentPage((p) => Math.max(p - 1, 0));
  const jumpTo = (i: number) => {
    if (i <= maxVisited) setCurrentPage(i);
  };

  // ---------------- Submit practice (final page) ----------------
  const submitPractice = async () => {
    const c = page.content_json ?? {};
    const list: any[] = Array.isArray(c.practice_questions) && c.practice_questions.length > 0
      ? c.practice_questions
      : (page.questions ?? []);
    if (list.length === 0) { await completeLesson(100, 0, 0); return; }

    let correct = 0;
    list.forEach((q, idx) => {
      const key = q.id ?? `__pq_${idx}`;
      const userAns = practiceAnswers[key];
      const correctAns = q.correct_answer ?? (q.options ? q.options[q.correct] : undefined);
      if (userAns != null && userAns === correctAns) correct++;
    });
    const total = list.length;
    const score = Math.round((correct / total) * 100);
    setPracticeSubmitted(true);
    setPracticeScore({ correct, total });
    await completeLesson(score, correct, total);
  };

  // ---------------- Complete + XP ----------------
  const completeLesson = async (score: number, correct = 0, total = 0) => {
    if (!user) return;
    const xpTable = [3, 5, 10, 20, 35, 50];
    const xp = total > 0 ? (xpTable[Math.min(correct, 5)] ?? 50) : (score >= 80 ? 35 : 20);
    setXpEarned(xp);

    const { data: existing } = await supabase
      .from("student_lesson_progress")
      .select("status, score_percentage")
      .eq("student_id", user.id).eq("lesson_id", lessonId).maybeSingle();
    const firstTime = existing?.status !== "completed";

    await supabase.from("student_lesson_progress").upsert({
      student_id: user.id,
      lesson_id: lessonId,
      status: "completed",
      score_percentage: Math.max(score, existing?.score_percentage ?? 0),
      current_page_index: totalPages - 1,
      completed_at: new Date().toISOString(),
    }, { onConflict: "student_id,lesson_id" });

    if (firstTime) {
      await supabase.from("student_xp_log").insert({
        student_id: user.id, xp_amount: xp, reason: "lesson_complete", reference_id: lessonId,
      });
      const today = new Date().toISOString().slice(0, 10);
      const { data: prof } = await supabase
        .from("profiles")
        .select("xp_total, streak_current, streak_longest, last_active_date")
        .eq("id", user.id).single();
      if (prof) {
        const last = prof.last_active_date;
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        const newStreak = last === today ? prof.streak_current
          : last === yesterday ? prof.streak_current + 1 : 1;
        await supabase.from("profiles").update({
          xp_total: (prof.xp_total ?? 0) + xp,
          streak_current: newStreak,
          streak_longest: Math.max(prof.streak_longest ?? 0, newStreak),
          last_active_date: today,
        }).eq("id", user.id);
      }
      await refreshProfile();
    }
    setShowComplete(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-20 bg-card/95 backdrop-blur border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.navigate({ to: "/courses" })} className="p-2 -ml-2 rounded-lg hover:bg-accent" aria-label="Thoát">
            <ArrowLeft className="size-5" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground truncate">{(data.lesson as any)?.chapters?.title}</div>
            <div className="font-semibold truncate">{data.lesson?.title}</div>
          </div>
          <div className="text-xs font-semibold px-2.5 py-1 rounded-md bg-primary-soft text-primary whitespace-nowrap">
            Trang {currentPage + 1}/{totalPages}
          </div>
        </div>
        {/* Step indicator */}
        <StepIndicator
          pages={pages}
          currentPage={currentPage}
          maxVisited={maxVisited}
          onJump={jumpTo}
        />
      </header>

      {/* Page content */}
      <div className="max-w-3xl mx-auto px-4 py-8 pb-32">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
          >
            <PageRenderer
              page={page}
              practiceAnswers={practiceAnswers}
              setPracticeAnswers={setPracticeAnswers}
              practiceSubmitted={practiceSubmitted}
              practiceScore={practiceScore}
              xpEarned={xpEarned}
              onSubmitPractice={submitPractice}
            />
          </motion.div>
        </AnimatePresence>

        {/* Forum: shown on the final page so it stays out of the way during learning */}
        {currentPage === totalPages - 1 && <LessonForum lessonId={lessonId} />}
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-card/95 backdrop-blur border-t border-border p-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <Button variant="ghost" onClick={goPrev} disabled={currentPage === 0}>
            <ArrowLeft className="size-4 mr-1" /> Trước
          </Button>
          {currentPage < totalPages - 1 ? (
            <Button onClick={goNext} className="bg-gradient-primary">
              Tiếp theo <ArrowRight className="size-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={() => setShowComplete(true)} disabled={!practiceSubmitted} variant="outline">
              {practiceSubmitted ? "Xem kết quả" : "Nộp bài để hoàn thành"}
            </Button>
          )}
        </div>
      </div>

      {/* Completion modal */}
      <AnimatePresence>
        {showComplete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/50 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="bg-card rounded-3xl p-8 max-w-md w-full text-center shadow-[var(--shadow-card)]">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold">Hoàn thành bài học!</h2>
              {practiceScore && (
                <p className="text-muted-foreground mt-1">
                  Bạn đúng <b>{practiceScore.correct}/{practiceScore.total}</b> câu
                  {" "}({Math.round((practiceScore.correct/practiceScore.total)*100)}%).
                </p>
              )}
              <div className="mt-6 p-4 bg-gradient-to-br from-[color:var(--primary-soft)] to-card rounded-2xl">
                <div className="text-xs text-muted-foreground">XP nhận được</div>
                <div className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">+{xpEarned}</div>
              </div>
              <div className="mt-6 flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowComplete(false)}>Xem lại</Button>
                <Button className="flex-1 bg-gradient-primary" asChild>
                  <Link to="/courses">Khoá học khác</Link>
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------- Step Indicator ----------------
function StepIndicator({ pages, currentPage, maxVisited, onJump }: {
  pages: PageRow[]; currentPage: number; maxVisited: number; onJump: (i: number) => void;
}) {
  return (
    <div className="max-w-3xl mx-auto px-4 pb-4">
      <div className="flex items-center justify-between gap-1">
        {pages.map((p, i) => {
          const reachable = i <= maxVisited;
          const active = i === currentPage;
          const done = i < currentPage;
          return (
            <div key={p.id} className="flex items-center flex-1 last:flex-none">
              <button
                onClick={() => onJump(i)}
                disabled={!reachable}
                className={`relative flex flex-col items-center gap-1 ${reachable ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`}
                aria-label={`Trang ${i + 1}`}
              >
                <div className={`size-8 rounded-full text-xs font-bold flex items-center justify-center transition-all ${
                  active ? "bg-primary text-primary-foreground ring-4 ring-primary/20" :
                  done ? "bg-[color:var(--success)] text-white" :
                  reachable ? "bg-primary-soft text-primary" : "bg-muted text-muted-foreground"
                }`}>
                  {done ? <Check className="size-4" /> : i + 1}
                </div>
                <span className={`text-[10px] font-medium hidden sm:block ${active ? "text-primary" : "text-muted-foreground"}`}>
                  {SHORT_TITLES[p.page_type] ?? `Trang ${i+1}`}
                </span>
              </button>
              {i < pages.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 transition-colors ${i < currentPage ? "bg-[color:var(--success)]" : "bg-muted"}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------- Page Renderer ----------------
function PageRenderer({ page, practiceAnswers, setPracticeAnswers, practiceSubmitted, practiceScore, xpEarned, onSubmitPractice }: any) {
  const c = page.content_json ?? {};

  switch (page.page_type) {
    case "opening":
      return <OpeningPage page={page} c={c} />;

    case "vocabulary":
      return <VocabularyPage page={page} c={c} />;

    case "prior_knowledge":
      // Legacy: separate prior_knowledge page using questions table
      return (
        <div>
          <Chip icon={Lightbulb} color="warning">Kiến thức nền</Chip>
          <h1 className="text-3xl font-bold tracking-tight mb-3">{page.title}</h1>
          {c.description && <p className="text-muted-foreground mb-6">{c.description}</p>}
          {(page.questions ?? []).map((q: any) => (
            <CheckQuestionLegacy key={q.id} question={q} />
          ))}
        </div>
      );

    case "example":
      return <ExamplePage page={page} c={c} />;

    case "summary_practice":
      return (
        <SummaryPracticePage
          page={page} c={c}
          practiceAnswers={practiceAnswers}
          setPracticeAnswers={setPracticeAnswers}
          practiceSubmitted={practiceSubmitted}
          practiceScore={practiceScore}
          xpEarned={xpEarned}
          onSubmitPractice={onSubmitPractice}
        />
      );

    default:
      return <div className="text-muted-foreground">Loại trang chưa hỗ trợ: {page.page_type}</div>;
  }
}

// ---------------- Chip ----------------
function Chip({ icon: Icon, color = "primary", children }: any) {
  const cls = color === "warning"
    ? "bg-[color:var(--warning)]/15 text-[color:var(--warning)]"
    : color === "success"
    ? "bg-success/15 text-[color:var(--success)]"
    : "bg-primary-soft text-primary";
  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-4 ${cls}`}>
      <Icon className="size-3" /> {children}
    </div>
  );
}

// ---------------- Opening Page ----------------
function OpeningPage({ page, c }: any) {
  const objectives: string[] = c.objectives ?? [];
  const prior: PriorKnowledge | null = c.prior_knowledge ?? null;

  return (
    <div>
      <Chip icon={Sparkles}>Mở đầu</Chip>
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{page.title}</h1>
      {c.hook && (
        <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
          <MathContent text={c.hook} />
        </p>
      )}

      {objectives.length > 0 && (
        <section className="mt-8 p-5 rounded-2xl bg-card border border-border">
          <h3 className="font-semibold flex items-center gap-2 mb-3">
            <Trophy className="size-4 text-primary" /> 📌 Mục tiêu bài học
          </h3>
          <ul className="space-y-2">
            {objectives.map((o, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <Check className="size-4 text-[color:var(--success)] shrink-0 mt-0.5" />
                <span><MathContent text={o} /></span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {prior && (
        <section className="mt-6 p-5 rounded-2xl bg-[color:var(--warning)]/8 border border-[color:var(--warning)]/30">
          <h3 className="font-semibold flex items-center gap-2 mb-3">
            <Lightbulb className="size-4 text-[color:var(--warning)]" /> 🔙 Ôn lại kiến thức cũ
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Trước khi học bài này, hãy thử trả lời câu hỏi sau:
          </p>
          <CheckQuestionEmbedded q={prior} />
        </section>
      )}
    </div>
  );
}

// ---------------- Vocabulary Page (tabs) ----------------
function VocabularyPage({ page, c }: any) {
  const [tab, setTab] = useState<"read" | "video">("read");
  const terms: any[] = c.terms ?? [];
  const videoUrl: string | null = c.video_url ?? null;

  return (
    <div>
      <Chip icon={BookMarked}>Từ vựng & Khái niệm</Chip>
      <h1 className="text-3xl font-bold tracking-tight mb-2">{page.title}</h1>
      <p className="text-sm text-muted-foreground mb-5">Chọn cách học phù hợp với bạn:</p>

      {/* Tab switcher */}
      <div className="inline-flex p-1 rounded-xl bg-secondary mb-5">
        {[
          { id: "read", label: "📖 Đọc" },
          { id: "video", label: "🎬 Video" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
              tab === t.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "read" && (
        <div className="space-y-3">
          {terms.length === 0 && <p className="text-muted-foreground text-sm">Chưa có nội dung.</p>}
          {terms.map((t, i) => (
            <div key={i} className="p-5 rounded-2xl bg-card border border-border">
              <div className="font-bold text-lg text-primary"><MathContent text={t.term} /></div>
              <div className="mt-1 text-foreground leading-relaxed"><MathContent text={t.definition} /></div>
              {t.formula && (
                <div className="mt-3 p-3 rounded-lg bg-primary-soft text-center">
                  <MathContent text={t.formula} />
                </div>
              )}
              {t.example && (
                <div className="mt-3 p-3 rounded-lg bg-secondary/50 text-sm">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Ví dụ:</span>{" "}
                  <MathContent text={t.example} />
                </div>
              )}
              {t.note && (
                <div className="mt-3 p-3 rounded-lg border-l-4 border-[color:var(--warning)] bg-[color:var(--warning)]/10 text-sm">
                  <MathContent text={t.note} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "video" && (
        <div className="rounded-2xl bg-card border border-border overflow-hidden">
          {videoUrl ? (
            <div className="aspect-video">
              <iframe src={videoUrl} className="w-full h-full" allowFullScreen title="Video bài giảng" />
            </div>
          ) : (
            <div className="aspect-video flex flex-col items-center justify-center text-muted-foreground bg-secondary/30">
              <PlayCircle className="size-12 mb-2 opacity-50" />
              <p className="text-sm">Video sẽ sớm có. Bạn có thể chuyển sang tab <b>Đọc</b>.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------- Example Page ----------------
function ExamplePage({ page, c }: any) {
  const diff = c.difficulty;
  const diffLabel = diff === "easy" || diff === 1 ? { label: "Dễ", cls: "bg-[color:var(--success)]" }
    : diff === "hard" || diff === 3 ? { label: "Khó", cls: "bg-[color:var(--danger)]" }
    : { label: "Vừa", cls: "bg-[color:var(--warning)]" };

  const checkQ: CheckQ | null = c.check_question ?? null;

  return (
    <div>
      <div className="inline-flex items-center gap-2 mb-4">
        <span className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold">🔍 {page.title}</span>
        <span className={`size-2 rounded-full ${diffLabel.cls}`} />
        <span className="text-xs text-muted-foreground">{diffLabel.label}</span>
      </div>

      {c.problem && (
        <div className="p-5 rounded-2xl bg-card border border-border mb-6">
          <div className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-2">Đề bài</div>
          <div className="text-base leading-relaxed"><MathContent text={c.problem} /></div>
        </div>
      )}

      {Array.isArray(c.steps) && c.steps.length > 0 && (
        <section className="mb-6">
          <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">
            Hướng dẫn giải từng bước
          </h3>
          <div className="space-y-3">
            {c.steps.map((s: any, i: number) => (
              <div key={i} className={`p-4 rounded-xl border ${s.highlight ? "bg-[color:var(--warning)]/8 border-[color:var(--warning)]/40" : "bg-card border-border"}`}>
                <div className="flex gap-3">
                  <div className="size-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shrink-0">{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    {s.title && <div className="font-semibold mb-1">📌 {s.title}</div>}
                    {/* support both new {content} and legacy {text} */}
                    <div className="leading-relaxed text-sm"><MathContent text={s.content ?? s.text ?? ""} /></div>
                    {s.formula && (
                      <div className="mt-2 p-2 rounded-lg bg-primary-soft text-center">
                        <MathContent text={s.formula} />
                      </div>
                    )}
                    {s.note && (
                      <div className="mt-2 text-xs p-2 rounded-lg bg-[color:var(--warning)]/10 border-l-2 border-[color:var(--warning)]">
                        ⚠️ <MathContent text={s.note} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {checkQ && (
        <section className="mt-8">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            ✏️ Thử sức: Câu hỏi tương tự
          </h3>
          <CheckQuestionEmbedded q={checkQ} />
        </section>
      )}

      {/* Legacy: questions from questions table */}
      {(page.questions ?? []).length > 0 && (
        <section className="mt-8">
          <h3 className="font-semibold mb-3">🎯 Kiểm tra hiểu bài</h3>
          {(page.questions ?? []).map((q: any) => (
            <CheckQuestionLegacy key={q.id} question={q} />
          ))}
        </section>
      )}

      {c.remediation && <Collapsible icon={Lightbulb} color="warning" data={c.remediation} label="💡 Cần giải thích thêm?" />}
      {c.enrichment && (
        <Collapsible
          icon={Rocket} color="primary" data={c.enrichment}
          label="🚀 Thử thách nâng cao"
          subtitle="Không ảnh hưởng điểm nếu bỏ qua"
        />
      )}
    </div>
  );
}

// ---------------- Collapsible (remediation/enrichment) ----------------
function Collapsible({ icon: Icon, color, data, label, subtitle }: any) {
  const [open, setOpen] = useState(false);
  const ringCls = color === "warning"
    ? "border-[color:var(--warning)]/40 bg-[color:var(--warning)]/5"
    : "border-primary/30 bg-primary-soft/40";
  return (
    <div className={`mt-4 rounded-2xl border ${ringCls}`}>
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-2 p-4 text-left">
        <Icon className="size-4 shrink-0" />
        <div className="flex-1">
          <div className="font-semibold text-sm">{label}</div>
          {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
        </div>
        <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 text-sm leading-relaxed">
              {data.title && <div className="font-semibold mb-1">{data.title}</div>}
              {data.content && <div className="whitespace-pre-wrap"><MathContent text={data.content} /></div>}
              {data.answer && (
                <div className="mt-2 p-2 rounded-lg bg-card border border-border text-xs">
                  <span className="font-semibold">Gợi ý đáp án: </span><MathContent text={data.answer} />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------- Embedded Check Question (3-attempt feedback loop) ----------------
function CheckQuestionEmbedded({ q }: { q: PriorKnowledge | CheckQ }) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const correct = selectedIdx === q.correct;
  const maxAttempts = 3;

  const handleCheck = () => {
    if (selectedIdx == null) return;
    const next = attempts + 1;
    setAttempts(next);
    setShowResult(true);
    if (selectedIdx === q.correct) {
      toast.success("Chính xác! 🎉");
    } else if (next >= maxAttempts) {
      setRevealed(true);
    }
  };
  const handleRetry = () => { setShowResult(false); setSelectedIdx(null); };

  return (
    <div className="p-4 rounded-xl bg-card border border-border">
      <div className="font-medium mb-3"><MathContent text={q.question} /></div>
      <div className="space-y-2">
        {q.options.map((opt, i) => {
          const isCorrect = (showResult || revealed) && i === q.correct;
          const isWrong = showResult && i === selectedIdx && !correct;
          const isPicked = selectedIdx === i;
          const locked = (showResult && correct) || revealed;
          return (
            <button
              key={i}
              onClick={() => !locked && setSelectedIdx(i)}
              disabled={locked}
              className={`w-full text-left p-3 rounded-lg border-2 transition-all text-sm ${
                isCorrect ? "border-[color:var(--success)] bg-success/10" :
                isWrong ? "border-[color:var(--danger)] bg-danger/10" :
                isPicked ? "border-primary bg-primary-soft" : "border-border hover:border-primary/50"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="size-5 rounded-full border border-current/40 text-xs font-bold flex items-center justify-center shrink-0">
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="flex-1"><MathContent text={opt} /></span>
                {isCorrect && <Check className="size-4 text-[color:var(--success)]" />}
                {isWrong && <X className="size-4 text-[color:var(--danger)]" />}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {!showResult && (
          <Button onClick={handleCheck} disabled={selectedIdx == null} size="sm">
            Kiểm tra
          </Button>
        )}
        {showResult && !correct && attempts < maxAttempts && (
          <Button onClick={handleRetry} variant="outline" size="sm">Thử lại ({maxAttempts - attempts} lần)</Button>
        )}
        <span className="text-xs text-muted-foreground">Bạn có thể bỏ qua và đi tiếp.</span>
      </div>

      {showResult && (
        <div className={`mt-3 p-3 rounded-lg text-sm ${correct ? "bg-success/15 text-[color:var(--success)]" : "bg-danger/10"}`}>
          {correct ? (
            <>
              ✅ <span className="font-semibold">Bạn đã sẵn sàng!</span>{" "}
              {q.explanation && <span className="text-foreground"><MathContent text={q.explanation} /></span>}
            </>
          ) : revealed ? (
            <div className="text-foreground">
              <div className="font-semibold text-[color:var(--danger)] mb-1">Đáp án đúng: {String.fromCharCode(65 + q.correct)}</div>
              {q.explanation && <MathContent text={q.explanation} />}
            </div>
          ) : (
            <div className="text-foreground">
              <span className="font-semibold text-[color:var(--danger)]">❌ Chưa đúng. </span>
              {"hint" in q && q.hint && <span>💡 <MathContent text={q.hint} /></span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------- Legacy Check Question (questions table) ----------------
function CheckQuestionLegacy({ question }: { question: any }) {
  const opts = Array.isArray(question.options_json) ? question.options_json : [];
  const correctIdx = opts.findIndex((o: string) => o === question.correct_answer);
  const q: CheckQ = {
    question: question.question_text,
    options: opts,
    correct: correctIdx >= 0 ? correctIdx : 0,
    explanation: question.explanation,
    hint: question.hint_text,
  };
  return <CheckQuestionEmbedded q={q} />;
}

// ---------------- Summary + Practice Page ----------------
function SummaryPracticePage({ page, c, practiceAnswers, setPracticeAnswers, practiceSubmitted, practiceScore, xpEarned, onSubmitPractice }: any) {
  // Embedded practice_questions (new) or legacy questions
  const list: any[] = useMemo(() => {
    if (Array.isArray(c.practice_questions) && c.practice_questions.length > 0) {
      return c.practice_questions.map((q: any, i: number) => ({
        __key: `__pq_${i}`,
        question: q.question,
        options: q.options ?? [],
        correctAnswer: q.options?.[q.correct],
        correctIdx: q.correct,
        explanation: q.explanation,
      }));
    }
    return (page.questions ?? []).map((q: any) => {
      const opts = Array.isArray(q.options_json) ? q.options_json : [];
      return {
        __key: q.id,
        question: q.question_text,
        options: opts,
        correctAnswer: q.correct_answer,
        correctIdx: opts.findIndex((o: string) => o === q.correct_answer),
        explanation: q.explanation,
      };
    });
  }, [c, page.questions]);

  const formulas: string[] = c.summary_formulas ?? c.formulas ?? [];
  const summary: string[] = c.summary ?? [];
  const allAnswered = list.length === 0 || list.every((q) => practiceAnswers[q.__key] != null);

  return (
    <div>
      <Chip icon={Trophy} color="success">Tổng kết</Chip>
      <h1 className="text-3xl font-bold tracking-tight mb-6">{page.title}</h1>

      {(summary.length > 0 || formulas.length > 0) && (
        <section className="mb-6">
          <h3 className="font-semibold mb-3">📋 Tóm tắt bài học</h3>
          {summary.length > 0 && (
            <ul className="space-y-2 mb-3">
              {summary.map((s, i) => (
                <li key={i} className="flex gap-2 text-sm"><span className="text-primary">•</span><MathContent text={s} /></li>
              ))}
            </ul>
          )}
          {formulas.length > 0 && (
            <div className="grid gap-2">
              {formulas.map((f, i) => (
                <div key={i} className="p-4 rounded-xl bg-primary-soft border border-primary/20 text-center">
                  📐 <MathContent text={f} />
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="mt-8 p-5 rounded-2xl bg-card border border-border">
        <h3 className="font-semibold mb-1">✏️ Bài tập thực hành ({list.length} câu)</h3>
        <p className="text-xs text-muted-foreground mb-4">
          ⚠️ Lưu ý: Làm hết rồi mới nộp! Điểm tính theo đáp án cuối cùng.
        </p>

        {list.length === 0 ? (
          <Button onClick={onSubmitPractice} disabled={practiceSubmitted} className="w-full bg-gradient-primary">
            {practiceSubmitted ? "Đã hoàn thành" : "Hoàn thành bài học"}
          </Button>
        ) : (
          <>
            <div className="space-y-4">
              {list.map((q, idx) => (
                <PracticeQuestion
                  key={q.__key}
                  q={q}
                  idx={idx}
                  value={practiceAnswers[q.__key]}
                  onChange={(v: string) => setPracticeAnswers((prev: Record<string, string>) => ({ ...prev, [q.__key]: v }))}
                  submitted={practiceSubmitted}
                />
              ))}
            </div>
            {!practiceSubmitted ? (
              <Button onClick={onSubmitPractice} disabled={!allAnswered}
                className="w-full mt-6 bg-gradient-primary py-6 text-base font-semibold">
                {allAnswered ? "🚀 NỘP BÀI" : `Còn ${list.length - Object.keys(practiceAnswers).length} câu chưa làm`}
              </Button>
            ) : practiceScore && (
              <div className="mt-6 p-5 rounded-2xl bg-gradient-to-br from-[color:var(--primary-soft)] to-card border border-primary/20 text-center">
                <div className="text-3xl mb-1">🎉</div>
                <div className="font-semibold">
                  Kết quả: {practiceScore.correct}/{practiceScore.total} câu đúng
                  {" "}({Math.round((practiceScore.correct/practiceScore.total)*100)}%)
                </div>
                <div className="text-2xl font-bold mt-2 bg-gradient-primary bg-clip-text text-transparent">+{xpEarned} XP</div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function PracticeQuestion({ q, idx, value, onChange, submitted }: any) {
  const options: string[] = q.options ?? [];
  const correctAnswer = q.correctAnswer;
  const isCorrect = value === correctAnswer;

  return (
    <div className={`p-4 rounded-xl border ${
      submitted ? (isCorrect ? "border-[color:var(--success)]/40 bg-success/5" : "border-[color:var(--danger)]/40 bg-danger/5") : "border-border bg-secondary/20"
    }`}>
      <div className="font-medium mb-3 flex gap-2">
        <span className="text-muted-foreground shrink-0">Câu {idx + 1}.</span>
        <div className="flex-1"><MathContent text={q.question} /></div>
        {submitted && (isCorrect
          ? <Check className="size-5 text-[color:var(--success)] shrink-0" />
          : <X className="size-5 text-[color:var(--danger)] shrink-0" />)}
      </div>
      <div className="space-y-1.5">
        {options.map((opt, i) => {
          const isThisCorrect = submitted && opt === correctAnswer;
          const isThisWrong = submitted && opt === value && !isCorrect;
          return (
            <button key={i} onClick={() => !submitted && onChange(opt)} disabled={submitted}
              className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-all ${
                isThisCorrect ? "border-[color:var(--success)] bg-success/10" :
                isThisWrong ? "border-[color:var(--danger)] bg-danger/10" :
                value === opt ? "border-primary bg-primary-soft" : "border-border hover:border-primary/50"
              }`}>
              <span className="font-bold mr-2">{String.fromCharCode(65 + i)}.</span>
              <MathContent text={opt} />
            </button>
          );
        })}
      </div>
      {submitted && !isCorrect && (
        <div className="mt-2 p-2 rounded-lg bg-card border border-border text-xs">
          <div className="font-semibold text-[color:var(--success)] mb-0.5">
            Đáp án đúng: <MathContent text={correctAnswer ?? ""} />
          </div>
          {q.explanation && <div className="text-muted-foreground">💡 <MathContent text={q.explanation} /></div>}
        </div>
      )}
    </div>
  );
}
