// Dịch ma trận (Ch.1 – Biểu diễn đồ thị). GDD mục 8.

import { CheckCheck, Eraser, Timer } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useGames } from "../../app/GamesContext";
import { adjacencyList, adjacencyMatrix, compareKeys, edgeKey, incidenceMatrix, targetKeys, toggleKey } from "../../core/games/matrixTranslate";
import { makeGraph, type Edge, type VertexId } from "../../core/graph";
import type { MatrixLevel } from "../../core/levels/types";
import { matrixOutcome } from "../../core/scoring";
import { GraphBoard, type EdgeView, type VertexView } from "../../ui/board/GraphBoard";
import { fmtTime } from "../shared/graphUtil";
import { SessionOverlays } from "../shared/Overlays";
import { PlayShell } from "../shared/PlayShell";
import { FeedbackCard, HintCard, Question, type FeedbackState } from "../shared/Prompt";
import { useLevelSession } from "../shared/session";
import { bumpFx, emptyFx, type Fx, type GameProps } from "../shared/types";
import { cellOn, diffText, drawnGraph, edgeWord, keyEnds, keyName, matrixHint } from "./logic";
import { matrixWhy } from "./why";

const HINT_KEY = "level";

interface Check {
  answer: string[];
  elapsedMs: number;
}

const TASK: Record<MatrixLevel["mode"], string> = {
  "adj-to-graph": "Vẽ đồ thị có ma trận kề này",
  "graph-to-adj": "Điền ma trận kề của đồ thị",
  "list-to-graph": "Vẽ đồ thị có danh sách kề này",
  "inc-to-graph": "Vẽ đồ thị có ma trận liên thuộc này",
};

export function MatrixPlay({ level, levelId, race, onRestart }: GameProps<MatrixLevel>) {
  const g = useGames();
  const graph = useMemo(() => makeGraph(level.graph), [level]);
  const session = useLevelSession(level, levelId, race);
  const draw = level.mode !== "graph-to-adj";
  const w = edgeWord(graph);
  const ids = useMemo(() => graph.vertices.map((v) => v.id), [graph]);
  const target = useMemo(() => targetKeys(graph), [graph]);
  const adj = useMemo(() => adjacencyMatrix(graph), [graph]);

  const [keys, setKeys] = useState<string[]>([]);
  /** vẽ: đỉnh chạm trước; điền ma trận: đỉnh đang tô sáng hàng */
  const [sel, setSel] = useState<VertexId | null>(null);
  const [checks, setChecks] = useState<Check[]>([]);
  const [won, setWon] = useState(false);
  const [doneAt, setDoneAt] = useState<number | null>(null);
  const [fx, setFx] = useState<Fx>(emptyFx);
  const [fb, setFb] = useState<FeedbackState>({ kind: "none" });
  const [live, setLive] = useState("");
  const [shake, setShake] = useState(0);
  const [, setTick] = useState(0);

  const playing = session.phase === "play" && !won;
  const shown = useMemo(() => (draw ? drawnGraph(graph, keys) : graph), [draw, graph, keys]);

  // đồng hồ
  useEffect(() => {
    if (!playing) return;
    const t = window.setInterval(() => setTick((x) => x + 1), 1000);
    return () => window.clearInterval(t);
  }, [playing]);

  // Esc bỏ chọn đỉnh đang chờ
  useEffect(() => {
    if (!sel) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSel(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sel]);

  useEffect(() => {
    if (!won) return;
    const t = window.setTimeout(
      () => void session.complete((hints) => ({ kind: "matrix_translate", checks, hints })),
      g.reducedMotion ? 300 : 1100,
    );
    return () => window.clearTimeout(t);
    // chỉ một lần khi vừa kiểm tra đúng
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [won]);

  const elapsed = doneAt ?? (session.phase === "intro" ? 0 : session.elapsedMs());
  const overPar = Math.max(0, Math.round(elapsed / 1000 - level.par));
  const lastCheck = checks[checks.length - 1];
  const unchanged = !!lastCheck && lastCheck.answer.join(" ") === keys.join(" ");

  const toggle = (u: VertexId, v: VertexId) => {
    const key = edgeKey(graph, u, v);
    const adding = !keys.includes(key);
    setKeys(toggleKey(keys, key));
    setFb({ kind: "none" });
    return { key, adding };
  };

  const tapDraw = (v: VertexId) => {
    if (!playing) return;
    if (!sel) {
      g.play("tap");
      setSel(v);
      setFx((f) => bumpFx(f, { pops: [v] }));
      setLive(`Đã chọn ${v}. Chạm đỉnh thứ hai để thêm hoặc bỏ ${w}.`);
      return;
    }
    if (sel === v) {
      g.play("toggle", { rate: 0.85 });
      setSel(null);
      setLive(`Bỏ chọn ${v}.`);
      return;
    }
    const { key, adding } = toggle(sel, v);
    setSel(null);
    if (adding) {
      g.play("draw");
      setFx((f) => bumpFx(f, { pops: [v], draws: [[key, sel]] }));
    } else {
      g.play("undo");
      setFx((f) => bumpFx(f, { pops: [sel, v] }));
    }
    setLive(`${adding ? "Thêm" : "Bỏ"} ${w} ${keyName(key)}.`);
  };

  const tapFocus = (v: VertexId) => {
    if (!playing) return;
    g.play("toggle");
    setSel(sel === v ? null : v);
    setFx((f) => bumpFx(f, { pops: [v] }));
    setLive(sel === v ? "Bỏ tô sáng hàng." : `Tô sáng hàng ${v} của ma trận.`);
  };

  const tapCell = (u: VertexId, v: VertexId) => {
    if (!playing || u === v) return;
    const { adding } = toggle(u, v);
    g.play("toggle", { rate: adding ? 1.1 : 0.85 });
    setFx((f) => bumpFx(f, { pops: [u, v] }));
    setLive(`Hàng ${u}, cột ${v}${graph.directed ? "" : ` và hàng ${v}, cột ${u}`}: ${adding ? 1 : 0}.`);
  };

  const clearAll = () => {
    if (!playing || !keys.length) return;
    g.play("undo", { rate: 0.8 });
    setKeys([]);
    if (draw) setSel(null);
    setFb({ kind: "none" });
    setLive(draw ? "Đã xóa mọi cạnh." : "Đã đưa mọi ô về 0.");
  };

  const check = () => {
    if (!playing || !keys.length || unchanged) return;
    const ms = Math.round(session.elapsedMs());
    const next = [...checks, { answer: keys, elapsedMs: ms }];
    setChecks(next);
    const r = compareKeys(graph, keys);
    if (draw || r.correct) setSel(null);
    if (r.correct) {
      setWon(true);
      setDoneAt(ms);
      g.play("correct");
      const inPar = Math.round(ms / 1000 - level.par) <= 0;
      const text = `Đủ ${target.length} ${w}, sau ${fmtTime(ms)}${inPar ? ", kịp thời gian chuẩn" : ""}.`;
      setFb({ kind: "ok", title: "Khớp hoàn toàn!", text });
      setFx((f) => bumpFx(f, { pops: ids }));
      setLive(`Khớp hoàn toàn. ${text}`);
    } else {
      g.play("wrong");
      setShake((x) => x + 1);
      const text = `${diffText(graph, level.mode, r.missing, r.extra)} Sửa rồi kiểm tra lại.`;
      setFb({ kind: "bad", title: "Chưa khớp", text });
      setLive(`Chưa khớp. ${text}`);
    }
  };

  const hint = session.hintFor(HINT_KEY);
  const hintSet = new Set(hint?.highlight ?? []);
  const hintCells = new Set<string>();
  if (hint?.highlight?.length === 2) {
    const [a, b] = hint.highlight;
    hintCells.add(`${a},${b}`);
    if (!graph.directed) hintCells.add(`${b},${a}`);
  }
  const onHint = () =>
    session.requestHint(
      HINT_KEY,
      (lvl) => matrixHint(level, graph, keys, lvl),
      `Dịch ma trận, chế độ ${level.mode}, ${ids.length} đỉnh${graph.directed ? ", có hướng" : ""}; đáp án hiện tại: ${
        keys.map(keyName).join(", ") || "trống"
      }; đã kiểm tra ${checks.length} lần`,
    );

  // ----- hiển thị -----
  const vertex = (id: VertexId): VertexView => {
    const isSel = sel === id;
    const deg = keys.filter((k) => keyEnds(k).includes(id)).length;
    return {
      state: won ? "done" : undefined,
      ring: hintSet.has(id) ? "hint" : isSel ? (draw ? "pending" : "select") : undefined,
      pop: fx.pops[id],
      ariaLabel: draw
        ? `Đỉnh ${id}${isSel ? ", đã chọn: chạm đỉnh khác để thêm hoặc bỏ " + w : ""}, ${deg} ${w} đã vẽ`
        : `Đỉnh ${id}${isSel ? ", đang tô sáng hàng của nó" : ""}. Chạm để tô sáng hàng ${id} của ma trận`,
    };
  };

  const edge = (e: Edge): EdgeView => {
    if (draw) return { state: won ? "result" : "drawn", label: null, draw: fx.draws[e.id]?.n, drawFrom: fx.draws[e.id]?.from };
    const atSel = !!sel && (e.u === sel || e.v === sel);
    return { state: won ? "result" : atSel ? "active" : "idle", label: null };
  };

  const stars = matrixOutcome({
    checks: won ? checks.length : checks.length + 1,
    overParSeconds: overPar,
    hints: session.hints,
  }).stars;

  let sub: string;
  if (won) sub = "Đã khớp hoàn toàn.";
  else if (draw) sub = sel ? `Đã chọn ${sel}. Chạm đỉnh thứ hai để thêm hoặc bỏ ${w}; chạm lại ${sel} để bỏ chọn.` : `Chạm hai đỉnh để thêm hoặc bỏ ${w} nối chúng.`;
  else sub = "Chạm ô để đổi 0 ↔ 1. Chạm một đỉnh trên đồ thị để tô sáng hàng của nó.";

  const legend: Record<MatrixLevel["mode"], string> = {
    "adj-to-graph": graph.directed
      ? "Hàng i, cột j bằng 1 ⇔ có cung i → j (hàng là đỉnh đầu, cột là đỉnh cuối)."
      : "Hàng i, cột j bằng 1 ⇔ có cạnh nối i và j.",
    "graph-to-adj": graph.directed ? "Ô hàng i, cột j: có cung i → j thì 1." : "Đồ thị vô hướng: ô đối xứng tự đổi theo.",
    "list-to-graph": "Dòng “i: …” liệt kê các đỉnh kề với i.",
    "inc-to-graph": "Hàng là đỉnh, cột e1, e2, … là cạnh: mỗi cột có hai số 1 ở hai đầu cạnh.",
  };

  return (
    <PlayShell
      level={level}
      race={race}
      stars={stars}
      starsLabel={`Tối đa ${stars} sao nếu lần kiểm tra ${checks.length + 1} đúng${overPar ? " (đã quá thời gian chuẩn)" : ""}`}
      canHint={session.canHint(HINT_KEY) && playing}
      onHint={onHint}
      // điền ma trận: ô 44 px nằm trong panel, bàn chơi chỉ để đối chiếu
      tallSheet={level.mode === "graph-to-adj"}
      boardTop={
        <span
          className={`lg-chip lg-timer${overPar > 0 ? " lg-chip--accent" : ""}`}
          aria-label={`Thời gian ${fmtTime(elapsed)}, chuẩn ${fmtTime(level.par * 1000)}`}
        >
          <Timer size={15} aria-hidden="true" />
          <span className="lg-mono">{fmtTime(elapsed)}</span>
          <span aria-hidden="true">/ {fmtTime(level.par * 1000)}</span>
        </span>
      }
      board={
        <GraphBoard
          graph={shown}
          label={
            draw
              ? `${ids.length} đỉnh trên vòng tròn, đã vẽ ${keys.length} ${w}. Chạm hai đỉnh để thêm hoặc bỏ ${w}.`
              : `Đồ thị ${ids.length} đỉnh, ${graph.edges.length} ${w}. Chạm đỉnh để tô sáng hàng của nó trong ma trận.`
          }
          vertex={vertex}
          edge={edge}
          onVertex={playing ? (draw ? tapDraw : tapFocus) : undefined}
          allowTranspose={false}
          shake={shake}
        />
      }
      prompt={
        <>
          <Question kicker="Nhiệm vụ" sub={sub}>
            {TASK[level.mode]}
          </Question>
          <FeedbackCard fb={fb} />
          {hint && <HintCard hint={hint} canMore={session.canHint(HINT_KEY)} onMore={onHint} />}
          <div className="lg-dv">
            {level.mode === "adj-to-graph" && (
              <AdjTable
                ids={ids}
                cell={(u, v) => adj[ids.indexOf(u)][ids.indexOf(v)] === 1}
                hiRow={sel}
                label={`Ma trận kề ${ids.length} × ${ids.length}${graph.directed ? " của đồ thị có hướng" : ""}`}
              />
            )}
            {level.mode === "graph-to-adj" && (
              <AdjTable
                ids={ids}
                cell={(u, v) => cellOn(graph, keys, u, v)}
                hiRow={sel}
                hint={hintCells}
                onCell={playing ? tapCell : undefined}
                label="Ma trận kề bạn đang điền"
              />
            )}
            {level.mode === "list-to-graph" && <ListView ids={ids} list={adjacencyList(graph)} hi={sel} />}
            {level.mode === "inc-to-graph" && <IncTable ids={ids} m={incidenceMatrix(graph)} hiRow={sel} />}
            <p className="lg-osnote lg-osnote--legend">{legend[level.mode]}</p>
          </div>
          <div className="lg-mstats">
            <div className="lg-mstats__cell">
              <span className="lg-mstats__label">{draw ? "Đã vẽ" : "Số ô bằng 1"}</span>
              <span className="lg-mstats__value">
                {draw ? keys.length : keys.length * (graph.directed ? 1 : 2)}
                {draw && <span className="lg-mstats__unit"> {w}</span>}
              </span>
            </div>
            <div className="lg-mstats__cell">
              <span className="lg-mstats__label">Kiểm tra</span>
              <span className="lg-mstats__value">{checks.length}</span>
            </div>
            <div className={`lg-mstats__cell${overPar > 0 ? " lg-mstats__cell--warn" : ""}`}>
              <span className="lg-mstats__label">Chuẩn</span>
              <span className="lg-mstats__value">{fmtTime(level.par * 1000)}</span>
            </div>
          </div>
        </>
      }
      footer={{
        left: (
          <button type="button" className="lg-btn lg-btn--ghost lg-btn--sm" onClick={clearAll} disabled={!playing || !keys.length}>
            <Eraser size={18} aria-hidden="true" /> {draw ? "Xóa hết" : "Về 0 hết"}
          </button>
        ),
        right: (
          <button
            type="button"
            className="lg-btn lg-btn--primary"
            onClick={check}
            disabled={!playing || !keys.length || unchanged}
            title={unchanged && playing ? "Sửa bài trước khi kiểm tra lại" : undefined}
          >
            <CheckCheck size={18} aria-hidden="true" /> Kiểm tra
          </button>
        ),
      }}
      live={live}
    >
      <SessionOverlays
        session={session}
        onRestart={onRestart}
        summary={`${checks.length} lần kiểm tra · ${session.hints} gợi ý · ${fmtTime(elapsed)} (chuẩn ${fmtTime(level.par * 1000)})`}
        why={() => matrixWhy(level, graph)}
      />
    </PlayShell>
  );
}

function AdjTable(props: {
  ids: VertexId[];
  cell: (u: VertexId, v: VertexId) => boolean;
  hiRow: VertexId | null;
  hint?: Set<string>;
  onCell?: (u: VertexId, v: VertexId) => void;
  label: string;
}) {
  const { ids } = props;
  return (
    <div className="lg-mx-wrap">
      <table className={`lg-mx${props.onCell ? " lg-mx--edit" : ""}`} aria-label={props.label}>
        <thead>
          <tr>
            <th scope="col" className="lg-mx__corner">
              <span className="lg-sr-only">Hàng, cột</span>
            </th>
            {ids.map((v) => (
              <th key={v} scope="col">
                {v}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ids.map((u) => (
            <tr key={u} className={props.hiRow === u ? "lg-mx__row--hi" : undefined}>
              <th scope="row">{u}</th>
              {ids.map((v) => {
                const on = props.cell(u, v);
                const diag = u === v;
                const cls = [
                  "lg-mx__cell",
                  on ? "lg-mx__cell--on" : "",
                  diag ? "lg-mx__cell--diag" : "",
                  props.hint?.has(`${u},${v}`) ? "lg-mx__cell--hint" : "",
                ]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <td key={v} className={cls}>
                    {props.onCell && !diag ? (
                      <button
                        type="button"
                        className="lg-mx__btn"
                        aria-pressed={on}
                        aria-label={`Hàng ${u}, cột ${v}: ${on ? 1 : 0}`}
                        onClick={() => props.onCell!(u, v)}
                      >
                        {on ? 1 : 0}
                      </button>
                    ) : on ? (
                      1
                    ) : (
                      0
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ListView({ ids, list, hi }: { ids: VertexId[]; list: Record<VertexId, VertexId[]>; hi: VertexId | null }) {
  return (
    <ul className="lg-alist" aria-label="Danh sách kề">
      {ids.map((v) => (
        <li key={v} className={`lg-alist__row${hi === v ? " lg-alist__row--hi" : ""}`}>
          <span className="lg-alist__v">
            {v}
            <span className="lg-alist__sep" aria-hidden="true">
              :
            </span>
          </span>
          <span className="lg-sr-only">kề</span>
          <span className="lg-alist__items lg-mono">{list[v].length ? list[v].join(", ") : "∅"}</span>
        </li>
      ))}
    </ul>
  );
}

function IncTable({ ids, m, hiRow }: { ids: VertexId[]; m: number[][]; hiRow: VertexId | null }) {
  const cols = m[0]?.length ?? 0;
  return (
    <div className="lg-mx-wrap">
      <table className="lg-mx" aria-label="Ma trận liên thuộc: hàng là đỉnh, cột là cạnh">
        <thead>
          <tr>
            <th scope="col" className="lg-mx__corner">
              <span className="lg-sr-only">Đỉnh, cạnh</span>
            </th>
            {Array.from({ length: cols }, (_, j) => (
              <th key={j} scope="col" className="lg-mx__ecol">
                e{j + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ids.map((u, i) => (
            <tr key={u} className={hiRow === u ? "lg-mx__row--hi" : undefined}>
              <th scope="row">{u}</th>
              {m[i].map((x, j) => (
                <td key={j} className={`lg-mx__cell${x ? " lg-mx__cell--on" : ""}`}>
                  {x}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
