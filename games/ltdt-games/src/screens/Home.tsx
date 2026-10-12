// Sảnh game: Bento grid theo chương (mục 7 kế hoạch). Ô lớn cho game P0, ô nhỏ cho P0+ và "Giai đoạn 2".

import { ArrowRight, Award, Hourglass, Settings, Star, Trophy } from "lucide-react";
import { useMemo } from "react";
import { useGames } from "../app/GamesContext";
import { makeGraph } from "../core/graph";
import { CHAPTERS, getGame, type ChapterMeta, type GameMeta } from "../core/registry";
import { BADGES } from "../services/badges";
import { bestStars, gameStats } from "../services/progress";
import { GraphBoard } from "../ui/board/GraphBoard";

export function Home() {
  const g = useGames();
  const totals = useMemo(() => {
    let stars = 0;
    let max = 0;
    for (const c of CHAPTERS)
      for (const id of c.games) {
        const st = gameStats(g.progress, id);
        stars += st.stars;
        max += st.maxStars;
      }
    return { stars, max };
  }, [g.progress]);
  const badgeCount = BADGES.filter((b) => g.progress.badges[b.id]).length;

  return (
    <div className="lg-page lg-home">
      <header className="lg-home__head">
        <div>
          <p className="lg-home__kicker">SmartEduAI · Lý thuyết đồ thị</p>
          <h1 className="lg-home__title">Sảnh game</h1>
          <p className="lg-home__lead">
            Mỗi chương một trò chơi. Bạn làm thay thuật toán hoặc giải câu đố đồ thị, còn chính thuật toán của chương sẽ chấm bài.
          </p>
        </div>
        <nav className="lg-home__stats" aria-label="Thành tích">
          <span className="lg-stat" title="Tổng số sao">
            <Star size={18} fill="currentColor" className="lg-stat__star" aria-hidden="true" />
            <span className="lg-mono">
              {totals.stars}/{totals.max}
            </span>
            <span className="lg-sr-only">sao</span>
          </span>
          <span className="lg-stat" title="Điểm thưởng">
            <Trophy size={18} aria-hidden="true" />
            <span className="lg-mono">{g.progress.points}</span> điểm
          </span>
          <button type="button" className="lg-btn lg-btn--sm" onClick={() => g.navigate({ name: "badges" })}>
            <Award size={18} aria-hidden="true" /> Huy hiệu <span className="lg-mono">{badgeCount}</span>
          </button>
          <button
            type="button"
            className="lg-icon-btn"
            onClick={() => g.navigate({ name: "settings" })}
            aria-label="Cài đặt"
          >
            <Settings size={22} aria-hidden="true" />
          </button>
        </nav>
      </header>

      <ul className="lg-bento">
        {CHAPTERS.map((c) =>
          c.games.length ? (
            c.games.map((id) => <GameTile key={id} chapter={c} game={getGame(id)} />)
          ) : (
            <LaterTile key={c.id} chapter={c} />
          ),
        )}
      </ul>
    </div>
  );
}

function GameTile({ chapter, game }: { chapter: ChapterMeta; game: GameMeta }) {
  const g = useGames();
  const big = game.priority === "P0";
  const st = gameStats(g.progress, game.id);
  const graph = useMemo(() => makeGraph(game.levels[game.levels.length > 2 ? 1 : 0].graph), [game]);
  // màn kế tiếp nên chơi: màn đầu tiên chưa có sao (theo thứ tự nhóm)
  const nextLevel = game.levels.find((l) => bestStars(g.progress, l.id) === 0);
  const started = st.done > 0;
  const pct = Math.round((st.stars / Math.max(1, st.maxStars)) * 100);

  return (
    <li className={`lg-tile ${big ? "lg-tile--big" : "lg-tile--small"}`}>
      <button
        type="button"
        className="lg-tile__btn"
        onClick={() => {
          g.play("open");
          g.navigate({ name: "game", gameId: game.id });
        }}
        aria-label={`Chương ${chapter.n}: ${game.title}. ${st.done}/${st.total} màn, ${st.stars}/${st.maxStars} sao.`}
      >
        <div className="lg-tile__text">
          <p className="lg-tile__chapter">
            <span className="lg-chip">Ch.{chapter.n}</span>
            <span className="lg-tile__chapter-name">{chapter.title}</span>
          </p>
          <h2 className="lg-tile__title">{game.title}</h2>
          <p className="lg-tile__sub">{game.subtitle}</p>
          {big && <p className="lg-tile__blurb">{game.blurb}</p>}
        </div>
        <div className="lg-tile__art" aria-hidden="true">
          {game.id === "muddy_city" ? <TownArt /> : <GraphBoard graph={graph} label="" mini allowTranspose={false} />}
        </div>
        <div className="lg-tile__foot">
          <div className="lg-tile__progress">
            <span className="lg-tile__count">
              <Star size={16} fill="currentColor" className="lg-stat__star" aria-hidden="true" />
              <span className="lg-mono">
                {st.stars}/{st.maxStars}
              </span>
              <span className="lg-muted">
                {" "}
                · {st.done}/{st.total} màn
              </span>
            </span>
            <span className="lg-progress" aria-hidden="true">
              <span style={{ width: `${pct}%` }} />
            </span>
          </div>
          <span className="lg-tile__cta">
            {started ? (nextLevel ? "Chơi tiếp" : "Lấy thêm sao") : "Bắt đầu"}
            <ArrowRight size={18} aria-hidden="true" />
          </span>
        </div>
      </button>
    </li>
  );
}

function TownArt() {
  const { config } = useGames();
  const a = config.assetBase;
  return (
    <div className="lg-townart">
      <img src={`${a}town/house-3.png`} alt="" className="lg-townart__h1" />
      <img src={`${a}town/house-7.png`} alt="" className="lg-townart__h2" />
      <img src={`${a}town/house-1.png`} alt="" className="lg-townart__h3" />
      <img src={`${a}town/tree-pine.png`} alt="" className="lg-townart__t1" />
      <img src={`${a}town/tree-cypress.png`} alt="" className="lg-townart__t2" />
      <svg className="lg-townart__roads" viewBox="0 0 200 120" preserveAspectRatio="none">
        <path d="M40 40 L110 30 L160 82 M110 30 L70 92" />
      </svg>
    </div>
  );
}

function LaterTile({ chapter }: { chapter: ChapterMeta }) {
  return (
    <li className="lg-tile lg-tile--later">
      <div className="lg-tile__btn lg-tile__btn--static">
        <div className="lg-tile__text">
          <p className="lg-tile__chapter">
            <span className="lg-chip lg-chip--muted">Ch.{chapter.n}</span>
            <span className="lg-tile__chapter-name">{chapter.title}</span>
          </p>
          <p className="lg-tile__later">
            <Hourglass size={16} aria-hidden="true" /> Giai đoạn 2
          </p>
          <ul className="lg-tile__later-list">
            {chapter.later.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      </div>
    </li>
  );
}
