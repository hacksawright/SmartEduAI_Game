// Thẻ giới thiệu, xác nhận gợi ý, kết quả (kèm thẻ "Vì sao?") và hết mạng.

import { ArrowRight, Award, BookOpen, Bot, HeartCrack, Lightbulb, List, Play, RotateCcw, Sparkles, Star } from "lucide-react";
import { useEffect, useId, useState, type ReactNode } from "react";
import { useGames } from "../../app/GamesContext";
import { chapterOf, getGame, nextLevel, RACE_SUFFIX } from "../../core/registry";
import { badgeTitle } from "../../services/badges";
import { bestStars } from "../../services/progress";
import { Modal } from "../../ui/components/Modal";
import { StarsSmall } from "../../ui/components/Meters";
import { howTo } from "./howto";
import { levelShortLabel, trackOf } from "./labels";
import type { LevelSession } from "./session";

export interface WhyContent {
  /** một câu kết luận */
  title: string;
  /** 3–5 dòng giải thích */
  lines: string[];
  /** trích chương/mục giáo trình */
  cite: string;
  figure?: ReactNode;
  caption?: string;
}

export function SessionOverlays(props: {
  session: LevelSession;
  why: () => WhyContent;
  /** dòng tóm tắt dưới điểm, ví dụ "1 lỗi · 0 gợi ý" */
  summary?: string;
  /** thông tin thêm cho thẻ giới thiệu (ví dụ chế độ đua) */
  introExtra?: ReactNode;
  /** nút thêm trên thẻ kết quả (ví dụ "Xem Kruskal & Prim") */
  resultExtra?: ReactNode;
  /** tạm ẩn thẻ kết quả (đang xem phát lại trên bàn chơi) */
  hideResult?: boolean;
  onRestart: () => void;
}) {
  const { session } = props;
  return (
    <>
      {session.phase === "intro" && <IntroCard session={session} extra={props.introExtra} />}
      <HintConfirm session={session} />
      {session.phase === "won" && session.result && !props.hideResult && (
        <ResultCard
          session={session}
          why={props.why()}
          summary={props.summary}
          extra={props.resultExtra}
          onRestart={props.onRestart}
        />
      )}
      {session.phase === "failed" && <FailCard session={session} onRestart={props.onRestart} />}
    </>
  );
}

function IntroCard({ session, extra }: { session: LevelSession; extra?: ReactNode }) {
  const g = useGames();
  const { level } = session;
  const id = useId();
  const game = getGame(level.game);
  const best = bestStars(g.progress, session.levelId);
  const showHow = level.n === 1 || !g.progress.seenTutorial[level.game];
  const track = trackOf(level);
  return (
    <Modal open labelledBy={id} variant="sheet" className="lg-intro">
      <p className="lg-intro__crumb">
        <span className="lg-chip">Chương {chapterOf(level.chapter).n}</span>
        <span>
          {game.title}
          {game.tracks.length > 1 ? ` · ${track.title}` : ""} · {levelShortLabel(level)}
        </span>
      </p>
      <h2 id={id} className="lg-intro__title">
        {level.title}
      </h2>
      <p className="lg-intro__goal">{level.intro}</p>
      {level.tip && (
        <p className="lg-intro__tip">
          <Sparkles size={18} aria-hidden="true" />
          <span>
            <strong>Điều mới:</strong> {level.tip}
          </span>
        </p>
      )}
      {session.race && extra}
      {showHow && (
        <div className="lg-intro__how">
          <p className="lg-intro__how-title">Cách chơi</p>
          <ol>
            {howTo(level).map((s, i) => (
              <li key={i}>
                <span className="lg-intro__num lg-mono" aria-hidden="true">
                  {i + 1}
                </span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
      {best > 0 && (
        <p className="lg-intro__best">
          Kỷ lục của bạn: <StarsSmall stars={best} />
        </p>
      )}
      <div className="lg-intro__actions">
        <button type="button" className="lg-btn lg-btn--primary" onClick={session.begin} data-autofocus>
          <Play size={20} aria-hidden="true" fill="currentColor" /> Bắt đầu
        </button>
        <button type="button" className="lg-btn lg-btn--ghost" onClick={() => g.navigate({ name: "game", gameId: level.game })}>
          Quay lại
        </button>
      </div>
    </Modal>
  );
}

function HintConfirm({ session }: { session: LevelSession }) {
  const id = useId();
  const desc = useId();
  return (
    <Modal open={session.confirmOpen} labelledBy={id} describedBy={desc} onClose={session.cancelHint} className="lg-confirm">
      <div className="lg-confirm__icon" aria-hidden="true">
        <Lightbulb size={28} />
      </div>
      <h2 id={id}>Dùng gợi ý?</h2>
      <p id={desc}>
        Mỗi lần dùng gợi ý trừ 1 sao của màn này (luôn còn ít nhất 1 sao). Gợi ý là câu hỏi dẫn dắt, không đưa sẵn đáp án.
      </p>
      <div className="lg-confirm__actions">
        <button type="button" className="lg-btn lg-btn--teal" onClick={session.confirmHint}>
          Dùng gợi ý (−1 sao)
        </button>
        <button type="button" className="lg-btn" onClick={session.cancelHint} data-autofocus>
          Để tôi tự nghĩ
        </button>
      </div>
    </Modal>
  );
}

const HEADLINES = ["", "Hoàn thành!", "Làm tốt lắm!", "Xuất sắc!"];

function ResultCard(props: {
  session: LevelSession;
  why: WhyContent;
  summary?: string;
  extra?: ReactNode;
  onRestart: () => void;
}) {
  const g = useGames();
  const { session } = props;
  const r = session.result!;
  const id = useId();
  const level = session.level;
  const next = nextLevel(level);
  const { play, reducedMotion } = g;

  useEffect(() => {
    const ids = Array.from({ length: r.stars }, (_, i) =>
      window.setTimeout(() => play("star", { rate: 1 + 0.12 * i }), reducedMotion ? 0 : 450 + i * 280),
    );
    return () => ids.forEach((x) => window.clearTimeout(x));
  }, [r.stars, play, reducedMotion]);

  const goHub = () => g.navigate({ name: "game", gameId: level.game });
  const goNext = () => {
    if (!next) return goHub();
    const raceNext = session.race && bestStars(g.progress, next.id) >= 1;
    g.navigate({ name: "play", levelId: raceNext ? next.id + RACE_SUFFIX : next.id });
  };

  const pts = r.points;
  let note = "";
  if (pts?.status === "credited") note = `+${pts.credited} điểm thưởng${pts.total != null ? ` · tổng ${pts.total} điểm` : ""}`;
  else if (pts?.status === "no_improvement" || pts?.status === "duplicate")
    note = "Không cộng thêm điểm: điểm thưởng chỉ cộng khi số sao cao hơn kỷ lục của màn.";
  else if (pts?.status === "queued") note = "Chưa gửi được điểm vì mất kết nối. Hệ thống sẽ tự gửi lại.";
  else if (pts?.status === "rejected") note = `Máy chủ chưa ghi nhận điểm: ${pts.reason ?? "bài làm không hợp lệ"}.`;

  const newRecord = r.stars > r.prevBest && r.prevBest > 0;

  return (
    <Modal open labelledBy={id} variant="sheet" className="lg-result">
      <div className="lg-result__head lg-clay">
        <p className="lg-result__crumb">
          {levelShortLabel(level)} · {level.title}
        </p>
        <h2 id={id} className="lg-result__title">
          {session.race ? "Bạn thắng máy!" : HEADLINES[r.stars]}
        </h2>
        <div className="lg-result__stars" role="img" aria-label={`${r.stars} trên 3 sao`}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={`lg-result__star ${i < r.stars ? "lg-result__star--on" : "lg-result__star--off"}`}
              style={{ animationDelay: `${450 + i * 280}ms` }}
            >
              <Star size={48} strokeWidth={2} fill="currentColor" aria-hidden="true" />
            </span>
          ))}
        </div>
        {newRecord && <span className="lg-chip lg-chip--accent">Kỷ lục mới</span>}
        <dl className="lg-result__stats">
          <div>
            <dt>Điểm màn</dt>
            <dd className="lg-mono">{r.score}</dd>
          </div>
          {pts && (
            <div>
              <dt>Điểm thưởng</dt>
              <dd className="lg-mono">+{pts.credited}</dd>
            </div>
          )}
        </dl>
        {props.summary && <p className="lg-result__summary">{props.summary}</p>}
        {note && <p className="lg-result__note">{note}</p>}
        {r.badges.length > 0 && (
          <ul className="lg-result__badges" aria-label="Huy hiệu mới">
            {r.badges.map((b) => (
              <li key={b.id} className="lg-badge-chip">
                <Award size={18} aria-hidden="true" /> {badgeTitle(b)}
              </li>
            ))}
          </ul>
        )}
        <div className="lg-result__actions">
          <button type="button" className="lg-btn lg-btn--primary" onClick={goNext} data-autofocus>
            {next ? (
              <>
                Màn tiếp <ArrowRight size={20} aria-hidden="true" />
              </>
            ) : (
              <>
                Về danh sách màn <List size={20} aria-hidden="true" />
              </>
            )}
          </button>
          {props.extra}
          <button type="button" className="lg-btn" onClick={props.onRestart}>
            <RotateCcw size={18} aria-hidden="true" /> Chơi lại
          </button>
          {next && (
            <button type="button" className="lg-btn lg-btn--ghost" onClick={goHub}>
              Danh sách màn
            </button>
          )}
        </div>
      </div>

      <WhyCard why={props.why} />
    </Modal>
  );
}

export function WhyCard({ why }: { why: WhyContent }) {
  const id = useId();
  // Hình minh họa vẽ sau khung hình đầu: thẻ kết quả hiện ngay, còn việc đo và vẽ đồ thị không dồn vào cùng
  // khung hình với hoạt cảnh thắng (máy chậm bị khựng, xem docs/PLAYTEST_LOG.md). Khung hình cao cố định nên không xô chữ.
  const [showFigure, setShowFigure] = useState(false);
  useEffect(() => {
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setShowFigure(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, []);
  return (
    <section className="lg-why lg-clay" aria-labelledby={id}>
      <h3 id={id} className="lg-why__head">
        <BookOpen size={20} aria-hidden="true" /> Vì sao?
      </h3>
      <p className="lg-why__title">{why.title}</p>
      {why.figure && (
        <figure className="lg-why__fig">
          <div className="lg-why__figbox">{showFigure && why.figure}</div>
          {why.caption && <figcaption>{why.caption}</figcaption>}
        </figure>
      )}
      <ul className="lg-why__lines">
        {why.lines.map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ul>
      <p className="lg-why__cite">{why.cite}</p>
    </section>
  );
}

function FailCard({ session, onRestart }: { session: LevelSession; onRestart: () => void }) {
  const g = useGames();
  const id = useId();
  const raceLost = session.failReason?.startsWith("Máy");
  return (
    <Modal open labelledBy={id} className="lg-fail">
      <div className="lg-fail__icon" aria-hidden="true">
        {raceLost ? <Bot size={36} /> : <HeartCrack size={36} />}
      </div>
      <h2 id={id}>{raceLost ? "Máy về đích trước" : "Hết mạng"}</h2>
      <p>{session.failReason}</p>
      <p className="lg-muted">Lượt này chưa được tính sao. Đọc lại lời giải thích rồi thử lại nhé.</p>
      <div className="lg-fail__actions">
        <button type="button" className="lg-btn lg-btn--primary" onClick={onRestart} data-autofocus>
          <RotateCcw size={20} aria-hidden="true" /> Chơi lại
        </button>
        <button type="button" className="lg-btn lg-btn--ghost" onClick={() => g.navigate({ name: "game", gameId: session.level.game })}>
          Danh sách màn
        </button>
      </div>
    </Modal>
  );
}
