// Chia đội (Ch.4 – Đồ thị hai phía). Xếp mọi bạn vào đội X hoặc Y sao cho hai bạn hay cãi nhau (nối bằng cạnh)
// khác đội; không chia được thì chỉ ra một chu trình lẻ. Chọn "cọ" đội rồi chạm đỉnh; bàn phím: X / Y / Delete. GDD mục 10.

import { Ban, Check, RotateCcw, Undo2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useGames } from "../../app/GamesContext";
import { initialTeams, sameTeamEdges, teamsStep, type Team, type TeamsAction, type TeamsState } from "../../core/games/twoTeams";
import { makeGraph, type Edge, type VertexId } from "../../core/graph";
import type { TwoTeamsLevel } from "../../core/levels/types";
import { puzzleOutcome } from "../../core/scoring";
import { GraphBoard, type EdgeView, type VertexView } from "../../ui/board/GraphBoard";
import { Pseudocode } from "../shared/DataViews";
import { fmtTime, joinVi } from "../shared/graphUtil";
import { SessionOverlays } from "../shared/Overlays";
import { PlayShell } from "../shared/PlayShell";
import { FeedbackCard, HintCard, Question, type FeedbackState } from "../shared/Prompt";
import { useLevelSession } from "../shared/session";
import { bumpFx, emptyFx, type Fx, type GameProps } from "../shared/types";
import { BFS_TEAMS, isAdjacent, TEAM_COLOR, teamsHint } from "./logic";
import { teamsWhy } from "./why";

const HINT_KEY = "level";
const TEAMS: Team[] = ["X", "Y"];

interface CycleDraft {
  path: VertexId[];
  closed: boolean;
}

export function TeamsPlay({ level, levelId, race, onRestart }: GameProps<TwoTeamsLevel>) {
  const g = useGames();
  const graph = useMemo(() => makeGraph(level.graph), [level]);
  const session = useLevelSession(level, levelId, race);
  const n = graph.vertices.length;

  const [st, setSt] = useState<TeamsState>(initialTeams);
  const stRef = useRef(st);
  const log = useRef<TeamsAction[]>([]);
  const [brush, setBrush] = useState<Team>("X");
  const [revealed, setRevealed] = useState(false);
  const [pending, setPending] = useState<VertexId[]>([]);
  const [claim, setClaim] = useState<CycleDraft | null>(null);
  const [proved, setProved] = useState<VertexId[] | null>(null);
  const [fx, setFx] = useState<Fx>(emptyFx);
  const [fb, setFb] = useState<FeedbackState>({ kind: "none" });
  const [note, setNote] = useState("");
  const [live, setLive] = useState("");
  const [shake, setShake] = useState(0);

  const finished = st.status !== "playing";
  const playing = session.phase === "play" && !finished;

  useEffect(() => {
    if (!finished) return;
    const t = window.setTimeout(
      () => void session.complete((hints) => ({ kind: "two_teams", actions: log.current, hints })),
      g.reducedMotion ? 250 : 900,
    );
    return () => window.clearTimeout(t);
    // chỉ một lần khi vừa hoàn thành
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  const dispatch = (a: TeamsAction) => {
    const prev = stRef.current;
    const { state, event } = teamsStep(graph, prev, a);
    if (state !== prev) {
      stRef.current = state;
      setSt(state);
      log.current = [...log.current, a];
    }
    return { state, event };
  };

  const assign = (v: VertexId, team: Team | null) => {
    if (!playing) return;
    dispatch({ t: "assign", v, team });
    g.play(team ? "toggle" : "undo");
    setFx((f) => bumpFx(f, { pops: [v] }));
    if (team) setPending((p) => p.filter((x) => x !== v));
    setNote("");
    setLive(team ? `${v} vào đội ${team}.` : `${v} chưa có đội.`);
  };

  const tap = (v: VertexId) => {
    if (!playing) return;
    if (claim) return extendCycle(v);
    assign(v, stRef.current.team[v] === brush ? null : brush);
  };

  const onKey = (v: VertexId, e: KeyboardEvent) => {
    if (!playing || claim) return;
    const k = e.key.toUpperCase();
    if (k === "X" || k === "Y") {
      e.preventDefault();
      assign(v, k);
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      assign(v, null);
    }
  };

  const check = () => {
    if (!playing) return;
    const { state, event } = dispatch({ t: "check" });
    switch (event.kind) {
      case "incomplete": {
        g.play("invalid");
        setPending(event.missing);
        const msg = `Còn ${event.missing.length} bạn chưa có đội: ${joinVi(event.missing)}.`;
        setNote(msg);
        setLive(msg);
        break;
      }
      case "conflicts": {
        g.play("wrong");
        setRevealed(true);
        setShake((x) => x + 1);
        const pairs = event.edges.map((id) => {
          const e = graph.edges.find((x) => x.id === id)!;
          return `${e.u}–${e.v}`;
        });
        setFb({
          kind: "bad",
          title: "Còn cặp cùng đội",
          text: `${pairs.length} cặp hay cãi nhau đang cùng đội: ${joinVi(pairs)}. Các cạnh này được đánh dấu “!” trên hình.`,
        });
        break;
      }
      case "won": {
        g.play("correct");
        setFx((f) => bumpFx(f, { pops: graph.vertices.map((x) => x.id) }));
        const of = (t: Team) => graph.vertices.filter((v) => state.team[v.id] === t).map((v) => v.id);
        setFb({ kind: "ok", title: "Chia được!", text: `Đội X: ${joinVi(of("X"))}. Đội Y: ${joinVi(of("Y"))}.` });
        setLive("Chia được. Mọi cặp hay cãi nhau đều khác đội.");
        break;
      }
    }
  };

  const clear = () => {
    if (!playing || !Object.keys(stRef.current.team).length) return;
    dispatch({ t: "clear" });
    g.play("undo", { rate: 0.8 });
    setRevealed(false);
    setPending([]);
    setNote("");
    setFb({ kind: "none" });
    setLive("Đã xóa hết đội.");
  };

  // ----- chu trình lẻ -----
  const openClaim = () => {
    if (!playing) return;
    g.play("open");
    setNote("");
    setFb({ kind: "none" });
    setClaim({ path: [], closed: false });
  };

  const extendCycle = (v: VertexId) => {
    if (!claim) return;
    const { path, closed } = claim;
    const last = path[path.length - 1];
    const bad = (msg: string) => {
      g.play("invalid");
      setFx((f) => bumpFx(f, { shakes: [v] }));
      setNote(msg);
      setLive(msg);
    };
    if (path.length && v === last) {
      g.play("undo");
      setNote("");
      setClaim({ path: path.slice(0, -1), closed: false });
      return;
    }
    if (closed) return bad("Vòng đã khép. Bấm Xác nhận, hoặc chạm đỉnh cuối để lùi.");
    if (path.length >= 3 && v === path[0]) {
      if (!isAdjacent(graph, last, v)) return bad(`${last} và ${v} không nối với nhau, chưa khép vòng được.`);
      g.play("draw", { rate: 1.2 });
      setNote("");
      setFx((f) => bumpFx(f, { pops: [v], draws: [[edgeBetween(last, v), last]] }));
      setClaim({ path, closed: true });
      setLive(`Đã khép vòng ${path.length} cạnh.`);
      return;
    }
    if (path.includes(v)) return bad("Mỗi đỉnh chỉ đi qua một lần.");
    if (path.length && !isAdjacent(graph, last, v)) return bad(`${last} và ${v} không nối với nhau.`);
    g.play(path.length ? "draw" : "tap");
    setNote("");
    setFx((f) => bumpFx(f, { pops: [v], draws: path.length ? [[edgeBetween(last, v), last]] : [] }));
    setClaim({ path: [...path, v], closed: false });
  };

  const edgeBetween = (u: VertexId, v: VertexId) =>
    graph.edges.find((e) => (e.u === u && e.v === v) || (e.u === v && e.v === u))!.id;

  const submitClaim = () => {
    if (!claim?.closed || !playing) return;
    const { event } = dispatch({ t: "claim", cycle: claim.path });
    if (event.kind === "claim-ok") {
      g.play("correct");
      setProved(claim.path);
      setFb({
        kind: "ok",
        title: "Chứng minh đúng!",
        text: `Vòng ${claim.path.length} cạnh là vòng lẻ: không thể chia hai đội.`,
      });
      setLive("Chứng minh đúng. Có chu trình lẻ nên không chia được.");
      setClaim(null);
    } else if (event.kind === "claim-wrong") {
      g.play("wrong");
      setShake((x) => x + 1);
      setFb({ kind: "bad", title: "Chưa đúng", text: event.reason });
    }
  };

  const hint = session.hintFor(HINT_KEY);
  const onHint = () =>
    session.requestHint(
      HINT_KEY,
      (lvl) => teamsHint(graph, level, lvl),
      `Chia đội (đồ thị hai phía), ${n} đỉnh, ${graph.edges.length} cạnh; đã xếp ${Object.keys(st.team).length} đỉnh${claim ? "; đang chỉ chu trình lẻ" : ""}`,
    );
  const hintSet = new Set(hint?.highlight ?? []);

  // ----- hiển thị -----
  const conflictSet = new Set(revealed ? sameTeamEdges(graph, st.team) : []);
  const pathEdges = useMemo(() => {
    const s = new Set<string>();
    if (!claim) return s;
    for (let i = 1; i < claim.path.length; i++) s.add(edgeBetween(claim.path[i - 1], claim.path[i]));
    if (claim.closed) s.add(edgeBetween(claim.path[claim.path.length - 1], claim.path[0]));
    return s;
    // edgeBetween chỉ phụ thuộc graph
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claim, graph]);
  const pendingSet = new Set(pending);

  const vertex = (id: VertexId): VertexView => {
    const team = st.team[id];
    const order = claim ? claim.path.indexOf(id) : -1;
    const parts = [`Bạn ${id}`, team ? `đội ${team}` : "chưa có đội"];
    if (order >= 0) parts.push(`thứ ${order + 1} trên vòng`);
    return {
      fill: team ? TEAM_COLOR[team].fill : undefined,
      textColor: team ? TEAM_COLOR[team].text : undefined,
      badge: order >= 0 ? order + 1 : team,
      badgeTone: order >= 0 ? "select" : undefined,
      badgeColor: order < 0 && team ? TEAM_COLOR[team] : undefined,
      ring: order >= 0 ? "evidence" : pendingSet.has(id) ? "pending" : hintSet.has(id) ? "hint" : undefined,
      pop: fx.pops[id],
      shake: fx.shakes[id],
      ariaLabel: parts.join(", "),
    };
  };

  const edge = (e: Edge): EdgeView => {
    if (claim)
      return {
        state: pathEdges.has(e.id) ? "active" : "idle",
        label: null,
        draw: fx.draws[e.id]?.n,
        drawFrom: fx.draws[e.id]?.from,
      };
    if (st.status === "won") return { state: "result", label: null };
    if (conflictSet.has(e.id)) return { state: "error", label: "!" };
    return { state: "idle", label: null };
  };

  const stars = puzzleOutcome({ mistakes: st.mistakes, hints: session.hints }).stars;
  const placed = Object.keys(st.team).length;
  const count = (t: Team) => Object.values(st.team).filter((x) => x === t).length;
  const pathLen = claim ? claim.path.length - 1 + (claim.closed ? 1 : 0) : 0;

  return (
    <PlayShell
      level={level}
      race={race}
      stars={stars}
      starsLabel={`Dự kiến ${stars} sao (${st.mistakes} lỗi)`}
      canHint={session.canHint(HINT_KEY) && playing}
      onHint={onHint}
      board={
        <GraphBoard
          graph={graph}
          label={`${n} bạn, ${graph.edges.length} cặp hay cãi nhau. Chạm một bạn để xếp vào đội đang chọn; phím X, Y để xếp, Delete để bỏ.`}
          vertex={vertex}
          edge={edge}
          onVertex={playing ? tap : undefined}
          onVertexKey={onKey}
          shake={shake}
        />
      }
      prompt={
        <>
          {claim ? (
            <>
              <Question
                kicker="Chứng minh không chia được"
                sub="Chạm lần lượt các bạn liền nhau, cuối cùng chạm lại bạn đầu tiên để khép vòng. Chạm bạn cuối để lùi."
              >
                Chỉ ra một vòng có số cạnh lẻ
              </Question>
              <p className="lg-claim__picked">
                {claim.path.length ? (
                  <span className="lg-mono">
                    {claim.path.join(" → ")}
                    {claim.closed ? ` → ${claim.path[0]}` : ""}
                  </span>
                ) : (
                  "Chưa chọn bạn nào."
                )}
                {pathLen > 0 && <span className="lg-chip lg-teams__len">{pathLen} cạnh</span>}
              </p>
            </>
          ) : (
            <>
              <Question kicker="Nhiệm vụ" sub="Chọn đội ở dưới rồi chạm từng bạn. Chạm lại để bỏ. Xếp xong bấm Kiểm tra.">
                Chia hai đội, cặp hay cãi nhau phải khác đội
              </Question>
              <div className="lg-seg lg-teams__brush" role="radiogroup" aria-label="Đội đang xếp">
                {TEAMS.map((t) => (
                  <label key={t} className={`lg-seg__opt${brush === t ? " lg-seg__opt--on" : ""}`}>
                    <input
                      type="radio"
                      name="lg-team-brush"
                      value={t}
                      checked={brush === t}
                      onChange={() => {
                        g.play("tick");
                        setBrush(t);
                      }}
                    />
                    <span
                      className="lg-teams__swatch"
                      style={{ background: TEAM_COLOR[t].fill, color: TEAM_COLOR[t].text }}
                      aria-hidden="true"
                    >
                      {t}
                    </span>
                    Đội {t}
                    <span className="lg-teams__count lg-mono">{count(t)}</span>
                  </label>
                ))}
              </div>
            </>
          )}
          <div className="lg-mstats">
            <div className={`lg-mstats__cell${placed === n ? " lg-mstats__cell--ok" : ""}`}>
              <span className="lg-mstats__label">Đã xếp</span>
              <span className="lg-mstats__value">
                {placed}
                <span className="lg-mstats__unit">/{n}</span>
              </span>
            </div>
            <div className="lg-mstats__cell">
              <span className="lg-mstats__label">Kiểm tra</span>
              <span className="lg-mstats__value">
                {st.checks}
                <span className="lg-mstats__unit"> lần</span>
              </span>
            </div>
            <div className={`lg-mstats__cell${st.mistakes ? " lg-mstats__cell--warn" : ""}`}>
              <span className="lg-mstats__label">Lỗi</span>
              <span className="lg-mstats__value">{st.mistakes}</span>
            </div>
          </div>
          {revealed && !claim && <p className="lg-osnote lg-osnote--legend">Cạnh đỏ có dấu “!”: hai đầu đang cùng đội.</p>}
          {note && <p className="lg-osnote">{note}</p>}
          <FeedbackCard fb={fb} />
          {hint && <HintCard hint={hint} canMore={session.canHint(HINT_KEY)} onMore={onHint} />}
        </>
      }
      details={<Pseudocode title="Kiểm tra hai phía bằng BFS" lines={BFS_TEAMS} active={[]} />}
      detailsLabel="Cách máy kiểm tra"
      footer={
        claim
          ? {
              left: (
                <button
                  type="button"
                  className="lg-btn lg-btn--ghost"
                  onClick={() => {
                    g.play("close");
                    setNote("");
                    setClaim(null);
                  }}
                >
                  Hủy
                </button>
              ),
              center: (
                <button
                  type="button"
                  className="lg-btn lg-btn--ghost lg-btn--sm"
                  onClick={() => claim.path.length && extendCycle(claim.path[claim.path.length - 1])}
                  disabled={!claim.path.length}
                >
                  <Undo2 size={18} aria-hidden="true" /> Lùi
                </button>
              ),
              right: (
                <button
                  type="button"
                  className="lg-btn lg-btn--primary"
                  onClick={submitClaim}
                  disabled={!playing || !claim.closed}
                >
                  Xác nhận vòng lẻ
                </button>
              ),
            }
          : {
              left: (
                <button
                  type="button"
                  className="lg-btn lg-btn--ghost lg-btn--sm"
                  onClick={clear}
                  disabled={!playing || placed === 0}
                  aria-label="Xếp lại"
                >
                  <RotateCcw size={18} aria-hidden="true" /> <span className="lg-btn__wide">Xếp lại</span>
                </button>
              ),
              center: (
                <button type="button" className="lg-btn" onClick={openClaim} disabled={!playing}>
                  <Ban size={18} aria-hidden="true" className="lg-btn__wide" /> Không chia được
                </button>
              ),
              right: (
                <button type="button" className="lg-btn lg-btn--primary" onClick={check} disabled={!playing}>
                  <Check size={18} aria-hidden="true" className="lg-btn__wide" /> Kiểm tra
                </button>
              ),
            }
      }
      live={
        fb.kind === "bad"
          ? `${fb.title ?? "Chưa đúng"}. ${fb.text}`
          : fb.kind === "ok"
            ? `${fb.title ?? ""} ${fb.text ?? ""}`
            : live
      }
    >
      <SessionOverlays
        session={session}
        onRestart={onRestart}
        summary={`${st.mistakes} lỗi · ${st.checks} lần kiểm tra · ${session.hints} gợi ý · ${fmtTime(session.elapsedMs())}`}
        why={() => teamsWhy(graph, st, proved)}
      />
    </PlayShell>
  );
}
