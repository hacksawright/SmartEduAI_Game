// Tôi là thuật toán – BFS/DFS (Ch.2). GDD mục 3.

import { ArrowUpFromLine, Undo2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useGames } from "../../app/GamesContext";
import { createBfsEngine, type BfsState } from "../../core/engines/bfsEngine";
import { createDfsEngine, type DfsState } from "../../core/engines/dfsEngine";
import { makeGraph, type Edge, type VertexId } from "../../core/graph";
import type { TraversalLevel } from "../../core/levels/types";
import { getGame } from "../../core/registry";
import { projectedStars } from "../../core/scoring";
import { GraphBoard, type EdgeView, type VertexView } from "../../ui/board/GraphBoard";
import { Pseudocode, QueueView, RaceTrack, StackView, VisitOrder } from "../shared/DataViews";
import { RaceIntro, summaryOf } from "../shared/common";
import { findEdge, treeEdgeIds } from "../shared/graphUtil";
import { SessionOverlays } from "../shared/Overlays";
import { PlayShell } from "../shared/PlayShell";
import { FeedbackCard, HintCard, Question, StreakChip } from "../shared/Prompt";
import { useLevelSession } from "../shared/session";
import { bumpFx, emptyFx, type Fx, type GameProps } from "../shared/types";
import { usePrediction } from "../shared/usePrediction";
import { useRace } from "../shared/useRace";
import { traversalWhy } from "./why";

const BFS_CODE = [
  "Q ← [s]; đánh dấu s",
  "while Q khác rỗng:",
  "    u ← lấy đỉnh đầu Q",
  "    for v kề u (chỉ số tăng dần):",
  "        if v chưa đánh dấu:",
  "            đánh dấu v; pred[v] ← u",
  "            đưa v vào cuối Q",
];

const DFS_CODE = [
  "S ← [s]; đánh dấu s",
  "while S khác rỗng:",
  "    u ← đỉnh trên cùng S",
  "    if u còn đỉnh kề chưa đánh dấu:",
  "        v ← đỉnh đó có chỉ số nhỏ nhất",
  "        đánh dấu v; pred[v] ← u; đẩy v vào S",
  "    else: lấy u ra khỏi S (quay lui)",
];

export function TraversalPlay(props: GameProps<TraversalLevel>) {
  return props.level.algo === "bfs" ? <BfsPlay {...props} /> : <DfsPlay {...props} />;
}

function edgeViews(tree: Set<string>, fx: Fx) {
  return (e: Edge): EdgeView => ({
    state: tree.has(e.id) ? "result" : "idle",
    label: null,
    flow: fx.flows[e.id]?.n,
    flowFrom: fx.flows[e.id]?.from,
  });
}

// ---------------------------------------------------------------- BFS

function BfsPlay({ level, levelId, race, onRestart }: GameProps<TraversalLevel>) {
  const g = useGames();
  const graph = useMemo(() => makeGraph(level.graph), [level]);
  const engine = useMemo(() => createBfsEngine(graph, level.start), [graph, level.start]);
  const session = useLevelSession(level, levelId, race);
  const [sel, setSel] = useState<VertexId[]>([]);
  const [fx, setFx] = useState<Fx>(emptyFx);
  const seconds = getGame("traversal").raceSecondsPerQuestion ?? 6;
  const total = engine.referenceQuestionCount();

  const P = usePrediction<BfsState, Parameters<typeof engine.check>[1]>(engine, session, {
    describe: (_prev, _next, a) =>
      a.type === "dequeue"
        ? `Lấy ${a.v} ra khỏi đầu hàng đợi.`
        : a.vs.length
          ? `Đưa ${a.vs.join(", ")} vào cuối hàng đợi.`
          : "Không có đỉnh mới nào vào hàng đợi.",
    onApply: (prev, _next, a) => {
      setSel([]);
      if (a.type === "dequeue") setFx((f) => bumpFx(f, { pops: [a.v] }));
      else {
        const u = prev.current!;
        const flows = a.vs.map((v) => [findEdge(graph, u, v)?.id ?? "", u] as [string, string]).filter(([e]) => e);
        setFx((f) => bumpFx(f, { pops: a.vs, flows }));
      }
    },
    submit: (answers) =>
      void session.complete((hints) => ({
        kind: "traversal",
        answers,
        hints,
        race: race ? { won: true, elapsedMs: session.elapsedMs() } : undefined,
      })),
  });

  const raceState = useRace(race && session.phase === "play", seconds, total, () =>
    session.fail("Máy đã trả lời xong mọi câu trước bạn."),
  );

  const s = P.s;
  const stepKey = `${s.answered}`;
  const hint = session.hintFor(stepKey);
  const tree = useMemo(() => treeEdgeIds(graph, s.pred), [graph, s.pred]);
  const prog = engine.progress(s);

  const expectedSet = new Set<VertexId>(
    P.pending ? (P.pending.type === "dequeue" ? [P.pending.v] : P.pending.vs) : [],
  );
  const hintSet = new Set(hint?.highlight ?? []);

  const vertex = (id: VertexId): VertexView => {
    const qi = s.queue.indexOf(id);
    const done = s.done.includes(id);
    const cur = s.current === id;
    const si = sel.indexOf(id);
    let desc = "chưa thăm";
    if (done) desc = "đã xét xong";
    else if (cur) desc = "vừa lấy ra, đang xét đỉnh kề";
    else if (qi >= 0) desc = `trong hàng đợi, vị trí ${qi + 1}`;
    if (si >= 0) desc += `, đã chọn thứ ${si + 1}`;
    return {
      state: done ? "done" : cur ? "current" : qi >= 0 ? "queued" : "idle",
      check: done,
      pulse: cur && session.phase === "play",
      badge: si >= 0 ? si + 1 : qi >= 0 ? qi + 1 : undefined,
      badgeTone: si >= 0 ? "select" : "queue",
      ring: expectedSet.has(id) ? "hint" : si >= 0 ? "select" : hintSet.has(id) ? "hint" : undefined,
      pop: fx.pops[id],
      ariaLabel: `Đỉnh ${id}, ${desc}`,
    };
  };

  const onVertex = (id: VertexId) => {
    if (P.locked) return;
    P.clearOk();
    if (s.phase === "dequeue") P.answer({ type: "dequeue", v: id });
    else if (s.phase === "enqueue") {
      g.play("tick");
      setSel((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
    }
  };

  const confirm = () => {
    if (P.locked || s.phase !== "enqueue") return;
    P.answer({ type: "enqueue", vs: sel });
  };

  const onHint = () =>
    session.requestHint(stepKey, (lvl) => engine.hint(s, lvl), `BFS từ ${level.start}; hàng đợi [${s.queue.join(", ")}]; đã thăm ${s.visited.join(", ")}; ${s.phase === "dequeue" ? "câu hỏi: lấy đỉnh nào ra" : `câu hỏi: đưa đỉnh kề nào của ${s.current} vào hàng đợi`}`);

  const question =
    s.phase === "dequeue" ? (
      <Question step={prog.step} total={prog.total} sub="Chạm đỉnh đó trên đồ thị.">
        Đỉnh nào được lấy ra khỏi hàng đợi?
      </Question>
    ) : s.phase === "enqueue" ? (
      <Question
        step={prog.step}
        total={prog.total}
        sub={`Đỉnh ${s.current} vừa được lấy ra. Chạm lần lượt các đỉnh (chạm lại để bỏ), rồi bấm Xác nhận.`}
      >
        Những đỉnh nào được đưa vào hàng đợi, theo thứ tự?
      </Question>
    ) : (
      <Question step={prog.total} total={prog.total}>
        Hàng đợi rỗng: BFS kết thúc.
      </Question>
    );

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
          label={`Đồ thị ${graph.directed ? "có hướng" : "vô hướng"} gồm ${graph.vertices.length} đỉnh. BFS xuất phát từ đỉnh ${level.start}.`}
          vertex={vertex}
          edge={edgeViews(tree, fx)}
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
          <QueueView queue={s.queue} pending={s.phase === "enqueue" ? sel : []} />
          <FeedbackCard fb={P.fb} />
          {hint && !P.pending && (
            <HintCard hint={hint} canMore={session.canHint(stepKey)} onMore={onHint} />
          )}
        </>
      }
      details={
        <>
          <VisitOrder order={s.visited} />
          {g.settings.pseudocode && (
            <Pseudocode lines={BFS_CODE} active={s.phase === "dequeue" ? [3] : s.phase === "enqueue" ? [4, 5, 6, 7] : [2]} />
          )}
        </>
      }
      detailsLabel="Thứ tự thăm & mã giả"
      footer={{
        left:
          s.phase === "enqueue" && sel.length > 0 && !P.pending ? (
            <button type="button" className="lg-btn lg-btn--ghost" onClick={() => setSel([])}>
              <Undo2 size={18} aria-hidden="true" /> Bỏ chọn
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
        ) : s.phase === "enqueue" ? (
          sel.length ? (
            <button type="button" className="lg-btn lg-btn--primary" onClick={confirm} disabled={P.locked}>
              Xác nhận
            </button>
          ) : (
            <button type="button" className="lg-btn" onClick={confirm} disabled={P.locked}>
              Không có đỉnh nào
            </button>
          )
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
        why={() => traversalWhy(level, graph, s.pred, s.visited)}
      />
    </PlayShell>
  );
}

// ---------------------------------------------------------------- DFS

function DfsPlay({ level, levelId, race, onRestart }: GameProps<TraversalLevel>) {
  const g = useGames();
  const graph = useMemo(() => makeGraph(level.graph), [level]);
  const engine = useMemo(() => createDfsEngine(graph, level.start), [graph, level.start]);
  const session = useLevelSession(level, levelId, race);
  const [fx, setFx] = useState<Fx>(emptyFx);
  const seconds = getGame("traversal").raceSecondsPerQuestion ?? 6;
  const total = engine.referenceQuestionCount();

  const P = usePrediction<DfsState, Parameters<typeof engine.check>[1]>(engine, session, {
    describe: (prev, _next, a) =>
      a.type === "push"
        ? `Đẩy ${a.v} vào ngăn xếp.`
        : `Lấy ${prev.stack[prev.stack.length - 1]} ra (quay lui).`,
    onApply: (prev, _next, a) => {
      const top = prev.stack[prev.stack.length - 1];
      if (a.type === "push") {
        const e = findEdge(graph, top, a.v);
        setFx((f) => bumpFx(f, { pops: [a.v], flows: e ? [[e.id, top]] : [] }));
      } else setFx((f) => bumpFx(f, { pops: [top] }));
    },
    submit: (answers) =>
      void session.complete((hints) => ({
        kind: "traversal",
        answers,
        hints,
        race: race ? { won: true, elapsedMs: session.elapsedMs() } : undefined,
      })),
  });

  const raceState = useRace(race && session.phase === "play", seconds, total, () =>
    session.fail("Máy đã trả lời xong mọi câu trước bạn."),
  );

  const s = P.s;
  const top = s.stack[s.stack.length - 1];
  const stepKey = `${s.answered}`;
  const hint = session.hintFor(stepKey);
  const tree = useMemo(() => treeEdgeIds(graph, s.pred), [graph, s.pred]);
  const prog = engine.progress(s);
  const hintSet = new Set(hint?.highlight ?? []);
  const expectedV = P.pending?.type === "push" ? P.pending.v : P.pending?.type === "pop" ? top : null;

  const vertex = (id: VertexId): VertexView => {
    const si = s.stack.indexOf(id);
    const done = s.done.includes(id);
    const isTop = id === top && s.phase !== "done";
    let desc = "chưa thăm";
    if (done) desc = "đã lấy ra khỏi ngăn xếp";
    else if (isTop) desc = "trên cùng ngăn xếp";
    else if (si >= 0) desc = `trong ngăn xếp, vị trí ${si + 1} tính từ đáy`;
    return {
      state: done ? "done" : isTop ? "current" : si >= 0 ? "queued" : "idle",
      check: done,
      pulse: isTop && session.phase === "play",
      badge: si >= 0 ? si + 1 : undefined,
      badgeTone: "queue",
      ring: expectedV === id ? "hint" : hintSet.has(id) ? "hint" : undefined,
      pop: fx.pops[id],
      ariaLabel: `Đỉnh ${id}, ${desc}`,
    };
  };

  const onVertex = (id: VertexId) => {
    if (P.locked) return;
    P.clearOk();
    P.answer({ type: "push", v: id });
  };

  const onPop = () => {
    if (P.locked) return;
    P.clearOk();
    P.answer({ type: "pop" });
  };

  const onHint = () =>
    session.requestHint(
      stepKey,
      (lvl) => engine.hint(s, lvl),
      `DFS từ ${level.start}; ngăn xếp (đáy → đỉnh) [${s.stack.join(", ")}]; đã thăm ${s.visited.join(", ")}`,
    );

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
          label={`Đồ thị ${graph.directed ? "có hướng" : "vô hướng"} gồm ${graph.vertices.length} đỉnh. DFS xuất phát từ đỉnh ${level.start}.`}
          vertex={vertex}
          edge={edgeViews(tree, fx)}
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
          {s.phase === "done" ? (
            <Question step={prog.total} total={prog.total}>
              Ngăn xếp rỗng: DFS kết thúc.
            </Question>
          ) : (
            <Question
              step={prog.step}
              total={prog.total}
              sub={`Đỉnh trên cùng ngăn xếp là ${top}. Chạm đỉnh được đẩy vào, hoặc bấm Lấy ra.`}
            >
              Bước tiếp theo của DFS là gì?
            </Question>
          )}
          <StackView stack={s.stack} />
          <FeedbackCard fb={P.fb} />
          {hint && !P.pending && <HintCard hint={hint} canMore={session.canHint(stepKey)} onMore={onHint} />}
        </>
      }
      details={
        <>
          <VisitOrder order={s.visited} />
          {g.settings.pseudocode && <Pseudocode lines={DFS_CODE} active={s.phase === "done" ? [2] : [3, 4]} />}
        </>
      }
      detailsLabel="Thứ tự thăm & mã giả"
      footer={{
        center: (
          <span className="lg-stepcount lg-mono">
            Bước {prog.step}/{prog.total}
          </span>
        ),
        right: P.pending ? (
          <button type="button" className="lg-btn lg-btn--primary" onClick={P.proceed} autoFocus>
            Tiếp tục
          </button>
        ) : (
          <button type="button" className="lg-btn lg-btn--teal" onClick={onPop} disabled={P.locked}>
            <ArrowUpFromLine size={18} aria-hidden="true" /> Lấy ra
          </button>
        ),
      }}
      live={P.fb.kind === "bad" ? `Chưa đúng. ${P.fb.text}` : P.fb.kind === "ok" ? `Đúng. ${P.fb.text ?? ""}` : ""}
    >
      <SessionOverlays
        session={session}
        onRestart={onRestart}
        summary={summaryOf(P.mistakes, session)}
        introExtra={<RaceIntro total={total} seconds={seconds} />}
        why={() => traversalWhy(level, graph, s.pred, s.visited)}
      />
    </PlayShell>
  );
}
