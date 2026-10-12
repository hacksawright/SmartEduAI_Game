import { ArrowLeft, Lock } from "lucide-react";
import { lazy, Suspense, useState, type ComponentType } from "react";
import { useGames } from "../app/GamesContext";
import type { GameId, Level } from "../core/levels/types";
import { getLevel, prevLevel, RACE_SUFFIX } from "../core/registry";
import type { GameProps } from "../games/shared/types";
import { isUnlocked } from "../services/progress";

// Giao diện của mỗi game là một chunk riêng, chỉ tải khi mở màn của game đó: sảnh và danh sách màn không phải tải cả 9 game.
// Mỗi game nhận đúng kiểu màn của nó; ép kiểu một lần ở đây.
const COMPONENTS: Record<GameId, ComponentType<GameProps<never>>> = {
  traversal: lazy(() => import("../games/traversal/TraversalPlay").then((m) => ({ default: m.TraversalPlay }))),
  dijkstra: lazy(() => import("../games/dijkstra/DijkstraPlay").then((m) => ({ default: m.DijkstraPlay }))),
  one_stroke: lazy(() => import("../games/oneStroke/OneStrokePlay").then((m) => ({ default: m.OneStrokePlay }))),
  muddy_city: lazy(() => import("../games/muddy/MuddyPlay").then((m) => ({ default: m.MuddyPlay }))),
  greedy_order: lazy(() => import("../games/greedy/GreedyPlay").then((m) => ({ default: m.GreedyPlay }))),
  matrix_translate: lazy(() => import("../games/matrix/MatrixPlay").then((m) => ({ default: m.MatrixPlay }))),
  untangle: lazy(() => import("../games/untangle/UntanglePlay").then((m) => ({ default: m.UntanglePlay }))),
  two_teams: lazy(() => import("../games/teams/TeamsPlay").then((m) => ({ default: m.TeamsPlay }))),
  max_flow: lazy(() => import("../games/flow/FlowPlay").then((m) => ({ default: m.FlowPlay }))),
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
    <Suspense
      fallback={
        <div className="lg-page lg-muted" role="status">
          Đang tải màn chơi…
        </div>
      }
    >
      <Comp
        key={`${levelId}#${attempt}`}
        level={level}
        levelId={levelId}
        race={race}
        onRestart={() => setAttempt((a) => a + 1)}
      />
    </Suspense>
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
