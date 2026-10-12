// Thành phố bùn (Ch.7 – Cây khung nhỏ nhất). GDD mục 6.

import { ArrowLeft, ChevronLeft, ChevronRight, CircleCheck, Pause, Play, RotateCcw, Route, TriangleAlert } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useGames } from "../../app/GamesContext";
import { kruskal, prim, type KruskalStep, type PrimStep } from "../../core/algorithms/spanningTree";
import { analyzeMuddy, cycleThrough, optimalCost, type MuddyRules } from "../../core/games/muddyCity";
import { edgeMap, makeGraph, type Edge, type VertexId } from "../../core/graph";
import type { MuddyLevel } from "../../core/levels/types";
import { projectedStars } from "../../core/scoring";
import { fmtTime } from "../shared/graphUtil";
import { SessionOverlays } from "../shared/Overlays";
import { PlayShell } from "../shared/PlayShell";
import { FeedbackCard, HintCard, Question, type FeedbackState } from "../shared/Prompt";
import { useLevelSession } from "../shared/session";
import { bumpFx, emptyFx, type Fx, type GameProps } from "../shared/types";
import { findCycle, kruskalIntro, kruskalText, muddyHint, primIntro, primText, roadName } from "./logic";
import { TownBoard, type HouseView, type RoadView } from "./TownBoard";
import { muddyWhy } from "./why";

const HINT_KEY = "level";

type Algo = "kruskal" | "prim";

interface Replay {
  algo: Algo;
  /** số bước đã chạy (0 = chưa lát gì) */
  step: number;
  playing: boolean;
}

export function MuddyPlay({ level, levelId, race, onRestart }: GameProps<MuddyLevel>) {
  const g = useGames();
  const graph = useMemo(() => makeGraph(level.graph), [level]);
  const rules = useMemo<MuddyRules>(() => ({ locked: level.locked ?? [], broken: level.broken ?? [] }), [level]);
  const em = useMemo(() => edgeMap(graph), [graph]);
  const session = useLevelSession(level, levelId, race);

  const [paved, setPaved] = useState<string[]>(() => [...(level.locked ?? [])]);
  // draws: lát đá dần · flows: gỡ đá · shakes: rung thẻ giá · pops: nhà nảy khi hai nhóm nhà nối lại
  const [fx, setFx] = useState<Fx>(emptyFx);
  const [fb, setFb] = useState<FeedbackState>({ kind: "none" });
  const [live, setLive] = useState("");
  const [checked, setChecked] = useState(false);
  const [replay, setReplay] = useState<Replay | null>(null);
  const [anim, setAnim] = useState({ n: 0, on: false });
  // trạng thái lát lúc xin gợi ý: tô sáng tắt khi sinh viên đã làm theo
  const hintAt = useRef<Set<string>>(new Set());

  const an = analyzeMuddy(graph, paved);
  const cycle = useMemo(() => findCycle(graph, paved), [graph, paved]);
  const optimal = useMemo(() => optimalCost(graph, rules), [graph, rules]);
  const kr = useMemo(() => kruskal(graph, { forced: rules.locked, excluded: rules.broken }), [graph, rules]);
  const primStart = graph.vertices[0].id;
  const pr = useMemo(() => prim(graph, primStart, { forced: rules.locked, excluded: rules.broken }), [graph, rules, primStart]);
  const playing = session.phase === "play" && !checked;
  const n = graph.vertices.length;
  const E = graph.edges.length;

  // người dân đi dạo một lúc rồi mới hiện kết quả
  useEffect(() => {
    if (!checked) return;
    const t = window.setTimeout(
      () => void session.complete((hints) => ({ kind: "muddy_city", paved, hints })),
      g.reducedMotion ? 300 : 1700,
    );
    return () => window.clearTimeout(t);
    // chỉ một lần khi vừa kiểm tra xong
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checked]);

  const toggle = (id: string) => {
    if (!playing) return;
    const e = em.get(id)!;
    const name = roadName(e);
    if (rules.locked.includes(id) || rules.broken.includes(id)) {
      g.play("invalid");
      setFx((f) => bumpFx(f, { shakes: [id] }));
      const text = rules.broken.includes(id)
        ? `Đường ${name} đã bị lũ cuốn, không lát được. Hãy chọn đường khác.`
        : level.variant === "broken"
          ? `Đường ${name} vẫn tốt nên được giữ lại (có ổ khóa).`
          : `Đường ${name} là đường bắt buộc (có ổ khóa), không gỡ được.`;
      setFb({ kind: "bad", title: rules.broken.includes(id) ? "Không lát được" : "Không gỡ được", text });
      return;
    }
    setFb({ kind: "none" });
    if (paved.includes(id)) {
      const next = paved.filter((x) => x !== id);
      setPaved(next);
      g.play("unpave");
      setFx((f) => bumpFx(f, { flows: [[id, e.u]] }));
      setLive(`Đã bỏ lát ${name}. Tổng chi phí ${analyzeMuddy(graph, next).cost}.`);
      return;
    }
    const touches = (v: VertexId) => paved.some((x) => em.get(x)!.u === v || em.get(x)!.v === v);
    // đá phủ từ phía mạng đường đã có
    const from = touches(e.v) && !touches(e.u) ? e.v : e.u;
    const next = [...paved, id];
    const joins = !cycleThrough(graph, next, id);
    setPaved(next);
    g.play("pave", { rate: joins ? 1 : 0.85 });
    setFx((f) => bumpFx(f, { draws: [[id, from]], pops: joins ? [e.u, e.v] : [] }));
    const a2 = analyzeMuddy(graph, next);
    setLive(
      `Đã lát ${name}, chi phí ${e.w}. Tổng ${a2.cost}; ${a2.groups} nhóm nhà.${joins ? "" : " Đường này tạo vòng thừa."}`,
    );
  };

  const resetAll = () => {
    if (!playing) return;
    const removed = paved.filter((id) => !rules.locked.includes(id));
    if (!removed.length) return;
    setPaved([...rules.locked]);
    g.play("unpave", { rate: 0.8 });
    setFx((f) => bumpFx(f, { flows: removed.map((id) => [id, em.get(id)!.u] as [string, string]) }));
    setFb({ kind: "none" });
    setLive("Đã bỏ lát mọi đường.");
  };

  const check = () => {
    if (!playing || !an.spanning) return;
    setChecked(true);
    g.play("correct");
    setFb({ kind: "ok", title: "Cả làng đã nối với nhau!", text: `${an.need} đường, tổng chi phí ${an.cost}. Người dân ra đường đi dạo.` });
  };

  // ----- gợi ý -----
  const hint = session.hintFor(HINT_KEY);
  const onHint = () =>
    session.requestHint(
      HINT_KEY,
      (lvl) => {
        hintAt.current = new Set(paved);
        return muddyHint(graph, rules, paved, lvl);
      },
      `Thành phố bùn: ${n} nhà, ${E} đường. Đã lát ${paved.map((id) => roadName(em.get(id)!)).join(", ") || "chưa có đường nào"}; tổng chi phí ${an.cost}; ${an.groups} nhóm nhà${cycle ? `; có vòng ${cycle.vertices.join("–")}` : ""}.`,
    );
  const hintOn = (id: string) => !!hint?.highlight?.includes(id) && paved.includes(id) === hintAt.current.has(id);

  // ----- phát lại Kruskal & Prim -----
  const steps: (KruskalStep | PrimStep)[] = replay?.algo === "prim" ? pr.steps : kr.steps;
  const total = steps.length;

  const go = (k: number, keepPlaying = false) => {
    if (!replay) return;
    const to = Math.max(0, Math.min(total, k));
    if (to === replay.step) return;
    const fwd = to > replay.step;
    if (fwd) {
      const s = steps[to - 1];
      g.play("accepted" in s && !s.accepted ? "tick" : "pave");
    } else g.play("undo");
    setAnim((a) => ({ n: a.n + 1, on: fwd }));
    setReplay({ ...replay, step: to, playing: keepPlaying && to < total });
  };

  useEffect(() => {
    if (!replay?.playing) return;
    const t = window.setTimeout(() => go(replay.step + 1, true), replay.step === 0 ? 500 : 1150);
    return () => window.clearTimeout(t);
    // go đọc replay mới nhất qua closure của lần vẽ này
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replay]);

  const openReplay = () => {
    g.play("open");
    setAnim((a) => ({ n: a.n + 1, on: false }));
    setReplay({ algo: "kruskal", step: 0, playing: false });
  };
  const setAlgo = (algo: Algo) => {
    if (!replay || replay.algo === algo) return;
    g.play("toggle");
    setAnim((a) => ({ n: a.n + 1, on: false }));
    setReplay({ algo, step: 0, playing: false });
  };
  const closeReplay = () => {
    g.play("close");
    setReplay(null);
  };

  const rv = useMemo(() => {
    if (!replay) return null;
    const k = replay.step;
    if (replay.algo === "kruskal") {
      const done = kr.steps.slice(0, k);
      const cur = k > 0 ? kr.steps[k - 1] : null;
      return {
        paved: new Set(done.filter((s) => s.accepted).map((s) => s.edge.id)),
        current: cur?.edge.id ?? null,
        currentOk: cur?.accepted ?? true,
        from: cur?.edge.u,
        frontier: new Set<string>(),
        inTree: new Set<VertexId>(),
      };
    }
    const done = pr.steps.slice(0, k);
    const cur = k > 0 ? pr.steps[k - 1] : null;
    return {
      paved: new Set(done.map((s) => s.edge.id)),
      current: cur?.edge.id ?? null,
      currentOk: true,
      from: cur ? (cur.edge.u === cur.added ? cur.edge.v : cur.edge.u) : undefined,
      frontier: new Set(pr.steps[k]?.frontier ?? []),
      inTree: new Set([primStart, ...done.map((s) => s.added)]),
    };
  }, [replay, kr, pr, primStart]);

  // ----- hiển thị -----
  const road = (e: Edge): RoadView => {
    const locked = rules.locked.includes(e.id);
    const broken = rules.broken.includes(e.id);
    if (rv) {
      const isCur = rv.current === e.id;
      return {
        paved: rv.paved.has(e.id),
        locked,
        broken,
        mine: paved.includes(e.id),
        tone: isCur ? (rv.currentOk ? "accept" : "reject") : rv.frontier.has(e.id) ? "frontier" : undefined,
        pave: isCur && anim.on ? anim.n : undefined,
        paveFrom: rv.from,
      };
    }
    const isPaved = paved.includes(e.id);
    const tone = hintOn(e.id) ? "hint" : cycle?.edges.includes(e.id) ? "cycle" : undefined;
    const state = broken ? "hỏng, không lát được" : locked ? "đã lát sẵn, có ổ khóa" : isPaved ? "đã lát" : "chưa lát";
    return {
      paved: isPaved,
      locked,
      broken,
      tone,
      pave: fx.draws[e.id]?.n,
      paveFrom: fx.draws[e.id]?.from,
      unpave: fx.flows[e.id]?.n,
      shake: fx.shakes[e.id],
      ariaLabel: `Đường ${roadName(e)}, chi phí ${e.w}, ${state}${tone === "cycle" ? ", nằm trên vòng thừa" : ""}${tone === "hint" ? ", đang được gợi ý" : ""}`,
    };
  };

  const house = (id: VertexId): HouseView => (rv ? { glow: rv.inTree.has(id) } : { pop: fx.pops[id] });

  const stars = projectedStars(3, session.hints);
  const finished = checked || session.phase === "won";

  const sub =
    level.variant === "forced"
      ? "Đường có ổ khóa đã lát sẵn. Lát thêm để mọi nhà nối với nhau, tốn ít tiền nhất."
      : level.variant === "broken"
        ? "Đường ngập nước không lát được. Lát thêm đường thay thế, rẻ nhất có thể."
        : "Chạm một con đường để lát hoặc bỏ lát. Tốn càng ít tiền càng tốt.";

  // sau Kiểm tra, thẻ phản hồi thay cho dòng trạng thái: bản đồ trên mobile không bị co lại đột ngột lúc người dân đi dạo
  const status = cycle || checked ? null : an.spanning ? (
    <p className="lg-osnote" role="status">
      Mọi nhà đã nối với nhau bằng {an.need} đường. Bấm Kiểm tra, hoặc đổi đường cho rẻ hơn.
    </p>
  ) : an.groups > 1 && an.count > 0 ? (
    <p className="lg-osnote">Còn {an.groups} nhóm nhà chưa đi tới nhau được.</p>
  ) : null;

  return (
    <PlayShell
      level={level}
      race={race}
      stars={stars}
      starsLabel={`Tối đa ${stars} sao; sao tính theo chi phí khi bấm Kiểm tra`}
      canHint={session.canHint(HINT_KEY) && playing}
      onHint={onHint}
      stageClass="lg-play__stage--town"
      board={
        <TownBoard
          graph={graph}
          seed={level.id}
          label={
            replay
              ? `Phát lại ${replay.algo === "kruskal" ? "Kruskal" : "Prim"}, bước ${replay.step}/${total}`
              : `Bản đồ ${n} nhà và ${E} con đường. Chạm một con đường để lát hoặc bỏ lát.`
          }
          road={road}
          house={house}
          onRoad={playing ? toggle : undefined}
          walk={finished && !replay ? paved : null}
        />
      }
      prompt={
        replay ? (
          <ReplayPanel
            replay={replay}
            kr={kr.steps}
            pr={pr.steps}
            total={total}
            krTotal={kr.total}
            prTotal={pr.total}
            need={n - 1}
            primStart={primStart}
            forced={rules.locked}
            variant={level.variant}
            myCost={an.cost}
            optimal={optimal}
            onAlgo={setAlgo}
            onPrev={() => go(replay.step - 1)}
            onNext={() => go(replay.step + 1)}
            onTogglePlay={() => {
              if (replay.playing) setReplay({ ...replay, playing: false });
              else if (replay.step >= total) {
                setAnim((a) => ({ n: a.n + 1, on: false }));
                setReplay({ ...replay, step: 0, playing: true });
              } else setReplay({ ...replay, playing: true });
            }}
          />
        ) : (
          <>
            <Question kicker="Nhiệm vụ" sub={sub}>
              Lát đường nối mọi nhà
            </Question>
            <MuddyStats count={an.count} need={an.need} cost={an.cost} groups={an.groups} />
            {cycle && (
              <p className="lg-osnote lg-osnote--warn" role="status">
                <TriangleAlert size={16} aria-hidden="true" className="lg-osnote__icon" /> Thừa: tạo vòng{" "}
                <b>{cycle.vertices.join("–")}</b>. Bỏ bớt một đường trong vòng thì các nhà vẫn nối với nhau.
              </p>
            )}
            {status}
            <FeedbackCard fb={fb} />
            {hint && <HintCard hint={hint} canMore={session.canHint(HINT_KEY)} onMore={onHint} />}
          </>
        )
      }
      footer={
        replay
          ? {
              left: (
                <button type="button" className="lg-btn lg-btn--ghost" onClick={closeReplay}>
                  <ArrowLeft size={18} aria-hidden="true" /> Về kết quả
                </button>
              ),
              center: (
                <span className="lg-stepcount lg-mono lg-hide-narrow">
                  Bước {replay.step}/{total}
                </span>
              ),
            }
          : {
              left: (
                <button
                  type="button"
                  className="lg-btn lg-btn--ghost lg-btn--sm"
                  onClick={resetAll}
                  disabled={!playing || paved.length === rules.locked.length}
                >
                  <RotateCcw size={18} aria-hidden="true" /> Bỏ lát hết
                </button>
              ),
              right: (
                <button type="button" className="lg-btn lg-btn--primary" onClick={check} disabled={!playing || !an.spanning}>
                  <CircleCheck size={18} aria-hidden="true" /> Kiểm tra
                </button>
              ),
            }
      }
      live={fb.kind !== "none" ? `${fb.title ?? ""} ${fb.text ?? ""}` : live}
    >
      <SessionOverlays
        session={session}
        onRestart={onRestart}
        summary={`Chi phí ${an.cost} · tối ưu ${optimal} · ${session.hints} gợi ý · ${fmtTime(session.elapsedMs())}`}
        why={() => muddyWhy(level, graph, rules, paved)}
        hideResult={!!replay}
        resultExtra={
          <button type="button" className="lg-btn" onClick={openReplay}>
            <Route size={18} aria-hidden="true" /> Xem Kruskal &amp; Prim
          </button>
        }
      />
    </PlayShell>
  );
}

function MuddyStats(props: { count: number; need: number; cost: number; groups: number }) {
  const done = props.count === props.need && props.groups === 1;
  return (
    <div className="lg-mstats">
      <div
        className={`lg-mstats__cell${done ? " lg-mstats__cell--ok" : props.count > props.need ? " lg-mstats__cell--warn" : ""}`}
      >
        <span className="lg-mstats__label">Đường đã lát</span>
        <span className="lg-mstats__value">
          {props.count}/{props.need}
        </span>
      </div>
      <div className="lg-mstats__cell">
        <span className="lg-mstats__label">Tổng chi phí</span>
        <span className="lg-mstats__value">{props.cost}</span>
      </div>
      <div className={`lg-mstats__cell${props.groups === 1 ? " lg-mstats__cell--ok" : ""}`}>
        <span className="lg-mstats__label">Nhóm nhà</span>
        <span className="lg-mstats__value">{props.groups}</span>
      </div>
    </div>
  );
}

function ReplayPanel(props: {
  replay: Replay;
  kr: KruskalStep[];
  pr: PrimStep[];
  total: number;
  krTotal: number;
  prTotal: number;
  need: number;
  primStart: VertexId;
  forced: string[];
  variant?: "forced" | "broken";
  myCost: number;
  optimal: number;
  onAlgo: (a: Algo) => void;
  onPrev: () => void;
  onNext: () => void;
  onTogglePlay: () => void;
}) {
  const { replay, total } = props;
  const k = replay.step;
  const isK = replay.algo === "kruskal";
  const panelId = useId();
  const firstTab = useRef<HTMLButtonElement | null>(null);

  // thẻ kết quả vừa đóng: đưa focus vào phần phát lại
  useEffect(() => {
    firstTab.current?.focus({ preventScroll: true });
  }, []);

  let text = isK ? kruskalIntro(props.variant) : primIntro(props.primStart);
  if (k > 0) text = isK ? kruskalText(props.kr[k - 1]) : primText(props.pr[k - 1], props.forced);
  if (k === total && k > 0) text += ` Xong: ${props.need} đường, tổng chi phí ${isK ? props.krTotal : props.prTotal}.`;

  const chips = isK
    ? props.kr.map((s, i) => ({ e: s.edge, state: i < k ? (s.accepted ? "ok" : "no") : "", current: i === k - 1 }))
    : props.pr.map((s, i) => ({ e: s.edge, state: i < k ? "ok" : "", current: i === k - 1 }));

  return (
    <div className="lg-dv lg-replay">
      <div className="lg-tabs" role="tablist" aria-label="Thuật toán">
        {(["kruskal", "prim"] as const).map((a, i) => (
          <button
            key={a}
            ref={i === 0 ? firstTab : undefined}
            type="button"
            role="tab"
            className="lg-tabs__tab"
            aria-selected={replay.algo === a}
            aria-controls={panelId}
            onClick={() => props.onAlgo(a)}
          >
            {a === "kruskal" ? "Kruskal" : "Prim"}
          </button>
        ))}
      </div>
      <div id={panelId} role="tabpanel" className="lg-dv">
        <p className="lg-replay__text" aria-live="polite">
          {text}
        </p>
        <ol className="lg-replay__steps" aria-label={isK ? "Các đường theo thứ tự xét" : "Các đường theo thứ tự lát"}>
          {chips.map((c, i) => (
            <li
              key={i}
              className={`lg-replay__step${c.state ? ` lg-replay__step--${c.state}` : ""}${c.current ? " lg-replay__step--current" : ""}`}
            >
              {roadName(c.e)} · {c.e.w}
              {c.state === "ok" && <span className="lg-sr-only"> (lát)</span>}
              {c.state === "no" && <span className="lg-sr-only"> (bỏ qua vì tạo vòng)</span>}
            </li>
          ))}
        </ol>
        <div className="lg-replay__controls">
          <button type="button" className="lg-btn lg-btn--sm" onClick={props.onPrev} disabled={k === 0}>
            <ChevronLeft size={18} aria-hidden="true" /> Trước
          </button>
          <button type="button" className="lg-btn lg-btn--sm lg-btn--primary" onClick={props.onNext} disabled={k >= total}>
            Tiếp <ChevronRight size={18} aria-hidden="true" />
          </button>
          <button type="button" className="lg-btn lg-btn--sm" onClick={props.onTogglePlay} aria-pressed={replay.playing}>
            {replay.playing ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
            {replay.playing ? "Dừng" : "Tự chạy"}
          </button>
        </div>
        <p className="lg-replay__compare">
          Cây của bạn: <b>{props.myCost}</b> · Cây khung nhỏ nhất: <b>{props.optimal}</b>
          {props.myCost === props.optimal ? " · bằng nhau!" : ""}
        </p>
        <p className="lg-osnote lg-osnote--legend">
          Vạch trắng đứt: đường bạn đã lát.{isK ? "" : " Sân vàng: nhà đã vào cây."}
        </p>
      </div>
    </div>
  );
}
