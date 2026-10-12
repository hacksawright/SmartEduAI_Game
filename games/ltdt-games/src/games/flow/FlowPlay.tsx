// Ống nước & nút thắt (Ch.8 – Luồng cực đại). Bước 1: chạm các trạm từ s tới t để chọn đường tăng luồng
// (được đi ngược ống đang có nước) rồi bơm; báo "Đã cực đại" khi hết đường. Bước 2: chọn phía S của lát cắt nhỏ nhất. GDD mục 11.

import { Check, Droplets, Gauge, RotateCcw, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useGames } from "../../app/GamesContext";
import { bottleneck, capOf, cutEdges, flowOn, flowValue, residualArc } from "../../core/algorithms/maxFlow";
import { flowStep, initialFlowState, type FlowAction, type FlowState } from "../../core/games/maxFlow";
import { makeGraph, type Edge, type VertexId } from "../../core/graph";
import type { MaxFlowLevel } from "../../core/levels/types";
import { puzzleOutcome } from "../../core/scoring";
import { GraphBoard, type EdgeView, type VertexView } from "../../ui/board/GraphBoard";
import { fmtTime } from "../shared/graphUtil";
import { SessionOverlays } from "../shared/Overlays";
import { PlayShell } from "../shared/PlayShell";
import { FeedbackCard, HintCard, Question, type FeedbackState } from "../shared/Prompt";
import { useLevelSession } from "../shared/session";
import { Stepper } from "../shared/Stepper";
import { bumpFx, emptyFx, type Fx, type GameProps } from "../shared/types";
import { blockedReason, cutHint, flowHint, S_COLOR, stepsOf, T_BADGE } from "./logic";
import { flowWhy } from "./why";

export function FlowPlay({ level, levelId, race, onRestart }: GameProps<MaxFlowLevel>) {
  const g = useGames();
  const graph = useMemo(() => makeGraph(level.graph), [level]);
  const session = useLevelSession(level, levelId, race);
  const { source: s, sink: t } = level;

  const [st, setSt] = useState<FlowState>(() => initialFlowState(level));
  const stRef = useRef(st);
  const log = useRef<FlowAction[]>([]);
  const [path, setPath] = useState<VertexId[]>([s]);
  const [amount, setAmount] = useState(1);
  const [side, setSide] = useState<VertexId[]>([s]);
  const [fx, setFx] = useState<Fx>(emptyFx);
  const [fb, setFb] = useState<FeedbackState>({ kind: "none" });
  const [note, setNote] = useState("");
  const [live, setLive] = useState("");
  const [shake, setShake] = useState(0);

  const finished = st.phase === "won";
  const playing = session.phase === "play" && !finished;
  const value = flowValue(graph, st.flow, s);

  useEffect(() => {
    if (!finished) return;
    const tm = window.setTimeout(
      () => void session.complete((hints) => ({ kind: "max_flow", actions: log.current, hints })),
      g.reducedMotion ? 250 : 900,
    );
    return () => window.clearTimeout(tm);
    // chỉ một lần khi vừa hoàn thành
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  const dispatch = (a: FlowAction) => {
    const prev = stRef.current;
    const { state, event } = flowStep(graph, level, prev, a);
    if (state !== prev) {
      stRef.current = state;
      setSt(state);
      log.current = [...log.current, a];
    }
    return { state, event };
  };

  const steps = useMemo(() => stepsOf(graph, st.flow, path), [graph, st.flow, path]);
  const complete = path.length > 1 && path[path.length - 1] === t && steps.length === path.length - 1;
  const most = complete ? bottleneck(steps) : 0;

  // ----- bước 1: chọn đường và bơm -----
  const tapFlow = (v: VertexId) => {
    const last = path[path.length - 1];
    if (v === last) {
      if (path.length === 1) return;
      g.play("undo");
      setNote("");
      setPath(path.slice(0, -1));
      return;
    }
    const at = path.indexOf(v);
    if (at >= 0) {
      g.play("undo");
      setNote("");
      setPath(path.slice(0, at + 1));
      return;
    }
    if (last === t) {
      g.play("invalid");
      setNote(`Đường đã tới ${t}. Bấm Bơm, hoặc chạm một trạm trên đường để lùi về đó.`);
      return;
    }
    const arc = residualArc(graph, st.flow, last, v);
    if (!arc) {
      g.play("invalid");
      setFx((f) => bumpFx(f, { shakes: [v] }));
      const msg = blockedReason(graph, st.flow, last, v);
      setNote(msg);
      setLive(msg);
      return;
    }
    const next = [...path, v];
    g.play("tap", { rate: arc.forward ? 1 : 0.8 });
    setFx((f) => bumpFx(f, { pops: [v] }));
    setNote(arc.forward ? "" : `Đi ngược ống ${v} → ${last}: bớt nước trên ống này để nhường cho đường mới.`);
    setPath(next);
    if (v === t) {
      const b = bottleneck(stepsOf(graph, st.flow, next));
      setAmount(b);
      setLive(`Đã chọn đường ${next.join(", ")}. Bơm thêm được tối đa ${b}.`);
    }
  };

  const push = () => {
    if (!playing || !complete) return;
    const { event } = dispatch({ t: "push", path, amount });
    if (event.kind === "pushed") {
      g.play("pave", { rate: 0.9 + Math.min(0.5, event.amount / 10) });
      setFx((f) => bumpFx(f, { flows: steps.map((a) => [a.edge, a.from] as [string, string]), pops: [t] }));
      setPath([s]);
      setNote("");
      setFb({ kind: "none" });
      setLive(`Đã bơm thêm ${event.amount}. Luồng hiện tại ${event.value}.`);
    } else if (event.kind === "invalid") {
      g.play("invalid");
      setNote(event.reason);
    }
  };

  const reset = () => {
    if (!playing || st.phase !== "flow") return;
    dispatch({ t: "reset" });
    g.play("undo", { rate: 0.8 });
    setPath([s]);
    setNote("");
    setFb({ kind: "none" });
    setLive(`Đặt lại luồng về ${flowValue(graph, level.initialFlow ?? {}, s)}.`);
  };

  const claimMax = () => {
    if (!playing || st.phase !== "flow") return;
    const { event } = dispatch({ t: "claim" });
    if (event.kind === "max-ok") {
      g.play("correct");
      setPath([s]);
      setNote("");
      setFb({
        kind: "ok",
        title: `Đúng: luồng cực đại là ${event.value}.`,
        text: "Bước 2: tìm nút thắt. Chọn các trạm thuộc phía S (cùng phía với s) sao cho tổng dung lượng các ống đi từ S sang T đúng bằng luồng cực đại.",
      });
      setLive(`Đúng, luồng cực đại là ${event.value}. Bước 2: chọn phía S của nút thắt.`);
    } else if (event.kind === "not-max") {
      g.play("wrong");
      setShake((x) => x + 1);
      setFb({
        kind: "bad",
        title: "Chưa cực đại",
        text: `Luồng hiện tại là ${event.value}, nhưng vẫn còn một đường từ ${s} tới ${t} bơm thêm được (có thể phải đi ngược một ống đang có nước).`,
      });
    }
  };

  // ----- bước 2: lát cắt -----
  const tapCut = (v: VertexId) => {
    if (v === s || v === t) {
      g.play("invalid");
      setNote(v === s ? `${s} luôn ở phía S.` : `${t} luôn ở phía T.`);
      return;
    }
    const inS = side.includes(v);
    g.play("toggle");
    setFx((f) => bumpFx(f, { pops: [v] }));
    setNote("");
    setSide(inS ? side.filter((x) => x !== v) : [...side, v]);
    setLive(`${v} sang phía ${inS ? "T" : "S"}.`);
  };

  const submitCut = () => {
    if (!playing || st.phase !== "cut") return;
    const { event } = dispatch({ t: "cut", side });
    if (event.kind === "cut-ok") {
      g.play("correct");
      setFb({
        kind: "ok",
        title: "Tìm đúng nút thắt!",
        text: `Dung lượng lát cắt ${event.capacity} bằng luồng cực đại ${event.capacity}.`,
      });
      setLive("Tìm đúng nút thắt.");
    } else if (event.kind === "cut-wrong") {
      g.play("wrong");
      setShake((x) => x + 1);
      setFb({
        kind: "bad",
        title: "Chưa phải nút thắt nhỏ nhất",
        text: `Các ống từ S sang T có tổng dung lượng ${event.capacity}, lớn hơn luồng cực đại ${event.value}. Nút thắt nhỏ nhất có dung lượng đúng bằng luồng cực đại.`,
      });
    } else if (event.kind === "invalid") {
      g.play("invalid");
      setNote(event.reason);
    }
  };

  const tap = (v: VertexId) => {
    if (!playing) return;
    if (st.phase === "flow") tapFlow(v);
    else tapCut(v);
  };

  // ----- gợi ý -----
  const hintKey = st.phase === "flow" ? "flow" : "cut";
  const hint = session.hintFor(hintKey);
  const onHint = () =>
    session.requestHint(
      hintKey,
      (lvl) => (st.phase === "flow" ? flowHint(graph, level, st.flow, lvl) : cutHint(graph, level, st.flow, lvl)),
      `Luồng cực đại, ${graph.vertices.length} trạm, ${graph.edges.length} ống; luồng hiện tại ${value}; ${
        st.phase === "flow" ? `đường đang chọn ${path.join("→")}` : `đang chọn phía S = {${side.join(", ")}}`
      }`,
    );
  const hintSet = new Set(hint?.highlight ?? []);

  // ----- hiển thị -----
  const pathEdges = new Set(steps.map((a) => a.edge));
  const cutting = st.phase !== "flow";
  const sideSet = new Set(side);
  const cutSet = new Set(cutting ? cutEdges(graph, side) : []);
  const hintEdges = new Set<string>();
  if (hint?.highlight && !cutting)
    for (let i = 1; i < hint.highlight.length; i++) {
      const a = residualArc(graph, st.flow, hint.highlight[i - 1], hint.highlight[i]);
      if (a) hintEdges.add(a.edge);
    }

  const vertex = (id: VertexId): VertexView => {
    const role = id === s ? "nguồn" : id === t ? "bể chứa" : "trạm";
    if (cutting) {
      const inS = sideSet.has(id);
      return {
        fill: inS ? S_COLOR.fill : undefined,
        textColor: inS ? S_COLOR.text : undefined,
        badge: inS ? "S" : "T",
        badgeColor: inS ? S_COLOR : T_BADGE,
        ring: hintSet.has(id) ? "hint" : undefined,
        pop: fx.pops[id],
        shake: fx.shakes[id],
        ariaLabel: `${role} ${id}, phía ${inS ? "S" : "T"}`,
      };
    }
    const at = path.indexOf(id);
    const last = at === path.length - 1;
    return {
      state: last && at > 0 ? "current" : id === s || id === t ? "done" : "idle",
      pulse: last && playing && id !== t,
      ring: at >= 0 && !last ? "select" : hintSet.has(id) ? "hint" : undefined,
      badge: at > 0 ? at + 1 : undefined,
      badgeTone: "select",
      pop: fx.pops[id],
      shake: fx.shakes[id],
      ariaLabel: `${role} ${id}${at >= 0 ? `, thứ ${at + 1} trên đường đang chọn` : ""}`,
    };
  };

  const edge = (e: Edge): EdgeView => {
    const f = flowOn(st.flow, e.id);
    const c = capOf(graph, e.id);
    const base: EdgeView = {
      pipe: c ? f / c : 0,
      label: `${f}/${c}`,
      labelTone: f === c ? "active" : "normal",
      flow: fx.flows[e.id]?.n,
      flowFrom: fx.flows[e.id]?.from,
    };
    if (cutting) {
      const back = sideSet.has(e.v) && !sideSet.has(e.u);
      return { ...base, state: cutSet.has(e.id) ? (finished ? "active" : "hint") : back ? "dim" : "idle" };
    }
    return { ...base, state: pathEdges.has(e.id) ? "active" : hintEdges.has(e.id) ? "hint" : "idle" };
  };

  const stars = puzzleOutcome({ mistakes: st.mistakes, hints: session.hints }).stars;
  const cutList = [...cutSet].map((id) => {
    const e = graph.edges.find((x) => x.id === id)!;
    return `${e.u} → ${e.v} (${e.w})`;
  });

  return (
    <PlayShell
      level={level}
      race={race}
      stars={stars}
      starsLabel={`Dự kiến ${stars} sao (${st.mistakes} lỗi)`}
      canHint={session.canHint(hintKey) && playing}
      onHint={onHint}
      board={
        <GraphBoard
          graph={graph}
          label={`Mạng ống nước từ ${s} tới ${t}, ${graph.edges.length} ống. Số trên ống là lượng nước đang chảy trên dung lượng.`}
          vertex={vertex}
          edge={edge}
          onVertex={playing ? tap : undefined}
          arrowPx={18}
          shake={shake}
        />
      }
      prompt={
        <>
          {!cutting ? (
            <>
              <Question
                kicker="Bước 1 · Bơm nước"
                sub={`Chạm lần lượt các trạm từ ${s} tới ${t} để chọn đường, rồi bấm Bơm. Chạm một trạm trên đường để lùi về đó.`}
              >
                Bơm được nhiều nhất bao nhiêu nước?
              </Question>
              <div className="lg-fpath" aria-label="Đường đang chọn">
                <p className="lg-fpath__route lg-mono">
                  <span className="lg-fpath__label">Đường:</span>
                  {path.map((v, i) => (
                    <span key={v}>
                      {i > 0 && (
                        <span className={`lg-fpath__arrow${steps[i - 1]?.forward === false ? " lg-fpath__arrow--back" : ""}`}>
                          {steps[i - 1]?.forward === false ? " ⇠ " : " → "}
                        </span>
                      )}
                      {v}
                    </span>
                  ))}
                </p>
                {path.length > 1 && (
                  <button
                    type="button"
                    className="lg-btn lg-btn--ghost lg-btn--sm"
                    onClick={() => {
                      g.play("undo");
                      setNote("");
                      setPath([s]);
                    }}
                  >
                    <X size={16} aria-hidden="true" /> Xóa đường
                  </button>
                )}
              </div>
              {steps.length > 0 && (
                <ul className="lg-fpath__steps">
                  {steps.map((a) => (
                    <li key={`${a.from}-${a.to}`} className={a.forward ? undefined : "lg-fpath__step--back"}>
                      <span className="lg-mono">
                        {a.from} → {a.to}
                      </span>{" "}
                      {a.forward ? `còn trống ${a.cap}` : `ngược ống ${a.to} → ${a.from}, trả được ${a.cap}`}
                    </li>
                  ))}
                </ul>
              )}
              {complete && (
                <Stepper
                  label="Lượng bơm"
                  value={amount}
                  min={1}
                  max={most}
                  onChange={setAmount}
                  onEnter={push}
                  disabled={!playing}
                />
              )}
            </>
          ) : (
            <>
              <Question
                kicker="Bước 2 · Tìm nút thắt"
                sub={`Chạm một trạm để chuyển nó giữa phía S và phía T (${s} luôn ở S, ${t} luôn ở T).`}
              >
                Nút thắt nằm ở đâu?
              </Question>
              <p className="lg-claim__picked">
                Ống từ S sang T: {cutList.length ? <span className="lg-mono">{cutList.join(", ")}</span> : "chưa có."}
              </p>
            </>
          )}
          <div className="lg-mstats">
            <div className={`lg-mstats__cell${cutting ? " lg-mstats__cell--ok" : ""}`}>
              <span className="lg-mstats__label">Luồng</span>
              <span className="lg-mstats__value">{value}</span>
            </div>
            <div className="lg-mstats__cell">
              <span className="lg-mstats__label">Lần bơm</span>
              <span className="lg-mstats__value">{st.pushes}</span>
            </div>
            <div className={`lg-mstats__cell${st.mistakes ? " lg-mstats__cell--warn" : ""}`}>
              <span className="lg-mstats__label">Lỗi</span>
              <span className="lg-mstats__value">{st.mistakes}</span>
            </div>
          </div>
          <p className="lg-osnote lg-osnote--legend">
            {cutting
              ? "Huy hiệu S, T là phía của từng trạm; ống viền cam nét đứt đi từ S sang T."
              : "Số trên ống: nước đang chảy / dung lượng. Dòng xanh càng dày, ống càng đầy."}
          </p>
          {note && <p className="lg-osnote">{note}</p>}
          <FeedbackCard fb={fb} />
          {hint && <HintCard hint={hint} canMore={session.canHint(hintKey)} onMore={onHint} />}
        </>
      }
      footer={
        !cutting
          ? {
              left: (
                <button
                  type="button"
                  className="lg-btn lg-btn--ghost lg-btn--sm"
                  onClick={reset}
                  disabled={!playing || st.pushes === 0}
                >
                  <RotateCcw size={18} aria-hidden="true" /> Đặt lại
                </button>
              ),
              center: (
                <button type="button" className="lg-btn" onClick={claimMax} disabled={!playing}>
                  <Gauge size={18} aria-hidden="true" /> Đã cực đại
                </button>
              ),
              right: (
                <button type="button" className="lg-btn lg-btn--primary" onClick={push} disabled={!playing || !complete}>
                  <Droplets size={18} aria-hidden="true" /> Bơm
                </button>
              ),
            }
          : {
              left: (
                <button
                  type="button"
                  className="lg-btn lg-btn--ghost lg-btn--sm"
                  onClick={() => {
                    g.play("undo");
                    setSide([s]);
                  }}
                  disabled={!playing || side.length === 1}
                >
                  <RotateCcw size={18} aria-hidden="true" /> Chọn lại
                </button>
              ),
              right: (
                <button type="button" className="lg-btn lg-btn--primary" onClick={submitCut} disabled={!playing}>
                  <Check size={18} aria-hidden="true" /> Xác nhận nút thắt
                </button>
              ),
            }
      }
      live={fb.kind === "bad" ? `${fb.title ?? "Chưa đúng"}. ${fb.text}` : live}
    >
      <SessionOverlays
        session={session}
        onRestart={onRestart}
        summary={`${st.mistakes} lỗi · ${st.pushes} lần bơm · ${session.hints} gợi ý · ${fmtTime(session.elapsedMs())}`}
        why={() => flowWhy(level, graph, st, side)}
      />
    </PlayShell>
  );
}
