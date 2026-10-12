import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { GraphChapter } from "@/lib/graph-chapters";
import { cn } from "@/lib/utils";
import { POINTS_PER_CORRECT } from "@/lib/week";
import { saveChapterAttempt } from "./api";
import { attemptXp, chapterMaxPoints } from "./scoring";
import { QuizResult, type AnswerRecord } from "./QuizResult";
import { focusRing, surface } from "./ui";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

export function ChapterQuiz({
  chapter,
  weekStart,
  previousBest,
  onExit,
  onRestart,
  onSaved,
}: {
  chapter: GraphChapter;
  weekStart: string;
  previousBest: number;
  onExit: () => void;
  onRestart: () => void;
  onSaved: () => Promise<void>;
}) {
  const { user } = useAuth();
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [synced, setSynced] = useState(false);
  const [savedPoints, setSavedPoints] = useState<number | null>(null);
  const [saveError, setSaveError] = useState(false);
  // điểm cao nhất của chương tại lúc nộp bài (prop previousBest được tải lại sau khi lưu)
  const [bestAtSubmit, setBestAtSubmit] = useState(previousBest);
  // chỉ để hiển thị tiến độ và phần xem lại; điểm vẫn tính từ correctCount như trước
  const [history, setHistory] = useState<AnswerRecord[]>([]);
  const [confirmExit, setConfirmExit] = useState(false);
  const promptRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);
  const finishing = useRef(false);

  const question = chapter.questions[index];
  const total = chapter.questions.length;
  const maxPoints = chapterMaxPoints(chapter);
  const isLast = index + 1 >= total;

  const reveal = () => {
    if (!selected || revealed) return;
    const correct = selected === question.answer;
    if (correct) setCorrectCount((count) => count + 1);
    setHistory((items) => [...items, { question, chosen: selected, correct }]);
    setRevealed(true);
  };

  const next = async () => {
    if (index + 1 < total) {
      setIndex((value) => value + 1);
      setSelected(null);
      setRevealed(false);
      return;
    }
    // bấm/nhấn Enter liên tiếp ở câu cuối không được lưu hai lần
    if (finishing.current) return;
    finishing.current = true;
    const finalCorrect = correctCount;
    const finalPoints = finalCorrect * POINTS_PER_CORRECT;
    setDone(true);
    setSavedPoints(finalPoints);
    setBestAtSubmit(previousBest);
    if (!user) return;
    setSaving(true);
    const result = await saveChapterAttempt(supabase, {
      userId: user.id,
      chapter,
      correctCount: finalCorrect,
      weekStart,
      previousBest,
    });
    if (!result.saved) {
      setSaveError(true);
      toast.error("Chưa lưu được điểm. Hãy chạy migration chương trong Supabase, rồi làm lại.");
      setSaving(false);
      return;
    }
    setSaving(false);
    await onSaved();
    setSynced(true);
  };

  // Chuyển câu: đưa focus về đề bài để người dùng bàn phím/trình đọc màn hình bắt đầu từ đầu câu
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    promptRef.current?.focus();
  }, [index]);

  // Phím tắt: 1–4 hoặc A–D chọn đáp án, Enter để kiểm tra / sang câu tiếp
  const handlers = useRef({ reveal, next, revealed, options: question.options });
  handlers.current = { reveal, next, revealed, options: question.options };
  useEffect(() => {
    if (done) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("[role=dialog],[role=alertdialog],textarea,input[type=text]")) return;
      const h = handlers.current;
      if (!h.revealed) {
        const key = event.key.toLowerCase();
        const pick =
          "1234".includes(key) && key.length === 1 ? Number(key) - 1 : "abcd".indexOf(key);
        if (key.length === 1 && pick >= 0 && pick < h.options.length) {
          event.preventDefault();
          setSelected(h.options[pick]);
          return;
        }
      }
      if (event.key === "Enter") {
        // nút và liên kết tự xử lý Enter
        if (target?.closest("button,a")) return;
        event.preventDefault();
        if (h.revealed) void h.next();
        else h.reveal();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [done]);

  if (done) {
    return (
      <QuizResult
        chapter={chapter}
        correctCount={correctCount}
        savedPoints={savedPoints ?? 0}
        maxPoints={maxPoints}
        previousBest={previousBest}
        bestAtSubmit={bestAtSubmit}
        xp={attemptXp(savedPoints ?? 0, bestAtSubmit)}
        saving={saving}
        saveError={saveError}
        canRestart={!saving && (synced || saveError || !user)}
        history={history}
        onExit={onExit}
        onRestart={onRestart}
      />
    );
  }

  const correct = selected === question.answer;
  const requestExit = () => {
    if (index === 0 && !selected && !revealed) onExit();
    else setConfirmExit(true);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-5 md:px-8 md:py-10">
      <header className="flex items-center gap-3">
        <Button
          variant="ghost"
          onClick={requestExit}
          className={cn("min-h-11 gap-1.5 px-3 text-muted-foreground", focusRing)}
        >
          <X aria-hidden /> Thoát
        </Button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-muted-foreground">
            Chương {chapter.order} · {chapter.title}
          </p>
          <ol className="mt-1.5 flex gap-1.5" aria-label="Tiến độ bài làm">
            {chapter.questions.map((item, i) => {
              const record = history[i];
              const state = record
                ? record.correct
                  ? "đúng"
                  : "sai"
                : i === index
                  ? "đang làm"
                  : "chưa làm";
              return (
                <li
                  key={item.id}
                  className={cn(
                    "h-2 flex-1 rounded-full transition-colors duration-200",
                    state === "đúng" && "bg-success",
                    state === "sai" && "bg-danger",
                    state === "đang làm" && "bg-primary",
                    state === "chưa làm" && "bg-muted",
                  )}
                >
                  <span className="sr-only">
                    Câu {i + 1}: {state}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
        <span className="shrink-0 text-sm font-bold tabular-nums" aria-hidden>
          {index + 1}/{total}
        </span>
      </header>

      <section className={cn(surface, "mt-5 p-5 md:p-7")} aria-labelledby="quiz-prompt">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary-strong">
          Câu {index + 1} / {total}
        </p>
        <h1
          id="quiz-prompt"
          ref={promptRef}
          tabIndex={-1}
          className="mt-2 text-lg font-semibold leading-snug outline-none md:text-xl"
        >
          {question.prompt}
        </h1>

        <div role="radiogroup" aria-labelledby="quiz-prompt" className="mt-5 space-y-2.5">
          {question.options.map((option, i) => {
            const isSelected = selected === option;
            const showCorrect = revealed && option === question.answer;
            const showWrong = revealed && isSelected && option !== question.answer;
            return (
              <label
                key={option}
                className={cn(
                  "flex min-h-14 items-center gap-3 rounded-2xl border-2 px-4 py-3 transition-colors duration-150",
                  "has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-primary has-[:focus-visible]:ring-offset-2",
                  revealed ? "cursor-default" : "cursor-pointer",
                  showCorrect
                    ? "border-success-strong bg-success-soft"
                    : showWrong
                      ? "border-danger-strong bg-danger-soft"
                      : isSelected
                        ? "border-primary bg-primary-soft"
                        : revealed
                          ? "border-border opacity-70"
                          : "border-border hover:border-primary/60 hover:bg-primary-soft/40",
                )}
              >
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  value={option}
                  checked={isSelected}
                  disabled={revealed}
                  onChange={() => setSelected(option)}
                  className="sr-only"
                />
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-lg border text-sm font-bold",
                    showCorrect
                      ? "border-success-strong bg-success-strong text-white"
                      : showWrong
                        ? "border-danger-strong bg-danger-strong text-white"
                        : isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground",
                  )}
                  aria-hidden
                >
                  {showCorrect ? (
                    <Check className="size-4" />
                  ) : showWrong ? (
                    <X className="size-4" />
                  ) : (
                    LETTERS[i]
                  )}
                </span>
                <span className="flex-1 text-[15px] leading-snug">{option}</span>
                {showCorrect && <span className="sr-only">(đáp án đúng)</span>}
                {showWrong && <span className="sr-only">(bạn chọn, chưa đúng)</span>}
              </label>
            );
          })}
        </div>

        <div role="status" aria-live="polite">
          {revealed && (
            <div
              className={cn(
                "mt-5 flex gap-3 rounded-2xl border p-4 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1",
                correct
                  ? "border-success-strong/30 bg-success-soft"
                  : "border-danger-strong/30 bg-danger-soft",
              )}
            >
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full text-white",
                  correct ? "bg-success-strong" : "bg-danger-strong",
                )}
                aria-hidden
              >
                {correct ? <Check className="size-4" /> : <X className="size-4" />}
              </span>
              <div className="min-w-0 text-sm">
                <p
                  className={cn(
                    "font-bold",
                    correct ? "text-success-strong" : "text-danger-strong",
                  )}
                >
                  {correct ? `Chính xác! +${POINTS_PER_CORRECT} điểm` : "Chưa đúng"}
                </p>
                {!correct && (
                  <p className="mt-0.5">
                    Đáp án đúng: <span className="font-semibold">{question.answer}</span>
                  </p>
                )}
                <p className="mt-1 text-foreground/80">{question.explanation}</p>
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] -mx-4 mt-4 border-t border-border bg-background/95 px-4 py-3 backdrop-blur md:static md:mx-0 md:mt-5 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <div className="flex items-center gap-4">
          <p className="hidden flex-1 text-xs text-muted-foreground md:block">
            Phím tắt: <Kbd>1</Kbd>–<Kbd>4</Kbd> chọn đáp án · <Kbd>Enter</Kbd>{" "}
            {revealed ? (isLast ? "xem điểm" : "sang câu tiếp") : "kiểm tra"}
          </p>
          <Button
            onClick={revealed ? () => void next() : reveal}
            disabled={!revealed && !selected}
            className={cn(
              "h-12 w-full gap-2 rounded-xl text-base font-semibold md:w-auto md:min-w-44",
              focusRing,
            )}
          >
            {revealed ? (isLast ? "Xem điểm" : "Câu tiếp") : "Kiểm tra"}
            {revealed && <ArrowRight aria-hidden />}
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmExit} onOpenChange={setConfirmExit}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Thoát bài làm?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn đang làm dở chương {chapter.order}. Nếu thoát bây giờ, lần làm này sẽ không được
              lưu và không tính điểm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11">Làm tiếp</AlertDialogCancel>
            <AlertDialogAction
              className="min-h-11 bg-danger-strong text-white hover:bg-danger-strong/90"
              onClick={onExit}
            >
              Thoát, không lưu
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded-md border border-border bg-card px-1.5 py-0.5 font-sans text-[11px] font-semibold text-foreground shadow-[var(--shadow-soft)]">
      {children}
    </kbd>
  );
}
