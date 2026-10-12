// Xếp thứ tự cho Greedy (Ch.5 – Tô màu). GDD mục 7.

import { FastForward, Play, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useGames } from "../../app/GamesContext";
import { orderFromPicked, runGreedy, togglePicked } from "../../core/games/greedyOrder";
import { makeGraph, type Edge, type VertexId } from "../../core/graph";
import type { GreedyLevel } from "../../core/levels/types";
import { greedyOutcome } from "../../core/scoring";
import { GraphBoard, type EdgeView, type VertexView } from "../../ui/board/GraphBoard";
import { Pseudocode } from "../shared/DataViews";
import { findEdge, fmtTime } from "../shared/graphUtil";
import { SessionOverlays } from "../shared/Overlays";
import { PlayShell } from "../shared/PlayShell";
import { FeedbackCard, HintCard, Question, type FeedbackState } from "../shared/Prompt";
import { useLevelSession } from "../shared/session";
import { bumpFx, emptyFx, type Fx, type GameProps } from "../shared/types";
import { firstOverflow, greedyHint, greedyTrace, neighborText, oiFill, oiText, overflowText, type GreedyStepInfo } from "./logic";
import { greedyWhy } from "./why";

const HINT_KEY = "level";
const PSEUDO = ["for v in thứ tự:", "  bỏ các màu mà đỉnh kề đã tô dùng", "  tô v bằng màu nhỏ nhất còn lại"];

interface Run {
  /** lần chạy thứ mấy, từ 1 */
  id: number;
  order: VertexId[];
  trace: GreedyStepInfo[];
  /** số đỉnh đã tô */
  i: number;
}

export function GreedyPlay({ level, levelId, race, onRestart }: GameProps<GreedyLevel>) {
  const g = useGames();
  const graph = useMemo(() => makeGraph(level.graph), [level]);
  const session = useLevelSession(level, levelId, race);
  const n = graph.vertices.length;
  const chi = level.chi;

  const [picked, setPicked] = useState<VertexId[]>([]);
  const [runs, setRuns] = useState<VertexId[][]>([]);
  const [run, setRun] = useState<Run | null>(null);
  const [won, setWon] = useState(false);
  const [fx, setFx] = useState<Fx>(emptyFx);
  const [fb, setFb] = useState<FeedbackState>({ kind: "none" });
  const [live, setLive] = useState("");

  const order = useMemo(() => orderFromPicked(graph, picked), [graph, picked]);
  const counts = useMemo(() => runs.map((o) => runGreedy(graph, o).count), [graph, runs]);
  const animating = !!run && run.i < run.trace.length;
  const finished = !!run && !animating;
  const playing = session.phase === "play" && !won;
  const last = runs[runs.length - 1];
  const sameAsLast = !!last && last.join(" ") === order.join(" ");

  // tô từng đỉnh một, theo nhịp
  useEffect(() => {
    if (!run || run.i >= run.trace.length) return;
    const s = run.trace[run.i];
    const t = window.setTimeout(
      () => {
        g.play("tick", { rate: 0.8 + 0.12 * (s.color - 1) });
        setFx((f) =>
          bumpFx(f, { pops: [s.v], flows: s.colored.map((u) => [findEdge(graph, u, s.v)!.id, u] as [string, string]) }),
        );
        setRun({ ...run, i: run.i + 1 });
      },
      g.reducedMotion ? 60 : run.i === 0 ? 300 : 460,
    );
    return () => window.clearTimeout(t);
    // run mới nhất đọc qua closure của lần vẽ này
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);

  // tô xong: đạt χ thì thắng, không thì chỉ ra chỗ Greedy phải mở màu thừa
  useEffect(() => {
    if (!run || !finished) return;
    const count = Math.max(...run.trace.map((s) => s.color));
    if (count === chi) {
      setWon(true);
      g.play("correct");
      setFb({ kind: "ok", title: `Chỉ ${chi} màu!`, text: `Bằng đúng χ(G) = ${chi}: không thể tô đồ thị này bằng ít màu hơn.` });
      setLive(`Greedy dùng ${count} màu, đạt mục tiêu.`);
    } else {
      const s = firstOverflow(run.trace, chi)!;
      const text = `${overflowText(s)} Mục tiêu là ${chi} màu: xếp lại thứ tự rồi chạy lại.`;
      g.play("stuck");
      setFb({ kind: "bad", title: `Greedy dùng ${count} màu`, text });
      setLive(`Greedy dùng ${count} màu. ${text}`);
    }
    // chỉ một lần khi một lần chạy vừa tô xong
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished, run?.id]);

  useEffect(() => {
    if (!won) return;
    const t = window.setTimeout(
      () => void session.complete((hints) => ({ kind: "greedy_order", runs, hints })),
      g.reducedMotion ? 300 : 1100,
    );
    return () => window.clearTimeout(t);
    // chỉ một lần khi vừa thắng
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [won]);

  const tap = (v: VertexId) => {
    if (!playing || animating) return;
    const next = togglePicked(picked, v);
    const removed = next.length < picked.length;
    g.play("toggle", { rate: removed ? 0.85 : 1 });
    setPicked(next);
    setRun(null);
    setFb({ kind: "none" });
    setFx((f) => bumpFx(f, { pops: [v] }));
    setLive(removed ? `Bỏ ${v} khỏi đầu thứ tự.` : `Đưa ${v} lên vị trí ${next.length}.`);
  };

  const reset = () => {
    if (!playing || animating) return;
    g.play("undo");
    setPicked([]);
    setRun(null);
    setFb({ kind: "none" });
    setLive(`Thứ tự về lại 1 đến ${n}.`);
  };

  const start = () => {
    if (!playing || animating || sameAsLast) return;
    g.play("open");
    const id = runs.length + 1;
    setRuns([...runs, order]);
    setRun({ id, order, trace: greedyTrace(graph, order), i: 0 });
    setFb({ kind: "none" });
    setLive(`Lần chạy ${id}: Greedy tô theo thứ tự ${order.join(", ")}.`);
  };

  const skip = () => {
    if (!run || !animating) return;
    g.play("tick", { rate: 1.3 });
    setFx((f) => bumpFx(f, { pops: run.trace.slice(run.i).map((s) => s.v) }));
    setRun({ ...run, i: run.trace.length });
  };

  const hint = session.hintFor(HINT_KEY);
  const hintSet = new Set(hint?.highlight ?? []);
  const onHint = () =>
    session.requestHint(
      HINT_KEY,
      (lvl) => greedyHint(graph, picked, lvl),
      `Xếp thứ tự cho Greedy, ${n} đỉnh, χ(G) = ${chi}; thứ tự hiện tại ${order.join(", ")}; đã chạy ${runs.length} lần${
        last ? `, lần gần nhất dùng ${counts[counts.length - 1]} màu` : ""
      }`,
    );

  // ----- hiển thị -----
  const colors = useMemo(() => {
    const m = new Map<VertexId, number>();
    if (run) for (const s of run.trace.slice(0, run.i)) m.set(s.v, s.color);
    return m;
  }, [run]);
  const nextStep = run && animating ? run.trace[run.i] : null;
  const over = run && finished && !won ? firstOverflow(run.trace, chi) : null;
  const overEdges = new Set(over ? over.colored.map((u) => findEdge(graph, u, over.v)!.id) : []);
  const usedNow = colors.size ? Math.max(...colors.values()) : 0;

  const vertex = (id: VertexId): VertexView => {
    const c = colors.get(id);
    const pickedAt = picked.indexOf(id) + 1;
    const parts = [`vị trí ${order.indexOf(id) + 1} trong thứ tự${pickedAt ? ", đã chạm" : ""}`];
    if (c) parts.push(`màu ${c}`);
    if (hintSet.has(id)) parts.push("được gợi ý");
    const base: VertexView = {
      ring: hintSet.has(id) ? "hint" : over?.v === id ? "error" : undefined,
      pulse: nextStep?.v === id,
      pop: fx.pops[id],
      shake: fx.shakes[id],
      disabled: animating,
      ariaLabel: `Đỉnh ${id}, ${parts.join(", ")}`,
    };
    if (c) return { ...base, fill: oiFill(c), textColor: oiText(c), badge: c, badgeColor: { fill: oiFill(c), text: oiText(c) } };
    if (!run && pickedAt) return { ...base, ring: base.ring ?? "select", badge: pickedAt, badgeTone: "select" };
    return base;
  };

  const edge = (e: Edge): EdgeView => ({
    state: overEdges.has(e.id) ? "active" : "idle",
    flow: fx.flows[e.id]?.n,
    flowFrom: fx.flows[e.id]?.from,
  });

  // sao tối đa nếu lần chạy đang tô (hoặc lần chạy kế tiếp) đạt χ
  const basis = animating || won ? runs.length : runs.length + 1;
  const stars = greedyOutcome({ runs: basis, hints: session.hints }).stars;

  const sub = nextStep
    ? `Greedy đang tô đỉnh ${nextStep.v}: ${neighborText(nextStep)}.`
    : won
      ? `Thứ tự ${order.join(", ")} giúp Greedy dùng đúng ${chi} màu.`
      : finished
        ? "Chạm một đỉnh để xếp lại thứ tự rồi chạy lại."
        : picked.length
          ? "Chạm thêm đỉnh để xếp tiếp, chạm lại để bỏ. Xong thì bấm Chạy Greedy."
          : "Chạm các đỉnh để đưa chúng lên đầu thứ tự, theo thứ tự chạm.";

  return (
    <PlayShell
      level={level}
      race={race}
      stars={stars}
      starsLabel={`Tối đa ${stars} sao nếu lần chạy ${basis} dùng ${chi} màu`}
      canHint={session.canHint(HINT_KEY) && playing && !animating}
      onHint={onHint}
      board={
        <GraphBoard
          graph={graph}
          label={`Đồ thị ${n} đỉnh, ${graph.edges.length} cạnh. Chạm đỉnh để xếp thứ tự cho Greedy tô màu.`}
          vertex={vertex}
          edge={edge}
          onVertex={playing ? tap : undefined}
        />
      }
      prompt={
        <>
          <Question kicker="Nhiệm vụ" sub={sub}>
            Xếp thứ tự để Greedy dùng ít màu nhất
          </Question>
          {/* phản hồi đứng trước dải thứ tự để luôn thấy được trong bottom sheet trên điện thoại */}
          <FeedbackCard fb={fb} />
          {hint && <HintCard hint={hint} canMore={session.canHint(HINT_KEY) && !animating} onMore={onHint} />}
          <OrderStrip order={order} picked={picked} colors={colors} next={nextStep?.v ?? null} hint={hintSet} />
          <div className="lg-mstats">
            <div className="lg-mstats__cell">
              <span className="lg-mstats__label">Lần chạy</span>
              <span className="lg-mstats__value">{runs.length}</span>
            </div>
            <div
              className={`lg-mstats__cell${
                run && finished ? (usedNow === chi ? " lg-mstats__cell--ok" : " lg-mstats__cell--warn") : ""
              }`}
            >
              <span className="lg-mstats__label">Số màu</span>
              <span className="lg-mstats__value">{run ? usedNow : "–"}</span>
            </div>
            <div className="lg-mstats__cell">
              <span className="lg-mstats__label">Mục tiêu</span>
              <span className="lg-mstats__value">
                {chi} <span className="lg-mstats__unit">màu</span>
              </span>
            </div>
          </div>
        </>
      }
      details={
        <>
          <Pseudocode title="Thuật toán Greedy" lines={PSEUDO} active={nextStep ? [2, 3] : []} />
          {run && <RunLog run={run} />}
          <RunHistory runs={runs} counts={counts} chi={chi} />
        </>
      }
      detailsLabel="Mã giả và nhật ký"
      footer={{
        left: (
          <button
            type="button"
            className="lg-btn lg-btn--ghost lg-btn--sm"
            onClick={reset}
            disabled={!playing || animating || (!picked.length && !run)}
          >
            <RotateCcw size={18} aria-hidden="true" /> Đặt lại
          </button>
        ),
        center: run ? (
          <span className="lg-stepcount lg-mono lg-hide-narrow">
            Đã tô {run.i}/{n}
          </span>
        ) : null,
        right: animating ? (
          <button type="button" className="lg-btn" onClick={skip}>
            <FastForward size={18} aria-hidden="true" /> Tô nhanh
          </button>
        ) : (
          <button
            type="button"
            className="lg-btn lg-btn--primary"
            onClick={start}
            disabled={!playing || sameAsLast}
            title={sameAsLast && playing ? "Đổi thứ tự trước khi chạy lại" : undefined}
          >
            <Play size={18} aria-hidden="true" fill="currentColor" /> Chạy Greedy
          </button>
        ),
      }}
      live={live}
    >
      <SessionOverlays
        session={session}
        onRestart={onRestart}
        summary={`${runs.length} lần chạy · ${session.hints} gợi ý · ${fmtTime(session.elapsedMs())}`}
        why={() => greedyWhy(level, graph, last ?? order)}
      />
    </PlayShell>
  );
}

function OrderStrip(props: {
  order: VertexId[];
  picked: VertexId[];
  colors: Map<VertexId, number>;
  next: VertexId | null;
  hint: Set<VertexId>;
}) {
  return (
    <div className="lg-dv">
      <p className="lg-dv__label">Thứ tự Greedy sẽ tô</p>
      <ol className="lg-order" aria-label={`Thứ tự: ${props.order.join(", ")}`}>
        {props.order.map((v, i) => {
          const c = props.colors.get(v);
          const cls = [
            "lg-order__cell",
            i < props.picked.length ? "lg-order__cell--picked" : "",
            c ? "lg-order__cell--colored" : "",
            props.next === v ? "lg-order__cell--next" : "",
            props.hint.has(v) ? "lg-order__cell--hint" : "",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <li key={v} className={cls} style={c ? { background: oiFill(c), color: oiText(c) } : undefined}>
              <span className="lg-order__v">{v}</span>
              <span className="lg-order__tag lg-mono">{c ? `màu ${c}` : " "}</span>
            </li>
          );
        })}
      </ol>
      <p className="lg-osnote lg-osnote--legend lg-hide-narrow">
        Viền liền: đỉnh đã chạm, đứng đầu theo thứ tự chạm. Viền đứt: các đỉnh còn lại, giữ thứ tự tăng dần.
      </p>
    </div>
  );
}

function RunLog({ run }: { run: Run }) {
  const steps = run.trace.slice(0, run.i);
  return (
    <div className="lg-dv">
      <p className="lg-dv__label">Lần chạy {run.id}: từng bước</p>
      {steps.length === 0 ? (
        <p className="lg-muted">Đang bắt đầu…</p>
      ) : (
        <ol className="lg-glog">
          {steps.map((s) => (
            <li key={s.v} className="lg-glog__row">
              <span className="lg-glog__v" style={{ background: oiFill(s.color), color: oiText(s.color) }}>
                {s.v}
              </span>
              <span className="lg-glog__why">{neighborText(s)}</span>
              <span className="lg-glog__c lg-mono">→ màu {s.color}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function RunHistory({ runs, counts, chi }: { runs: VertexId[][]; counts: number[]; chi: number }) {
  return (
    <div className="lg-dv">
      <p className="lg-dv__label">Các lần chạy</p>
      {runs.length === 0 ? (
        <p className="lg-muted">Chưa chạy lần nào.</p>
      ) : (
        <ol className="lg-runs">
          {runs.map((o, i) => (
            <li key={i} className="lg-runs__item">
              <span className="lg-runs__n">Lần {i + 1}</span>
              <span className="lg-runs__order lg-mono">{o.join(" ")}</span>
              <span className={`lg-chip${counts[i] === chi ? "" : " lg-chip--accent"}`}>{counts[i]} màu</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
