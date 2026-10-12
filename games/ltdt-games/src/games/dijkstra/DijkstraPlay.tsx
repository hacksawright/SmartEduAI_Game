// Tôi là Dijkstra (Ch.6). GDD mục 4.

import { Eraser, Lock } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { useGames } from "../../app/GamesContext";
import { createDijkstraEngine, fmtD, type DijkstraAnswer, type DijkstraState } from "../../core/engines/dijkstraEngine";
import { makeGraph, type Edge, type VertexId } from "../../core/graph";
import type { DijkstraLevel } from "../../core/levels/types";
import { getGame } from "../../core/registry";
import { projectedStars } from "../../core/scoring";
import { GraphBoard, type EdgeView, type VertexView } from "../../ui/board/GraphBoard";
import { RaceIntro, summaryOf } from "../shared/common";
import { Pseudocode, RaceTrack } from "../shared/DataViews";
import { treeEdgeIds } from "../shared/graphUtil";
import { SessionOverlays } from "../shared/Overlays";
import { PlayShell } from "../shared/PlayShell";
import { FeedbackCard, HintCard, Question, StreakChip } from "../shared/Prompt";
import { useLevelSession } from "../shared/session";
import { bumpFx, emptyFx, type Fx, type GameProps } from "../shared/types";
import { usePrediction } from "../shared/usePrediction";
import { useRace } from "../shared/useRace";
import { dijkstraWhy } from "./why";

const CODE = [
  "d[s] ← 0; d[v] ← ∞ (v ≠ s)",
  "while còn đỉnh chưa cố định, d < ∞:",
  "    u ← đỉnh chưa cố định, d nhỏ nhất",
  "    cố định nhãn của u",
  "    for v kề u chưa cố định:",
  "        if d[u] + w(u,v) < d[v]:",
  "            d[v] ← d[u] + w(u,v)",
  "            pred[v] ← u",
];

/** chỉ tự đưa con trỏ vào ô nhập khi có chuột: trên điện thoại bàn phím sẽ che bàn cờ */
const finePointer = () => typeof window !== "undefined" && !!window.matchMedia?.("(pointer: fine)").matches;

export function DijkstraPlay({ level, levelId, race, onRestart }: GameProps<DijkstraLevel>) {
  const g = useGames();
  const graph = useMemo(() => makeGraph(level.graph), [level]);
  const engine = useMemo(() => createDijkstraEngine(graph, level.source), [graph, level.source]);
  const order = useMemo(() => graph.vertices.map((v) => v.id), [graph]);
  const session = useLevelSession(level, levelId, race);
  const [draft, setDraft] = useState<Record<VertexId, string>>({});
  const [fx, setFx] = useState<Fx>(emptyFx);
  const inputs = useRef<Record<VertexId, HTMLInputElement | null>>({});
  const seconds = getGame("dijkstra").raceSecondsPerQuestion ?? 9;
  const total = engine.referenceQuestionCount();

  /** cạnh nhẹ nhất từ u tới v (đa đồ thị), dùng cho hiệu ứng nhãn chảy theo cạnh */
  const lightest = (u: VertexId, v: VertexId) =>
    graph.edges
      .filter((e) => (e.u === u && e.v === v) || (!graph.directed && e.u === v && e.v === u))
      .sort((a, b) => (a.w ?? 1) - (b.w ?? 1))[0];

  const P = usePrediction<DijkstraState, DijkstraAnswer>(engine, session, {
    describe: (prev, next, a) => {
      if (a.type === "select") {
        const fixed = `Cố định ${a.v} với d = ${fmtD(prev.d[a.v])}.`;
        return next.phase === "select"
          ? `${fixed} ${a.v} không còn đỉnh kề chưa cố định nên bỏ qua bước cập nhật.`
          : fixed;
      }
      return next.changed.length
        ? `Nhãn giảm: ${next.changed.map((v) => `d[${v}] = ${fmtD(next.d[v])}`).join(", ")}.`
        : "Không nhãn nào giảm.";
    },
    onApply: (prev, next, a) => {
      setDraft({});
      if (a.type === "select") setFx((f) => bumpFx(f, { pops: [a.v] }));
      else {
        const u = prev.current!;
        const flows = next.changed.flatMap((v) => {
          const e = lightest(u, v);
          return e ? [[e.id, u] as [string, string]] : [];
        });
        setFx((f) => bumpFx(f, { pops: next.changed, flows }));
      }
    },
    submit: (answers) =>
      void session.complete((hints) => ({
        kind: "dijkstra",
        answers,
        hints,
        race: race ? { won: true, elapsedMs: session.elapsedMs() } : undefined,
      })),
  });

  const raceState = useRace(race && session.phase === "play", seconds, total, () =>
    session.fail("Máy đã trả lời xong mọi câu trước bạn."),
  );

  const s = P.s;
  const relaxing = s.phase === "relax";
  const stepKey = `${s.answered}`;
  const hint = session.hintFor(stepKey);
  const hintSet = new Set(hint?.highlight ?? []);
  const tree = useMemo(() => treeEdgeIds(graph, s.pred), [graph, s.pred]);
  const targets = useMemo(() => engine.relaxTargets(s), [engine, s]);
  const targetIds = order.filter((v) => targets.has(v));
  const prog = engine.progress(s);
  const pend = P.pending;
  const expectedSet = new Set<VertexId>(
    pend?.type === "select"
      ? [pend.v]
      : pend?.type === "relax"
        ? Object.keys(pend.values).filter((v) => pend.values[v] < s.d[v])
        : [],
  );

  useEffect(() => {
    if (relaxing && session.phase === "play" && finePointer()) inputs.current[targetIds[0]]?.focus();
    // chỉ chạy khi sang bước mới
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.answered, relaxing, session.phase]);

  const vertex = (id: VertexId): VertexView => {
    const fixed = s.fixed.includes(id);
    const cur = s.current === id;
    const target = relaxing && targets.has(id);
    const d = s.d[id];
    let desc = d === Infinity ? "nhãn vô cùng" : `nhãn ${d}`;
    if (cur) desc += ", vừa cố định, đang cập nhật các đỉnh kề";
    else if (fixed) desc += ", đã cố định";
    else if (target) desc += ", đỉnh kề cần xét";
    if (s.pred[id]) desc += `, pred ${s.pred[id]}`;
    return {
      state: cur ? "current" : fixed ? "done" : target ? "queued" : "idle",
      check: fixed && !cur,
      pulse: cur && session.phase === "play",
      badge: fmtD(d),
      badgeTone: fixed ? "dist-fixed" : s.changed.includes(id) ? "dist-changed" : "dist",
      ring: expectedSet.has(id) || hintSet.has(id) ? "hint" : undefined,
      pop: fx.pops[id],
      shake: fx.shakes[id],
      ariaLabel: `Đỉnh ${id}, ${desc}`,
      disabled: s.phase === "select" && fixed,
    };
  };

  const edge = (e: Edge): EdgeView => {
    const cur = s.current;
    const active =
      relaxing &&
      cur !== null &&
      ((e.u === cur && targets.has(e.v)) || (!graph.directed && e.v === cur && targets.has(e.u)));
    const inTree = tree.has(e.id);
    const stale = !inTree && s.fixed.includes(e.u) && s.fixed.includes(e.v);
    return {
      state: active ? "active" : inTree ? "result" : stale ? "dim" : "idle",
      labelTone: active ? "active" : stale ? "muted" : "normal",
      flow: fx.flows[e.id]?.n,
      flowFrom: fx.flows[e.id]?.from,
    };
  };

  const pick = (id: VertexId) => {
    if (P.locked || s.phase !== "select") return;
    if (s.fixed.includes(id)) {
      // chạm nhầm đỉnh đã cố định: nhắc nhẹ, không tính lỗi
      g.play("invalid");
      setFx((f) => bumpFx(f, { shakes: [id] }));
      return;
    }
    P.clearOk();
    P.answer({ type: "select", v: id });
  };

  const onVertex = (id: VertexId) => {
    if (s.phase === "select") pick(id);
    else if (relaxing && targets.has(id)) inputs.current[id]?.focus();
  };

  const submitRelax = () => {
    if (P.locked || !relaxing) return;
    const values: Record<VertexId, number> = {};
    for (const v of targetIds) {
      const raw = (draft[v] ?? "").trim();
      if (raw !== "") values[v] = Number(raw);
    }
    P.clearOk();
    P.answer({ type: "relax", values });
  };

  const onHint = () =>
    session.requestHint(
      stepKey,
      (lvl) => engine.hint(s, lvl),
      `Dijkstra từ ${level.source}; nhãn ${order.map((v) => `${v}=${fmtD(s.d[v])}`).join(", ")}; đã cố định ${
        s.fixed.join(", ") || "chưa có"
      }; ${relaxing ? `câu hỏi: cập nhật nhãn các đỉnh kề của ${s.current}` : "câu hỏi: cố định đỉnh nào tiếp theo"}`,
    );

  const question =
    s.phase === "select" ? (
      <Question step={prog.step} total={prog.total} sub="Chạm đỉnh trên đồ thị hoặc trong bảng nhãn.">
        Đỉnh nào được cố định nhãn tiếp theo?
      </Question>
    ) : relaxing ? (
      <Question
        step={prog.step}
        total={prog.total}
        sub={`d[${s.current}] = ${fmtD(s.d[s.current!])}. Ghi nhãn mới cho đỉnh có nhãn giảm, bỏ trống nghĩa là giữ nguyên.`}
      >
        Cập nhật nhãn các đỉnh kề của {s.current}
      </Question>
    ) : (
      <Question step={prog.total} total={prog.total}>
        Mọi đỉnh tới được đã cố định nhãn: Dijkstra kết thúc.
      </Question>
    );

  const hasDraft = Object.values(draft).some(Boolean);

  return (
    <PlayShell
      level={level}
      race={race}
      lives={P.lives}
      stars={projectedStars(3 - P.mistakes, session.hints)}
      canHint={session.canHint(stepKey) && !P.pending}
      onHint={onHint}
      board={
        <GraphBoard
          graph={graph}
          label={`Đồ thị ${graph.directed ? "có hướng" : "vô hướng"} có trọng số, ${graph.vertices.length} đỉnh. Tìm đường đi ngắn nhất từ ${level.source}.`}
          vertex={vertex}
          edge={edge}
          onVertex={onVertex}
          shake={P.shake}
        />
      }
      boardTop={<StreakChip streak={P.streak} />}
      prompt={
        <>
          {race && (
            <RaceTrack you={s.answered} bot={raceState.bot} total={total} secondsPerStep={seconds} nextIn={raceState.nextIn} />
          )}
          {question}
          {relaxing && s.current && (
            <RelaxForm
              u={s.current}
              ids={targetIds}
              weights={targets}
              s={s}
              draft={draft}
              locked={P.locked}
              inputs={inputs}
              onChange={(v, raw) => {
                P.clearOk();
                setDraft((d) => ({ ...d, [v]: raw }));
              }}
              onSubmit={submitRelax}
            />
          )}
          <FeedbackCard fb={P.fb} />
          {hint && !P.pending && <HintCard hint={hint} canMore={session.canHint(stepKey)} onMore={onHint} />}
        </>
      }
      details={
        <>
          <LabelTable order={order} s={s} canPick={s.phase === "select" && !P.locked} onPick={pick} marks={expectedSet} />
          {g.settings.pseudocode && (
            <Pseudocode lines={CODE} active={s.phase === "select" ? [3, 4] : relaxing ? [5, 6, 7, 8] : [2]} />
          )}
        </>
      }
      detailsLabel="Bảng nhãn & mã giả"
      footer={{
        left:
          relaxing && hasDraft && !P.pending ? (
            <button type="button" className="lg-btn lg-btn--ghost" onClick={() => setDraft({})}>
              <Eraser size={18} aria-hidden="true" /> Xóa
            </button>
          ) : null,
        center: (
          <span className="lg-stepcount lg-mono">
            Bước {prog.step}/{prog.total}
          </span>
        ),
        right: P.pending ? (
          <button type="button" className="lg-btn lg-btn--primary" onClick={P.proceed} autoFocus>
            Tiếp tục
          </button>
        ) : relaxing ? (
          <button type="button" className="lg-btn lg-btn--primary" onClick={submitRelax} disabled={P.locked}>
            {hasDraft ? "Xác nhận" : "Giữ nguyên tất cả"}
          </button>
        ) : (
          <span className="lg-controls__note">Chạm một đỉnh</span>
        ),
      }}
      live={P.fb.kind === "bad" ? `Chưa đúng. ${P.fb.text}` : P.fb.kind === "ok" ? `Đúng. ${P.fb.text ?? ""}` : ""}
    >
      <SessionOverlays
        session={session}
        onRestart={onRestart}
        summary={summaryOf(P.mistakes, session)}
        introExtra={<RaceIntro total={total} seconds={seconds} />}
        why={() => dijkstraWhy(level, graph, s)}
      />
    </PlayShell>
  );
}

function Dist({ d }: { d: number }) {
  return d === Infinity ? (
    <span className="lg-inf" aria-label="vô cùng">
      ∞
    </span>
  ) : (
    <>{d}</>
  );
}

function RelaxForm(props: {
  u: VertexId;
  ids: VertexId[];
  weights: Map<VertexId, number>;
  s: DijkstraState;
  draft: Record<VertexId, string>;
  locked: boolean;
  inputs: MutableRefObject<Record<VertexId, HTMLInputElement | null>>;
  onChange: (v: VertexId, raw: string) => void;
  onSubmit: () => void;
}) {
  const { u, s } = props;
  return (
    <div className="lg-relax" role="group" aria-label={`Cập nhật nhãn các đỉnh kề của ${u}`}>
      <table className="lg-table lg-relax__table">
        <thead>
          <tr>
            <th scope="col">Đỉnh</th>
            <th scope="col">d cũ</th>
            <th scope="col">
              w({u},·)
            </th>
            <th scope="col">d mới</th>
            <th scope="col">pred</th>
          </tr>
        </thead>
        <tbody>
          {props.ids.map((v) => {
            const raw = props.draft[v] ?? "";
            const lower = raw !== "" && Number(raw) < s.d[v];
            return (
              <tr key={v}>
                <th scope="row">
                  <span className="lg-vchip">{v}</span>
                </th>
                <td className="lg-mono">
                  <Dist d={s.d[v]} />
                </td>
                <td className="lg-mono">{props.weights.get(v)}</td>
                <td>
                  <input
                    ref={(el) => {
                      props.inputs.current[v] = el;
                    }}
                    className="lg-input lg-relax__input lg-mono"
                    inputMode="numeric"
                    autoComplete="off"
                    enterKeyHint="done"
                    maxLength={4}
                    placeholder="giữ"
                    value={raw}
                    readOnly={props.locked}
                    aria-label={`Nhãn mới của ${v}, hiện là ${s.d[v] === Infinity ? "vô cùng" : s.d[v]}. Bỏ trống để giữ nguyên.`}
                    onChange={(e) => props.onChange(v, e.target.value.replace(/\D/g, ""))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        props.onSubmit();
                      }
                    }}
                  />
                </td>
                <td className={`lg-mono${lower ? " lg-relax__pred--new" : ""}`}>{lower ? `→ ${u}` : (s.pred[v] ?? "–")}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function LabelTable(props: {
  order: VertexId[];
  s: DijkstraState;
  canPick: boolean;
  onPick: (v: VertexId) => void;
  marks: Set<VertexId>;
}) {
  const { s } = props;
  return (
    <div className="lg-dv">
      <span className="lg-dv__label">Bảng nhãn</span>
      <table className="lg-table lg-labels">
        <thead>
          <tr>
            <th scope="col">Đỉnh</th>
            <th scope="col">d</th>
            <th scope="col">pred</th>
            <th scope="col">
              <span className="lg-sr-only">Trạng thái</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {props.order.map((v) => {
            const fixed = s.fixed.includes(v);
            const cls = [
              fixed ? "lg-labels__row--fixed" : "",
              s.current === v ? "lg-labels__row--current" : "",
              props.marks.has(v) ? "lg-labels__row--mark" : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <tr key={v} className={cls || undefined}>
                <th scope="row">
                  {props.canPick && !fixed ? (
                    <button
                      type="button"
                      className="lg-vchip lg-vchip--btn"
                      onClick={() => props.onPick(v)}
                      aria-label={`Cố định đỉnh ${v}, d = ${s.d[v] === Infinity ? "vô cùng" : s.d[v]}`}
                    >
                      {v}
                    </button>
                  ) : (
                    <span className="lg-vchip">{v}</span>
                  )}
                </th>
                <td className={`lg-mono${s.changed.includes(v) ? " lg-labels__d--changed" : ""}`}>
                  <Dist d={s.d[v]} />
                </td>
                <td className="lg-mono">{s.pred[v] ?? "–"}</td>
                <td>
                  {fixed && (
                    <span className="lg-labels__state">
                      <Lock size={13} aria-hidden="true" /> cố định
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
