// Danh sách màn của một game, chia theo nhóm (BFS/DFS…). Thẻ màn dùng Claymorphism (mục 7 kế hoạch).

import { ArrowLeft, Bot, Lock, Play } from "lucide-react";
import { useMemo } from "react";
import { useGames } from "../app/GamesContext";
import { makeGraph } from "../core/graph";
import type { GameId, Level } from "../core/levels/types";
import { chapterOf, getGame, RACE_SUFFIX, supportsRace } from "../core/registry";
import { levelShortLabel } from "../games/shared/labels";
import { bestStars, gameStats, isUnlocked } from "../services/progress";
import { GraphBoard } from "../ui/board/GraphBoard";
import { StarsSmall } from "../ui/components/Meters";

export function GameHub({ gameId }: { gameId: GameId }) {
  const g = useGames();
  const game = getGame(gameId);
  const chapter = chapterOf(game.chapter);
  const st = gameStats(g.progress, gameId);

  return (
    <div className="lg-page lg-hub">
      <header className="lg-hub__head">
        <button type="button" className="lg-icon-btn" onClick={() => g.navigate({ name: "home" })} aria-label="Về sảnh game">
          <ArrowLeft size={22} aria-hidden="true" />
        </button>
        <div>
          <p className="lg-hub__kicker">
            Chương {chapter.n} · {chapter.title}
          </p>
          <h1 className="lg-hub__title">{game.title}</h1>
          <p className="lg-hub__blurb">{game.blurb}</p>
        </div>
        <p className="lg-hub__stat">
          <span className="lg-mono">
            {st.stars}/{st.maxStars}
          </span>{" "}
          sao · <span className="lg-mono">{st.done}/{st.total}</span> màn
        </p>
      </header>

      {game.tracks.map((t) => {
        const levels = game.levels.filter((l) => l.track === t.id);
        return (
          <section key={t.id} className="lg-hub__track" aria-labelledby={`track-${t.id}`}>
            {game.tracks.length > 1 && (
              <h2 id={`track-${t.id}`} className="lg-hub__track-title">
                {t.title}
              </h2>
            )}
            {game.tracks.length === 1 && (
              <h2 id={`track-${t.id}`} className="lg-sr-only">
                Danh sách màn
              </h2>
            )}
            <ol className="lg-levels">
              {levels.map((l) => (
                <LevelCard key={l.id} level={l} />
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}

function LevelCard({ level }: { level: Level }) {
  const g = useGames();
  const graph = useMemo(() => makeGraph(level.graph), [level]);
  const unlocked = isUnlocked(g.progress, level.id, g.config.unlockAll);
  const stars = bestStars(g.progress, level.id);
  const raceId = level.id + RACE_SUFFIX;
  const race = supportsRace(level);
  const raceUnlocked = race && isUnlocked(g.progress, raceId, g.config.unlockAll);
  const raceStars = race ? bestStars(g.progress, raceId) : 0;
  const rec = g.progress.levels[level.id];

  const open = (id: string) => {
    g.play("open");
    g.navigate({ name: "play", levelId: id });
  };

  return (
    <li className={`lg-level lg-clay${unlocked ? "" : " lg-level--locked"}`}>
      <button
        type="button"
        className="lg-level__main"
        onClick={() => unlocked && open(level.id)}
        disabled={!unlocked}
        aria-label={`${levelShortLabel(level)}: ${level.title}. ${unlocked ? `${stars} sao` : "Chưa mở: cần 1 sao ở màn trước"}`}
      >
        <span className="lg-level__num lg-mono">{levelShortLabel(level)}</span>
        <span className="lg-level__art" aria-hidden="true">
          <GraphBoard graph={graph} label="" mini allowTranspose={false} />
        </span>
        <span className="lg-level__title">{level.title}</span>
        <span className="lg-level__meta">
          {unlocked ? (
            <>
              <StarsSmall stars={stars} />
              {rec?.bestScore ? <span className="lg-mono lg-muted">{rec.bestScore} điểm</span> : null}
            </>
          ) : (
            <span className="lg-level__lock">
              <Lock size={16} aria-hidden="true" /> Cần 1 sao ở màn trước
            </span>
          )}
        </span>
        {unlocked && (
          <span className="lg-level__play" aria-hidden="true">
            <Play size={18} fill="currentColor" />
          </span>
        )}
      </button>
      {race && (
        <button
          type="button"
          className="lg-level__race"
          onClick={() => raceUnlocked && open(raceId)}
          disabled={!raceUnlocked}
          aria-label={raceUnlocked ? `Đua với máy ở ${level.title}. ${raceStars} sao` : "Đua với máy: mở sau khi qua màn"}
        >
          <Bot size={16} aria-hidden="true" />
          <span>Đua với máy</span>
          {raceUnlocked ? raceStars > 0 && <StarsSmall stars={raceStars} /> : <Lock size={14} aria-hidden="true" />}
        </button>
      )}
    </li>
  );
}
