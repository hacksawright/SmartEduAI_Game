// Một nét vẽ (Ch.3 – Euler). GDD mục 5.

import { Ban, RotateCcw, Undo2, Unlink } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useGames } from "../../app/GamesContext";
import { analyzeEuler, type EulerAnalysis } from "../../core/algorithms/euler";
import type { Hint } from "../../core/engines/types";
import {
  initialOneStroke,
  movesFrom,
  oneStrokeStep,
  type OneStrokeAction,
  type OneStrokeState,
} from "../../core/games/oneStroke";
import { degrees, inOutDegrees, makeGraph, type Edge, type Graph, type VertexId } from "../../core/graph";
import type { OneStrokeLevel } from "../../core/levels/types";
import { oneStrokeOutcome } from "../../core/scoring";
import { GraphBoard, type EdgeView, type VertexView } from "../../ui/board/GraphBoard";
import { fmtTime } from "../shared/graphUtil";
import { SessionOverlays } from "../shared/Overlays";
import { PlayShell } from "../shared/PlayShell";
import { FeedbackCard, HintCard, Question, type FeedbackState } from "../shared/Prompt";
import { useLevelSession } from "../shared/session";
import { bumpFx, emptyFx, type Fx, type GameProps } from "../shared/types";
import { River } from "./River";
import { oneStrokeWhy } from "./why";

const HINT_KEY = "level";

interface Claim {
  disconnected: boolean;
  vertices: VertexId[];
}

export function OneStrokePlay({ level, levelId, race, onRestart }: GameProps<OneStrokeLevel>) {
  const g = useGames();
  const graph = useMemo(() => makeGraph(level.graph), [level]);
  const an = useMemo(() => analyzeEuler(graph), [graph]);
  const deg = useMemo(() => degrees(graph), [graph]);
  const io = useMemo(() => inOutDegrees(graph), [graph]);
  const session = useLevelSession(level, levelId, race);

  const [st, setSt] = useState<OneStrokeState>(initialOneStroke);
  const stRef = useRef(st);
  const log = useRef<OneStrokeAction[]>([]);
  const [fx, setFx] = useState<Fx>(emptyFx);
  const [fb, setFb] = useState<FeedbackState>({ kind: "none" });
  const [note, setNote] = useState("");
  const [claim, setClaim] = useState<Claim | null>(null);
  const [shake, setShake] = useState(0);
  const finished = st.status === "won" || st.status === "proved";
  const E = graph.edges.length;

  const playing = session.phase === "play" && !finished;

  // thắng: chờ nét cuối vẽ xong rồi mới hiện kết quả
  useEffect(() => {
    if (!finished) return;
    const t = window.setTimeout(
      () => void session.complete((hints) => ({ kind: "one_stroke", actions: log.current, hints })),
      st.status === "won" ? (g.reducedMotion ? 150 : 650) : 250,
    );
    return () => window.clearTimeout(t);
    // chỉ một lần khi vừa hoàn thành
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  const dispatch = (a: OneStrokeAction) => {
    const prev = stRef.current;
    const { state, event } = oneStrokeStep(graph, prev, a);
    if (state !== prev) {
      stRef.current = state;
      setSt(state);
      log.current = [...log.current, a];
    }
    return { state, event };
  };

  const tap = (v: VertexId) => {
    if (!playing) return;
    if (claim) return toggleEvidence(v);
    const cur = stRef.current;
    // khi kéo nhanh, sự kiện có thể tới trước lần vẽ lại sau khi thắng
    if (cur.status === "won" || cur.status === "proved") return;
    // ấn lại đỉnh đang đặt bút (thường là lúc bắt đầu kéo): bỏ qua
    if (cur.path.length && cur.path[cur.path.length - 1] === v) return;
    const drewFrom = cur.path[cur.path.length - 1];
    const { state, event } = dispatch({ t: "tap", v });
    switch (event.kind) {
      case "start":
        g.play("tap");
        setNote("");
        setFb({ kind: "none" });
        setFx((f) => bumpFx(f, { pops: [v] }));
        break;
      case "draw":
        g.play("draw", { rate: 0.9 + (0.5 * state.used.length) / E });
        setNote("");
        setFx((f) => bumpFx(f, { pops: [event.to], draws: [[event.edge, event.from]] }));
        break;
      case "won":
        g.play("draw", { rate: 1.4 });
        setNote("");
        setFb({ kind: "ok", title: "Đã vẽ hết mọi cạnh!", text: `Nét vẽ đi từ ${state.path[0]} tới ${v}.` });
        setFx((f) => bumpFx(f, { pops: [v], draws: [[state.used[state.used.length - 1], drewFrom]] }));
        break;
      case "stuck": {
        // kẹt ngay sau một nét vẽ (hoặc đặt bút ở đỉnh chỉ có cung đi vào)
        const drew = state.used.length > cur.used.length;
        setFx((f) => bumpFx(f, { pops: [v], draws: drew ? [[state.used[state.used.length - 1], drewFrom]] : [] }));
        g.play(event.counted ? "stuck" : "invalid");
        setShake((x) => x + 1);
        setNote("");
        setFb({
          kind: "bad",
          title: "Bị kẹt",
          text: `Bút ở ${v} không còn cạnh nào để đi, nhưng vẫn còn ${E - state.used.length} cạnh chưa vẽ. Bấm Hoàn tác để lùi một bước, hoặc Làm lại.${
            event.counted ? "" : " Kẹt đúng chỗ cũ nên không tính thêm lỗi."
          }`,
        });
        break;
      }
      case "invalid": {
        g.play("invalid");
        if (event.reason === "stuck") {
          // thẻ "Bị kẹt" đã nói cách gỡ: chỉ rung bàn cờ
          setShake((x) => x + 1);
          break;
        }
        setFx((f) => bumpFx(f, { shakes: [v] }));
        const from = drewFrom;
        const why =
          event.reason === "used"
            ? `Cạnh ${from}–${v} đã vẽ rồi.`
            : event.reason === "direction"
              ? `Cung giữa ${from} và ${v} chỉ đi theo chiều mũi tên.`
              : event.reason === "not-adjacent"
                ? `Không có cạnh nối ${from} với ${v}.`
                : "";
        setNote(why);
        break;
      }
    }
  };

  const undo = () => {
    if (!playing || claim || !stRef.current.path.length) return;
    dispatch({ t: "undo" });
    g.play("undo");
    setNote("");
    setFb({ kind: "none" });
  };

  const reset = () => {
    if (!playing || claim || !stRef.current.path.length) return;
    dispatch({ t: "reset" });
    g.play("undo", { rate: 0.8 });
    setNote("");
    setFb({ kind: "none" });
  };

  // ----- chứng minh bất khả -----
  const openClaim = () => {
    if (!playing) return;
    g.play("open");
    setNote("");
    setFb({ kind: "none" });
    setClaim({ disconnected: false, vertices: [] });
  };

  const toggleEvidence = (v: VertexId) => {
    g.play("toggle");
    setClaim((c) =>
      c && {
        disconnected: false,
        vertices: c.vertices.includes(v) ? c.vertices.filter((x) => x !== v) : [...c.vertices, v],
      },
    );
  };

  const submitClaim = () => {
    if (!claim || !playing) return;
    const { event } = dispatch({ t: "claim", disconnected: claim.disconnected, vertices: claim.vertices });
    if (event.kind === "claim-ok") {
      g.play("correct");
      setFb({ kind: "ok", title: "Chứng minh đúng!", text: "Hình này không thể vẽ bằng một nét." });
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
      (lvl) => oneStrokeHint(graph, an, lvl),
      `Một nét vẽ, ${graph.directed ? "có hướng" : "vô hướng"}, ${graph.vertices.length} đỉnh, ${E} cạnh; đã vẽ ${st.used.length} cạnh; nét hiện tại ${st.path.join("→") || "chưa đặt bút"}`,
    );
  const hintSet = new Set(hint?.highlight ?? []);

  // ----- hiển thị -----
  const pen = st.path[st.path.length - 1];
  const remaining = useMemo(() => {
    const m = new Map<VertexId, number>();
    for (const v of graph.vertices) m.set(v.id, 0);
    for (const e of graph.edges) {
      if (st.used.includes(e.id)) continue;
      m.set(e.u, m.get(e.u)! + 1);
      m.set(e.v, m.get(e.v)! + 1);
    }
    return m;
  }, [graph, st.used]);
  const stuck = st.status === "stuck";
  const evidence = new Set(claim?.vertices ?? []);

  const badgeOf = (id: VertexId): Pick<VertexView, "badge" | "badgeTone"> => {
    if (level.show === "degree") return { badge: deg.get(id), badgeTone: "degree" };
    if (level.show === "inout") {
      const x = io.get(id)!;
      return { badge: `${x.in}/${x.out}`, badgeTone: "degree" };
    }
    return {};
  };

  const vertex = (id: VertexId): VertexView => {
    const isPen = !claim && pen === id;
    const complete = deg.get(id)! > 0 && remaining.get(id) === 0;
    const isStart = !claim && st.path.length > 0 && st.path[0] === id && !isPen;
    const parts = [`bậc ${deg.get(id)}`];
    if (graph.directed) parts[0] = `bán bậc vào ${io.get(id)!.in}, ra ${io.get(id)!.out}`;
    if (isPen) parts.push("bút đang ở đây");
    if (complete) parts.push("đã vẽ hết cạnh");
    if (evidence.has(id)) parts.push("đã chọn làm bằng chứng");
    return {
      state: isPen ? "current" : complete ? "done" : "idle",
      pulse: isPen && playing && !stuck,
      ring: evidence.has(id) ? "evidence" : hintSet.has(id) ? "hint" : isStart ? "start" : undefined,
      ...badgeOf(id),
      pop: fx.pops[id],
      shake: fx.shakes[id],
      ariaLabel: `Đỉnh ${id}, ${parts.join(", ")}`,
    };
  };

  const edge = (e: Edge): EdgeView => {
    const used = st.used.includes(e.id);
    return {
      state: used ? "drawn" : stuck ? "hint" : "idle",
      label: null,
      draw: fx.draws[e.id]?.n,
      drawFrom: fx.draws[e.id]?.from,
    };
  };

  const stars = oneStrokeOutcome({ mistakes: st.mistakes, hints: session.hints }).stars;
  const canMove = pen ? movesFrom(graph, st.used, pen).length > 0 : true;

  const sub = !st.path.length
    ? "Chạm một đỉnh để đặt bút."
    : stuck
      ? "Hoàn tác để lùi một bước, hoặc Làm lại từ đầu."
      : canMove
        ? `Bút đang ở ${pen}. Chạm đỉnh kề để vẽ tiếp, hoặc kéo bút qua các đỉnh.`
        : "";

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
          label={`Hình gồm ${graph.vertices.length} đỉnh và ${E} cạnh${graph.directed ? " có hướng" : ""}. Vẽ hết mọi cạnh bằng một nét.`}
          vertex={vertex}
          edge={edge}
          onVertex={tap}
          drag={!claim}
          allowTranspose={false}
          shake={shake}
          under={level.decor === "river" ? River : undefined}
        />
      }
      prompt={
        <>
          {claim ? (
            <ClaimPanel
              graph={graph}
              claim={claim}
              onToggleDisconnected={() => {
                g.play("toggle");
                setClaim((c) => c && { disconnected: !c.disconnected, vertices: [] });
              }}
            />
          ) : (
            <Question kicker="Nhiệm vụ" sub={sub}>
              Vẽ hết {E} cạnh bằng một nét
            </Question>
          )}
          <StrokeMeter used={st.used.length} total={E} mistakes={st.mistakes} path={claim ? [] : st.path} />
          {level.show === "inout" && (
            <p className="lg-osnote lg-osnote--legend">Số trên mỗi đỉnh: bán bậc vào / bán bậc ra.</p>
          )}
          {level.show === "degree" && <p className="lg-osnote lg-osnote--legend">Số trên mỗi đỉnh là bậc của đỉnh.</p>}
          {note && (
            <p className="lg-osnote" role="status">
              {note}
            </p>
          )}
          <FeedbackCard fb={fb} />
          {hint && <HintCard hint={hint} canMore={session.canHint(HINT_KEY)} onMore={onHint} />}
        </>
      }
      footer={
        claim
          ? {
              left: (
                <button type="button" className="lg-btn lg-btn--ghost" onClick={() => setClaim(null)}>
                  Hủy
                </button>
              ),
              right: (
                <button
                  type="button"
                  className="lg-btn lg-btn--primary"
                  onClick={submitClaim}
                  disabled={!playing || (!claim.disconnected && claim.vertices.length === 0)}
                >
                  Xác nhận bất khả
                </button>
              ),
            }
          : {
              left: (
                <>
                  <button
                    type="button"
                    className="lg-btn lg-btn--ghost lg-btn--sm"
                    onClick={undo}
                    disabled={!playing || !st.path.length}
                  >
                    <Undo2 size={18} aria-hidden="true" /> Hoàn tác
                  </button>
                  <button
                    type="button"
                    className="lg-btn lg-btn--ghost lg-btn--sm"
                    onClick={reset}
                    disabled={!playing || !st.path.length}
                  >
                    <RotateCcw size={18} aria-hidden="true" /> Làm lại
                  </button>
                </>
              ),
              right: (
                <button type="button" className="lg-btn" onClick={openClaim} disabled={!playing}>
                  <Ban size={18} aria-hidden="true" /> Bất khả
                </button>
              ),
            }
      }
      live={fb.kind === "bad" ? `${fb.title ?? "Chưa đúng"}. ${fb.text}` : fb.kind === "ok" ? `${fb.title ?? ""} ${fb.text ?? ""}` : note}
    >
      <SessionOverlays
        session={session}
        onRestart={onRestart}
        summary={`${st.mistakes} lỗi · ${session.hints} gợi ý · ${fmtTime(session.elapsedMs())}`}
        why={() => oneStrokeWhy(level, graph, an, st)}
      />
    </PlayShell>
  );
}

function StrokeMeter(props: { used: number; total: number; mistakes: number; path: VertexId[] }) {
  const pct = Math.round((100 * props.used) / Math.max(1, props.total));
  return (
    <div className="lg-dv">
      <div className="lg-stroke">
        <span className="lg-dv__label">
          Đã vẽ{" "}
          <span className="lg-mono">
            {props.used}/{props.total}
          </span>{" "}
          cạnh
        </span>
        <span className={`lg-chip lg-stroke__mistakes${props.mistakes ? " lg-chip--accent" : ""}`}>{props.mistakes} lỗi</span>
      </div>
      <div
        className="lg-stroke__bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={props.total}
        aria-valuenow={props.used}
        aria-label="Số cạnh đã vẽ"
      >
        <span style={{ width: `${pct}%` }} />
      </div>
      {props.path.length > 1 && (
        <p className="lg-stroke__path lg-mono" aria-label={`Nét vẽ: ${props.path.join(", ")}`}>
          {props.path.join(" → ")}
        </p>
      )}
    </div>
  );
}

function ClaimPanel(props: { graph: Graph; claim: Claim; onToggleDisconnected: () => void }) {
  const { claim, graph } = props;
  return (
    <div className="lg-claim">
      <Question
        kicker="Chứng minh bất khả"
        sub={
          graph.directed
            ? "Chạm chọn mọi đỉnh có bán bậc vào khác bán bậc ra, hoặc chọn “Đồ thị không liên thông”."
            : "Chạm chọn mọi đỉnh bậc lẻ trên hình, hoặc chọn “Đồ thị không liên thông”."
        }
      >
        Vì sao hình này không vẽ được một nét?
      </Question>
      <p className="lg-claim__picked">
        {claim.disconnected ? (
          "Bằng chứng: các cạnh không nối liền nhau."
        ) : claim.vertices.length ? (
          <>
            Đã chọn:{" "}
            {claim.vertices.map((v) => (
              <span key={v} className="lg-vchip lg-claim__chip">
                {v}
              </span>
            ))}
          </>
        ) : (
          "Chưa chọn đỉnh nào."
        )}
      </p>
      <button
        type="button"
        className="lg-btn lg-btn--sm lg-claim__toggle"
        aria-pressed={claim.disconnected}
        onClick={props.onToggleDisconnected}
      >
        <Unlink size={18} aria-hidden="true" /> Đồ thị không liên thông
      </button>
    </div>
  );
}

function oneStrokeHint(g: Graph, an: EulerAnalysis, lvl: 1 | 2): Hint {
  if (!g.directed) {
    if (lvl === 1) return { text: "Đếm số cạnh tại mỗi đỉnh. Có bao nhiêu đỉnh có số cạnh lẻ?" };
    if (an.kind === "path")
      return {
        text: "Có đúng 2 đỉnh bậc lẻ. Nét vẽ phải bắt đầu ở một đỉnh lẻ và kết thúc ở đỉnh lẻ còn lại. Một điểm xuất phát hợp lệ đang được tô sáng.",
        highlight: [an.starts[0]],
      };
    if (an.kind === "circuit")
      return {
        text: "Mọi đỉnh đều bậc chẵn: bắt đầu ở đâu cũng được và sẽ quay về đúng chỗ cũ. Tránh đi qua cạnh cuối cùng nối sang phần chưa vẽ khi còn đường khác.",
        highlight: [an.starts[0]],
      };
    if (!an.connected && an.odd.length === 0)
      return { text: "Mọi đỉnh đều bậc chẵn. Nhưng bút có đi được từ phần hình này sang phần kia mà không nhấc lên không?" };
    return {
      text: "Mỗi lần đi qua một đỉnh, nét vẽ dùng 2 cạnh: 1 vào, 1 ra. Chỉ điểm đầu và điểm cuối mới dùng lẻ cạnh. Vậy hình có thể có nhiều nhất bao nhiêu đỉnh bậc lẻ?",
    };
  }
  if (lvl === 1) return { text: "Ở mỗi đỉnh, so số cung đi vào với số cung đi ra." };
  if (an.kind === "path")
    return {
      text: "Đỉnh có số cung ra nhiều hơn số cung vào đúng 1 là nơi phải đặt bút. Đỉnh đó đang được tô sáng.",
      highlight: [an.starts[0]],
    };
  if (an.kind === "circuit")
    return { text: "Mọi đỉnh có vào = ra: bắt đầu ở đâu cũng được và sẽ kết thúc ở chính đỉnh đó.", highlight: [an.starts[0]] };
  if (!an.connected && an.unbalanced.length === 0)
    return { text: "Mọi đỉnh đều cân bằng vào/ra. Nhưng các cung có nối liền thành một khối không?" };
  return {
    text: "Nét vẽ có hướng chỉ có một điểm đầu (ra hơn vào 1) và một điểm cuối (vào hơn ra 1). Có bao nhiêu đỉnh đang lệch vào/ra?",
  };
}

