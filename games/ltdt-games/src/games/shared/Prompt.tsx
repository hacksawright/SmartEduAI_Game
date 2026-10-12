import { CircleCheck, CircleX, Lightbulb, Zap } from "lucide-react";
import type { ReactNode } from "react";
import type { HintCardState } from "./session";

export function Question(props: { kicker?: string; step?: number; total?: number; children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="lg-q">
      <p className="lg-q__kicker">
        {props.kicker ?? "Câu hỏi"}
        {props.step !== undefined && props.total !== undefined && (
          <span className="lg-q__step lg-mono">
            {" "}
            · Bước {props.step}/{props.total}
          </span>
        )}
      </p>
      <h2 className="lg-q__text">{props.children}</h2>
      {props.sub && <p className="lg-q__sub">{props.sub}</p>}
    </div>
  );
}

export function HintCard(props: { hint: HintCardState; canMore: boolean; onMore: () => void }) {
  const { hint } = props;
  return (
    <div className="lg-hintcard" role="note" aria-label={`Gợi ý mức ${hint.level}`}>
      <Lightbulb size={20} className="lg-hintcard__icon" aria-hidden="true" />
      <div className="lg-hintcard__body">
        <p className="lg-hintcard__label">
          Gợi ý {hint.level}/2{hint.loading && <span className="lg-muted"> · đang hỏi trợ giảng…</span>}
        </p>
        <p className="lg-hintcard__text">{hint.text}</p>
        {props.canMore && (
          <button type="button" className="lg-btn lg-btn--sm lg-hintcard__more" onClick={props.onMore}>
            Gợi ý cụ thể hơn (−1 sao)
          </button>
        )}
      </div>
    </div>
  );
}

export type FeedbackState =
  | { kind: "none" }
  | { kind: "ok"; title?: string; text?: string }
  | { kind: "bad"; title?: string; text: string };

export function FeedbackCard({ fb }: { fb: FeedbackState }) {
  if (fb.kind === "none") return null;
  const ok = fb.kind === "ok";
  const lines = (fb.text ?? "").split("\n").filter(Boolean);
  return (
    <div className={`lg-fb ${ok ? "lg-fb--ok" : "lg-fb--bad"}`} role={ok ? "status" : "alert"}>
      {ok ? (
        <CircleCheck size={22} className="lg-fb__icon" aria-hidden="true" />
      ) : (
        <CircleX size={22} className="lg-fb__icon" aria-hidden="true" />
      )}
      <div className="lg-fb__body">
        <p className="lg-fb__title">{fb.title ?? (ok ? "Đúng" : "Chưa đúng")}</p>
        {lines.length === 1 && <p className="lg-fb__text">{lines[0]}</p>}
        {lines.length > 1 && (
          <ul className="lg-fb__lines lg-mono">
            {lines.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function StreakChip({ streak }: { streak: number }) {
  if (streak < 2) return null;
  return (
    <span key={streak} className="lg-chip lg-chip--accent lg-streak" aria-label={`${streak} câu đúng liên tiếp`}>
      <Zap size={14} aria-hidden="true" />
      <span className="lg-mono">{streak}</span> đúng liên tiếp
    </span>
  );
}
