import { ArrowLeft, Lock } from "lucide-react";
import { useState, type ComponentType } from "react";
import { useGames } from "../app/GamesContext";
import type { GameId, Level } from "../core/levels/types";
import { getLevel, prevLevel, RACE_SUFFIX } from "../core/registry";
import { DijkstraPlay } from "../games/dijkstra/DijkstraPlay";
import { GreedyPlay } from "../games/greedy/GreedyPlay";
import { MatrixPlay } from "../games/matrix/MatrixPlay";
import { MuddyPlay } from "../games/muddy/MuddyPlay";
import { OneStrokePlay } from "../games/oneStroke/OneStrokePlay";
import type { GameProps } from "../games/shared/types";
import { TraversalPlay } from "../games/traversal/TraversalPlay";
import { isUnlocked } from "../services/progress";

// mỗi game nhận đúng kiểu màn của nó; ép kiểu một lần ở đây
const COMPONENTS: Record<GameId, ComponentType<GameProps<never>>> = {
  traversal: TraversalPlay,
  dijkstra: DijkstraPlay,
  one_stroke: OneStrokePlay,
  muddy_city: MuddyPlay,
  greedy_order: GreedyPlay,
  matrix_translate: MatrixPlay,
};

export function PlayScreen({ levelId }: { levelId: string }) {
  const g = useGames();
  const [attempt, setAttempt] = useState(0);
  const level = getLevel(levelId);
  if (!level) return null;
  const race = levelId.endsWith(RACE_SUFFIX);

  if (!isUnlocked(g.progress, levelId, g.config.unlockAll)) {
    return <LockedLevel level={level} race={race} />;
  }

  const Comp = COMPONENTS[level.game] as ComponentType<GameProps<Level>>;
  return (
    <Comp
      key={`${levelId}#${attempt}`}
      level={level}
      levelId={levelId}
      race={race}
      onRestart={() => setAttempt((a) => a + 1)}
    />
  );
}

function LockedLevel({ level, race }: { level: Level; race: boolean }) {
  const g = useGames();
  const prev = prevLevel(level);
  return (
    <div className="lg-page lg-locked">
      <div className="lg-card lg-locked__card">
        <Lock size={32} aria-hidden="true" />
        <h1>Màn này chưa mở</h1>
        <p>
          {race
            ? "Chế độ Đua với máy mở sau khi bạn qua màn này ở chế độ thường."
            : `Đạt ít nhất 1 sao ở màn trước${prev ? ` (“${prev.title}”)` : ""} để mở màn này.`}
        </p>
        <button type="button" className="lg-btn lg-btn--primary" onClick={() => g.navigate({ name: "game", gameId: level.game })}>
          <ArrowLeft size={20} aria-hidden="true" /> Về danh sách màn
        </button>
      </div>
    </div>
  );
}
