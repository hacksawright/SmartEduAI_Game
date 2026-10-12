import type { Level } from "../../core/levels/types";
import { chapterOf, getGame } from "../../core/registry";

/** "BFS 1", "Màn 3"… */
export function levelShortLabel(level: Level): string {
  if (level.game === "traversal") return `${level.algo.toUpperCase()} ${level.n}`;
  if (level.game === "dijkstra") return `D${level.n}`;
  return `Màn ${level.n}`;
}

/** "Ch.2 · BFS 1" */
export function levelCrumb(level: Level): string {
  return `Ch.${chapterOf(level.chapter).n} · ${levelShortLabel(level)}`;
}

export function gameTitle(level: Level): string {
  return getGame(level.game).title;
}

export function trackOf(level: Level) {
  const g = getGame(level.game);
  return g.tracks.find((t) => t.id === level.track) ?? g.tracks[0];
}

export function trackLevels(level: Level): Level[] {
  return getGame(level.game).levels.filter((l) => l.track === level.track);
}
