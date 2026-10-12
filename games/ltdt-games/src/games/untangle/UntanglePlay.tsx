// Gỡ rối (Ch.4 – Đồ thị phẳng). Dời đỉnh cho tới khi hết giao cắt rồi đếm số miền (công thức Euler),
// hoặc chứng minh đồ thị không phẳng bằng chặn số cạnh hay đồ thị con K₅ / K₃,₃.
// Kéo-thả có cách thay thế một chạm (chạm đỉnh rồi chạm chỗ trống) và bàn phím (phím mũi tên). GDD mục 9.

import { Ban, Check, Undo2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useGames } from "../../app/GamesContext";
import { conflictCount, conflicts, type PlanarityProof, type Pt } from "../../core/algorithms/planarity";
import {
  clampToFrame,
  crowdedBy,
  faceCount,
  FRAME,
  initialUntangle,
  untangleStep,
  type UntangleAction,
  type UntangleState,
} from "../../core/games/untangle";
import { makeGraph, type Edge, type VertexId } from "../../core/graph";
import type { UntangleLevel } from "../../core/levels/types";
import { puzzleOutcome } from "../../core/scoring";
import { GraphBoard, type BoardCtx, type EdgeView, type VertexView } from "../../ui/board/GraphBoard";
import { fmtTime } from "../shared/graphUtil";
import { SessionOverlays } from "../shared/Overlays";
import { PlayShell } from "../shared/PlayShell";
import { FeedbackCard, HintCard, Question, type FeedbackState } from "../shared/Prompt";
import { useLevelSession } from "../shared/session";
import { Stepper } from "../shared/Stepper";
import { bumpFx, emptyFx, type Fx, type GameProps } from "../shared/types";
import {
  facesHint,
  facesWrongText,
  KEY_STEP,
  keyTarget,
  PROOF_OPTIONS,
  untangleHint,
  withPositions,
  type ProofKind,
} from "./logic";
import { GROUP_COLORS, untangleWhy } from "./why";

interface ClaimDraft {
  kind: ProofKind | null;
  k5: VertexId[];
  a: VertexId[];
  b: VertexId[];
}

const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

const r2 = (n: number) => Math.round(n * 100) / 100;

export function UntanglePlay({ level, levelId, race, onRestart }: GameProps<UntangleLevel>) {
  const g = useGames();
  const graph = useMemo(() => makeGraph(level.graph), [level]);
  const session = useLevelSession(level, levelId, race);
  const n = graph.vertices.length;
  const m = graph.edges.length;

  const [st, setSt] = useState<UntangleState>(() => initialUntangle(graph));
  const stRef = useRef(st);
  const log = useRef<UntangleAction[]>([]);
  const history = useRef<{ v: VertexId; from: Pt }[]>([]);
  const transposed = useRef(false);
  const [preview, setPreview] = useState<{ v: VertexId; p: Pt } | null>(null);
  const [selected, setSelected] = useState<VertexId | null>(null);
  const [claim, setClaim] = useState<ClaimDraft | null>(null);
  const [proofUsed, setProofUsed] = useState<PlanarityProof | null>(null);
  const [faces, setFaces] = useState(1);
  const [fx, setFx] = useState<Fx>(emptyFx);
  const [fb, setFb] = useState<FeedbackState>({ kind: "none" });
  const [note, setNote] = useState("");
  const [live, setLive] = useState("");
  const [shake, setShake] = useState(0);

  const finished = st.status === "won" || st.status === "proved";
  const playing = session.phase === "play" && !finished;
  const untangled = st.status === "untangled";
  const moving = playing && st.status === "playing" && !claim;

  useEffect(() => {
    if (!finished) return;
    const t = window.setTimeout(
      () => void session.complete((hints) => ({ kind: "untangle", actions: log.current, hints })),
      st.status === "won" ? (g.reducedMotion ? 300 : 1000) : 300,
    );
    return () => window.clearTimeout(t);
    // chỉ một lần khi vừa hoàn thành
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  const dispatch = (a: UntangleAction) => {
    const prev = stRef.current;
    const { state, event } = untangleStep(graph, prev, a);
    if (state !== prev) {
      stRef.current = state;
      setSt(state);
      log.current = [...log.current, a];
    }
    return { state, event };
  };

  const edgeName = (id: string) => {
    const e = graph.edges.find((x) => x.id === id);
    return e ? `${e.u}–${e.v}` : id;
  };

  /** Dời đỉnh v tới p; trả về true nếu đặt được. */
  const moveTo = (v: VertexId, raw: Pt, viaUndo = false): boolean => {
    const prev = stRef.current;
    if (session.phase !== "play" || prev.status !== "playing") return false;
    const from = prev.pos[v];
    const p = clampToFrame(raw.x, raw.y);
    setPreview(null);
    if (p.x === from.x && p.y === from.y) return false;
    const before = conflictCount(conflicts(graph, prev.pos));
    const { state, event } = dispatch({ t: "move", v, x: p.x, y: p.y });
    switch (event.kind) {
      case "invalid": {
        if (event.reason !== "too-close") return false;
        g.play("invalid");
        setFx((f) => bumpFx(f, { shakes: [v] }));
        const msg = `Không đặt ${v} sát đỉnh ${event.near} được. Chọn chỗ trống hơn.`;
        setNote(msg);
        setLive(msg);
        return false;
      }
      case "moved": {
        if (viaUndo) history.current.pop();
        else history.current.push({ v, from });
        const c = event.conflicts;
        if (viaUndo) g.play("undo");
        else g.play(c < before ? "pave" : c > before ? "unpave" : "tap");
        setFx((f) => bumpFx(f, { pops: [v] }));
        const touch = conflicts(graph, state.pos).touches[0];
        setNote(touch ? `Đỉnh ${touch.v} đang nằm sát cạnh ${edgeName(touch.edge)}: dời ra xa một chút.` : "");
        setFb({ kind: "none" });
        setLive(
          `${viaUndo ? "Hoàn tác" : `Đã dời đỉnh ${v}`}. Còn ${c} giao cắt${c < before ? ", ít hơn trước" : c > before ? ", nhiều hơn trước" : ""}.`,
        );
        return true;
      }
      case "untangled":
        history.current.push({ v, from });
        g.play("correct");
        setFx((f) => bumpFx(f, { pops: graph.vertices.map((x) => x.id) }));
        setNote("");
        setSelected(null);
        setFb({
          kind: "ok",
          title: "Hết giao cắt!",
          text: "Đồ thị này phẳng. Câu hỏi cuối: hình vừa vẽ chia mặt phẳng thành bao nhiêu miền?",
        });
        setLive("Hết giao cắt. Đồ thị phẳng. Trả lời số miền của hình vừa vẽ.");
        return true;
      default:
        return false;
    }
  };

  const undo = () => {
    const last = history.current[history.current.length - 1];
    if (!moving || !last) return;
    moveTo(last.v, last.from, true);
  };

  const tapVertex = (v: VertexId) => {
    if (!playing) return;
    if (claim) return toggleEvidence(v);
    if (st.status !== "playing") return;
    g.play("tap");
    setFx((f) => bumpFx(f, { pops: [v] }));
    if (selected === v) {
      setSelected(null);
      setLive(`Bỏ chọn đỉnh ${v}.`);
    } else {
      setSelected(v);
      setLive(`Đã chọn đỉnh ${v}. Chạm chỗ trống để đặt, hoặc dùng phím mũi tên.`);
    }
  };

  const tapBoard = (p: Pt) => {
    if (!selected) return;
    if (moveTo(selected, p)) setSelected(null);
  };

  const onKey = (id: VertexId, e: KeyboardEvent) => {
    const dir = ARROWS[e.key];
    if (!dir || !moving) return;
    e.preventDefault();
    let [dx, dy] = dir;
    if (transposed.current) [dx, dy] = [dy, dx];
    const t = keyTarget(stRef.current.pos, id, dx, dy, e.shiftKey ? KEY_STEP * 3 : KEY_STEP);
    if (!t) {
      g.play("invalid");
      setNote(`Không dời ${id} thêm được theo hướng này.`);
      setLive(`Không dời ${id} thêm được theo hướng này.`);
      return;
    }
    moveTo(id, t);
  };

  // ----- chứng minh không phẳng -----
  const openClaim = () => {
    if (!moving) return;
    g.play("open");
    setSelected(null);
    setNote("");
    setFb({ kind: "none" });
    setClaim({ kind: null, k5: [], a: [], b: [] });
  };

  const toggleEvidence = (v: VertexId) => {
    if (!claim) return;
    if (claim.kind === "k5") {
      if (claim.k5.includes(v)) {
        g.play("toggle");
        setClaim({ ...claim, k5: claim.k5.filter((x) => x !== v) });
      } else if (claim.k5.length >= 5) {
        g.play("invalid");
        setNote("Đã đủ 5 đỉnh. Chạm một đỉnh đã chọn để bỏ.");
      } else {
        g.play("toggle");
        setNote("");
        setClaim({ ...claim, k5: [...claim.k5, v] });
      }
      return;
    }
    if (claim.kind === "k33") {
      const a = claim.a.filter((x) => x !== v);
      const b = claim.b.filter((x) => x !== v);
      // chưa chọn → nhóm 1 → nhóm 2 → bỏ; nhóm đã đủ 3 thì bỏ qua nhóm đó
      let next: 0 | 1 | 2 = claim.a.includes(v) ? 2 : claim.b.includes(v) ? 0 : 1;
      if (next === 1 && a.length >= 3) next = 2;
      if (next === 2 && b.length >= 3) next = 0;
      if (next === 1) a.push(v);
      if (next === 2) b.push(v);
      g.play(next === 0 && !claim.a.includes(v) && !claim.b.includes(v) ? "invalid" : "toggle");
      setNote(
        next === 0 && !claim.a.includes(v) && !claim.b.includes(v)
          ? "Hai nhóm đã đủ 3 đỉnh. Chạm một đỉnh đã chọn để đổi nhóm hoặc bỏ."
          : "",
      );
      setClaim({ ...claim, a, b });
      return;
    }
    g.play("invalid");
    setNote(claim.kind ? "Lý do này không cần chọn đỉnh." : "Chọn một lý do trước.");
  };

  const draftProof = (c: ClaimDraft | null): PlanarityProof | null => {
    if (!c?.kind) return null;
    if (c.kind === "k5") return c.k5.length === 5 ? { kind: "k5", vertices: c.k5 } : null;
    if (c.kind === "k33") return c.a.length === 3 && c.b.length === 3 ? { kind: "k33", a: c.a, b: c.b } : null;
    return { kind: c.kind };
  };
  const proof = draftProof(claim);

  const submitClaim = () => {
    if (!proof || !playing) return;
    const { event } = dispatch({ t: "claim", proof });
    if (event.kind === "claim-ok") {
      g.play("correct");
      setProofUsed(proof);
      setFb({ kind: "ok", title: "Chứng minh đúng!", text: "Đồ thị này không phẳng: không ai gỡ hết giao cắt được." });
      setLive("Chứng minh đúng. Đồ thị không phẳng.");
      setClaim(null);
    } else if (event.kind === "claim-wrong") {
      g.play("wrong");
      setShake((x) => x + 1);
      setFb({ kind: "bad", title: "Chưa đúng", text: event.reason });
    }
  };

  // ----- đếm miền -----
  const answerFaces = () => {
    if (!playing || !untangled) return;
    const { event } = dispatch({ t: "faces", n: faces });
    if (event.kind === "faces-ok") {
      g.play("correct");
      setFb({ kind: "ok", title: `Đúng: ${faces} miền.`, text: `${n} − ${m} + ${faces} = 2, đúng công thức Euler.` });
      setLive(`Đúng, ${faces} miền.`);
    } else if (event.kind === "faces-wrong") {
      g.play("wrong");
      setShake((x) => x + 1);
      setFb({ kind: "bad", title: "Chưa đúng", text: facesWrongText(graph, event.answer) });
    }
  };

  // ----- gợi ý -----
  const hintKey = untangled ? "faces" : "play";
  const hint = session.hintFor(hintKey);
  const shownPos = useMemo(() => (preview ? { ...st.pos, [preview.v]: preview.p } : st.pos), [st.pos, preview]);
  const cf = useMemo(() => conflicts(graph, shownPos), [graph, shownPos]);
  const count = conflictCount(cf);
  const onHint = () =>
    session.requestHint(
      hintKey,
      (lvl) => (untangled ? facesHint(graph, lvl) : untangleHint(graph, level, lvl)),
      `Gỡ rối (đồ thị phẳng), ${n} đỉnh, ${m} cạnh, còn ${count} giao cắt${untangled ? "; đã gỡ xong, đang đếm số miền" : ""}${claim ? "; đang chọn bằng chứng không phẳng" : ""}`,
    );
  const hintSet = new Set(hint?.highlight ?? []);

  // ----- hiển thị -----
  const shown = useMemo(() => withPositions(graph, shownPos), [graph, shownPos]);
  const badEdges = new Set([...cf.crossings.flatMap((c) => [c.e1, c.e2]), ...cf.touches.map((t) => t.edge)]);
  const touchV = new Set(cf.touches.map((t) => t.v));
  const crowd = preview ? crowdedBy(st.pos, preview.v, preview.p.x, preview.p.y) : null;
  const groupOf = (id: VertexId): 0 | 1 | 2 =>
    claim?.kind === "k33" ? (claim.a.includes(id) ? 1 : claim.b.includes(id) ? 2 : 0) : 0;
  const inK5 = (id: VertexId) => claim?.kind === "k5" && claim.k5.includes(id);

  const vertex = (id: VertexId): VertexView => {
    const sel = selected === id;
    const drag = preview?.v === id;
    const grp = groupOf(id);
    const parts = [`Đỉnh ${id}`];
    if (sel) parts.push("đang chọn");
    if (grp) parts.push(`nhóm ${grp}`);
    if (inK5(id)) parts.push("đã chọn cho K₅");
    if (touchV.has(id)) parts.push("nằm sát một cạnh khác");
    return {
      state: drag || sel ? "current" : st.status === "won" ? "done" : "idle",
      ring:
        drag && crowd
          ? "error"
          : grp || inK5(id)
            ? "evidence"
            : touchV.has(id)
              ? "error"
              : hintSet.has(id)
                ? "hint"
                : sel
                  ? "select"
                  : undefined,
      badge: grp ? String(grp) : undefined,
      badgeColor: grp ? GROUP_COLORS[grp - 1] : undefined,
      pop: fx.pops[id],
      shake: fx.shakes[id],
      ariaLabel: parts.join(", "),
    };
  };

  const edge = (e: Edge): EdgeView => {
    if (claim) {
      const k33 = (groupOf(e.u) === 1 && groupOf(e.v) === 2) || (groupOf(e.u) === 2 && groupOf(e.v) === 1);
      return { state: k33 || (inK5(e.u) && inK5(e.v)) ? "active" : "idle", label: null };
    }
    if (untangled || st.status === "won") return { state: "result", label: null };
    return { state: badEdges.has(e.id) ? "error" : "idle", label: null };
  };

  const over = (ctx: BoardCtx) => {
    transposed.current = ctx.layout.transposed;
    if (claim || st.status !== "playing") return null;
    return (
      <g className="lg-xmarks" aria-hidden="true">
        {cf.crossings.map((c) => {
          const p = ctx.layout.transposed ? { x: c.at.y, y: c.at.x } : c.at;
          return (
            <g key={`${c.e1}|${c.e2}`} className="lg-xmark" transform={`translate(${r2(p.x)} ${r2(p.y)}) scale(${r2(ctx.px)})`}>
              <circle r={8} />
              <path d="M-3.5 -3.5 L3.5 3.5 M3.5 -3.5 L-3.5 3.5" />
            </g>
          );
        })}
      </g>
    );
  };

  const stars = puzzleOutcome({ mistakes: st.mistakes, hints: session.hints }).stars;
  const sub = selected
    ? `Đã chọn đỉnh ${selected}. Chạm chỗ trống để đặt, phím mũi tên để dời, chạm lại ${selected} để bỏ chọn.`
    : "Kéo một đỉnh tới chỗ mới, hoặc chạm đỉnh rồi chạm chỗ trống.";

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
          graph={shown}
          label={`Đồ thị ${n} đỉnh, ${m} cạnh, còn ${count} giao cắt. Chạm đỉnh để chọn rồi dùng phím mũi tên hoặc chạm chỗ trống để dời.`}
          vertex={vertex}
          edge={edge}
          onVertex={playing && (moving || claim) ? tapVertex : undefined}
          mover={
            moving
              ? {
                  onDrag: (id, p) => setPreview(p ? { v: id, p: clampToFrame(p.x, p.y) } : null),
                  onDrop: (id, p) => {
                    setSelected(null);
                    moveTo(id, p);
                  },
                  onTapBoard: tapBoard,
                }
              : undefined
          }
          onVertexKey={onKey}
          frame={FRAME}
          shake={shake}
          over={over}
        />
      }
      prompt={
        <>
          {claim ? (
            <ProofPanel
              n={n}
              m={m}
              claim={claim}
              onKind={(kind) => {
                g.play("toggle");
                setNote("");
                setFb({ kind: "none" });
                setClaim({ kind, k5: [], a: [], b: [] });
              }}
            />
          ) : untangled || st.status === "won" ? (
            <>
              <Question
                kicker="Công thức Euler"
                sub={`Tính cả miền vô hạn bên ngoài hình. Đồ thị có n = ${n} đỉnh, m = ${m} cạnh.`}
              >
                Hình vừa vẽ chia mặt phẳng thành bao nhiêu miền?
              </Question>
              <Stepper
                label="Số miền f"
                value={faces}
                min={1}
                max={40}
                onChange={setFaces}
                onEnter={answerFaces}
                disabled={!playing}
              />
            </>
          ) : (
            <Question kicker="Nhiệm vụ" sub={sub}>
              Gỡ hết giao cắt
            </Question>
          )}
          <div className="lg-mstats">
            <div className={`lg-mstats__cell${count === 0 ? " lg-mstats__cell--ok" : " lg-mstats__cell--warn"}`}>
              <span className="lg-mstats__label">Giao cắt</span>
              <span className="lg-mstats__value">{count}</span>
            </div>
            <div className="lg-mstats__cell">
              <span className="lg-mstats__label">Đã dời</span>
              <span className="lg-mstats__value">
                {st.moves}
                <span className="lg-mstats__unit"> lần</span>
              </span>
            </div>
            <div className={`lg-mstats__cell${st.mistakes ? " lg-mstats__cell--warn" : ""}`}>
              <span className="lg-mstats__label">Lỗi</span>
              <span className="lg-mstats__value">{st.mistakes}</span>
            </div>
          </div>
          {st.status === "playing" && !claim && (
            <p className="lg-osnote lg-osnote--legend">Dấu × là chỗ hai cạnh cắt nhau; cạnh màu đỏ đang vướng.</p>
          )}
          {note && <p className="lg-osnote">{note}</p>}
          <FeedbackCard fb={fb} />
          {hint && <HintCard hint={hint} canMore={session.canHint(hintKey)} onMore={onHint} />}
        </>
      }
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
              right: (
                <button type="button" className="lg-btn lg-btn--primary" onClick={submitClaim} disabled={!playing || !proof}>
                  Xác nhận không phẳng
                </button>
              ),
            }
          : untangled || st.status === "won"
            ? {
                right: (
                  <button type="button" className="lg-btn lg-btn--primary" onClick={answerFaces} disabled={!playing}>
                    <Check size={18} aria-hidden="true" /> Trả lời
                  </button>
                ),
              }
            : {
                left: (
                  <button
                    type="button"
                    className="lg-btn lg-btn--ghost lg-btn--sm"
                    onClick={undo}
                    disabled={!moving || history.current.length === 0}
                  >
                    <Undo2 size={18} aria-hidden="true" /> Hoàn tác
                  </button>
                ),
                right: (
                  <button type="button" className="lg-btn" onClick={openClaim} disabled={!moving}>
                    <Ban size={18} aria-hidden="true" /> Không phẳng
                  </button>
                ),
              }
      }
      live={fb.kind === "bad" ? `${fb.title ?? "Chưa đúng"}. ${fb.text}` : live}
    >
      <SessionOverlays
        session={session}
        onRestart={onRestart}
        summary={`${st.mistakes} lỗi · ${st.moves} lần dời · ${session.hints} gợi ý · ${fmtTime(session.elapsedMs())}`}
        why={() => untangleWhy(level, graph, st, proofUsed, faceCount(graph))}
      />
    </PlayShell>
  );
}

function ProofPanel(props: { n: number; m: number; claim: ClaimDraft; onKind: (k: ProofKind) => void }) {
  const { claim } = props;
  const opt = PROOF_OPTIONS.find((o) => o.kind === claim.kind);
  const chips = (vs: VertexId[], grp?: 1 | 2) =>
    vs.map((v) => (
      <span
        key={v}
        className="lg-vchip lg-claim__chip"
        style={grp ? { background: GROUP_COLORS[grp - 1].fill, color: GROUP_COLORS[grp - 1].text } : undefined}
      >
        {v}
      </span>
    ));
  return (
    <div className="lg-claim">
      <Question kicker="Chứng minh không phẳng" sub="Chọn một lý do. Lý do sai tính 1 lỗi.">
        Vì sao không ai gỡ được?
      </Question>
      <p className="lg-proof__nm lg-mono">
        n = {props.n} đỉnh · m = {props.m} cạnh
      </p>
      <div className="lg-seg lg-proof" role="radiogroup" aria-label="Lý do đồ thị không phẳng">
        {PROOF_OPTIONS.map((o) => (
          <label key={o.kind} className={`lg-seg__opt${claim.kind === o.kind ? " lg-seg__opt--on" : ""}`}>
            <input
              type="radio"
              name="lg-proof"
              value={o.kind}
              checked={claim.kind === o.kind}
              onChange={() => props.onKind(o.kind)}
            />
            {o.label}
          </label>
        ))}
      </div>
      {opt && <p className="lg-claim__picked">{opt.detail}</p>}
      {claim.kind === "k5" && (
        <p className="lg-claim__picked">
          Đã chọn {claim.k5.length}/5: {claim.k5.length ? chips(claim.k5) : "chưa có đỉnh nào."}
        </p>
      )}
      {claim.kind === "k33" && (
        <>
          <p className="lg-claim__picked">
            Nhóm 1 ({claim.a.length}/3): {claim.a.length ? chips(claim.a, 1) : "trống"}
          </p>
          <p className="lg-claim__picked">
            Nhóm 2 ({claim.b.length}/3): {claim.b.length ? chips(claim.b, 2) : "trống"}
          </p>
        </>
      )}
    </div>
  );
}
