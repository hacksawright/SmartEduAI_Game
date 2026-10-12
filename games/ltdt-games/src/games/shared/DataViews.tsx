// Các khối dữ liệu trong panel: hàng đợi, ngăn xếp, thứ tự thăm, mã giả, thanh đua với máy.

import { Bot, User } from "lucide-react";
import type { VertexId } from "../../core/graph";

export function QueueView(props: { queue: VertexId[]; pending?: VertexId[]; label?: string }) {
  const { queue, pending = [] } = props;
  const all = [...queue.map((v) => ({ v, ghost: false })), ...pending.map((v) => ({ v, ghost: true }))];
  return (
    <div className="lg-dv">
      <p className="lg-dv__label">{props.label ?? "Hàng đợi"}</p>
      <ol className="lg-queue" aria-label={`Hàng đợi: ${queue.length ? queue.join(", ") : "rỗng"}`}>
        {all.length === 0 && <li className="lg-queue__empty">rỗng</li>}
        {all.map((x, i) => (
          <li key={`${x.v}-${i}-${x.ghost}`} className={`lg-queue__cell${x.ghost ? " lg-queue__cell--ghost" : ""}`}>
            <span className="lg-queue__v">{x.v}</span>
            {i === 0 && !x.ghost && <span className="lg-queue__tag">Đầu</span>}
            {i === queue.length - 1 && !x.ghost && queue.length > 1 && <span className="lg-queue__tag">Cuối</span>}
            {x.ghost && <span className="lg-queue__tag">mới</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function StackView({ stack }: { stack: VertexId[] }) {
  const top = stack.length - 1;
  return (
    <div className="lg-dv">
      <p className="lg-dv__label">Ngăn xếp</p>
      <ol className="lg-stack" aria-label={`Ngăn xếp từ đáy lên đỉnh: ${stack.length ? stack.join(", ") : "rỗng"}`}>
        {stack.length === 0 && <li className="lg-queue__empty">rỗng</li>}
        {stack.map((v, i) => (
          <li key={`${v}-${i}`} className={`lg-stack__cell${i === top ? " lg-stack__cell--top" : ""}`}>
            <span className="lg-queue__v">{v}</span>
            {i === top && <span className="lg-queue__tag">Đỉnh</span>}
            {i === 0 && top > 0 && <span className="lg-queue__tag">Đáy</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function VisitOrder({ order, label = "Thứ tự thăm" }: { order: VertexId[]; label?: string }) {
  return (
    <div className="lg-dv">
      <p className="lg-dv__label">{label}</p>
      <p className="lg-visit lg-mono" aria-label={`${label}: ${order.join(", ")}`}>
        {order.map((v, i) => (
          <span key={`${v}-${i}`} className="lg-visit__v">
            {v}
          </span>
        ))}
      </p>
    </div>
  );
}

export function Pseudocode({ lines, active, title = "Mã giả" }: { lines: string[]; active: number[]; title?: string }) {
  return (
    <div className="lg-dv">
      <p className="lg-dv__label">{title}</p>
      <ol className="lg-pseudo lg-mono">
        {lines.map((l, i) => {
          const on = active.includes(i + 1);
          return (
            <li key={i} className={on ? "lg-pseudo__on" : undefined} aria-current={on ? "step" : undefined}>
              <span className="lg-pseudo__n" aria-hidden="true">
                {i + 1}
              </span>
              <span className="lg-pseudo__code">{l}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function RaceTrack(props: { you: number; bot: number; total: number; secondsPerStep: number; nextIn: number }) {
  const pct = (n: number) => `${Math.min(100, (n / Math.max(1, props.total)) * 100)}%`;
  return (
    <div className="lg-race" aria-label={`Bạn ${props.you}/${props.total} câu, máy ${props.bot}/${props.total} câu`}>
      <div className="lg-race__row">
        <span className="lg-race__who">
          <User size={16} aria-hidden="true" /> Bạn
        </span>
        <div className="lg-race__bar">
          <span className="lg-race__fill lg-race__fill--you" style={{ width: pct(props.you) }} />
        </div>
        <span className="lg-race__n lg-mono">
          {props.you}/{props.total}
        </span>
      </div>
      <div className="lg-race__row">
        <span className="lg-race__who">
          <Bot size={16} aria-hidden="true" /> Máy
        </span>
        <div className="lg-race__bar">
          <span className="lg-race__fill lg-race__fill--bot" style={{ width: pct(props.bot) }} />
        </div>
        <span className="lg-race__n lg-mono">
          {props.bot}/{props.total}
        </span>
      </div>
      <p className="lg-race__hint lg-muted">
        Máy trả lời 1 câu mỗi {props.secondsPerStep} giây · câu tiếp sau <span className="lg-mono">{props.nextIn}s</span>
      </p>
    </div>
  );
}
