// Định tuyến tối giản: hash (#/...) khi chạy riêng, bộ nhớ khi nhúng vào trang có router riêng.

import { useCallback, useEffect, useState } from "react";
import type { GameId } from "../core/levels/types";
import { findGame, getLevel } from "../core/registry";

export type Route =
  | { name: "home" }
  | { name: "game"; gameId: GameId }
  | { name: "play"; levelId: string }
  | { name: "badges" }
  | { name: "settings" };

export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#/, "").replace(/^\/+/, "").split("?")[0];
  const [a, b] = path.split("/");
  if (a === "game" && b && findGame(b)) return { name: "game", gameId: b as GameId };
  if (a === "play" && b && getLevel(decodeURIComponent(b))) return { name: "play", levelId: decodeURIComponent(b) };
  if (a === "badges") return { name: "badges" };
  if (a === "settings") return { name: "settings" };
  return { name: "home" };
}

export function formatRoute(r: Route): string {
  switch (r.name) {
    case "home":
      return "#/";
    case "game":
      return `#/game/${r.gameId}`;
    case "play":
      return `#/play/${encodeURIComponent(r.levelId)}`;
    case "badges":
      return "#/badges";
    case "settings":
      return "#/settings";
  }
}

export function useRouter(hashRouting: boolean, initial?: string) {
  const [route, setRoute] = useState<Route>(() =>
    parseRoute(hashRouting && typeof location !== "undefined" ? location.hash : (initial ?? "#/")),
  );

  useEffect(() => {
    if (!hashRouting) return;
    const onHash = () => setRoute(parseRoute(location.hash));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [hashRouting]);

  const navigate = useCallback(
    (r: Route, opts: { replace?: boolean } = {}) => {
      if (hashRouting) {
        const h = formatRoute(r);
        if (opts.replace) history.replaceState(null, "", h);
        else if (location.hash !== h) history.pushState(null, "", h);
      }
      setRoute(r);
    },
    [hashRouting],
  );

  return { route, navigate };
}
