import { useEffect, useMemo, useRef } from "react";
import { BadgesScreen } from "../screens/BadgesScreen";
import { GameHub } from "../screens/GameHub";
import { Home } from "../screens/Home";
import { PlayScreen } from "../screens/PlayScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { Confetti } from "../ui/components/Confetti";
import { Toasts } from "../ui/components/Toasts";
import { resolveConfig, type GamesConfig } from "./config";
import { GamesProvider, useGames } from "./GamesContext";
import { useRouter } from "./router";

export function App({ config }: { config: GamesConfig }) {
  const resolved = useMemo(() => resolveConfig(config), [config]);
  const { route, navigate } = useRouter(resolved.hashRouting, resolved.initialRoute);
  return (
    <GamesProvider config={resolved} route={route} navigate={navigate}>
      <Root />
    </GamesProvider>
  );
}

function Root() {
  const g = useGames();
  const ref = useRef<HTMLDivElement | null>(null);
  const routeKey = JSON.stringify(g.route);
  const first = useRef(true);

  // Đổi màn hình: cuộn lên đầu và chuyển focus tới tiêu đề (trình đọc màn hình biết đã sang trang mới)
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (g.config.hashRouting) window.scrollTo({ top: 0 });
    else ref.current?.scrollIntoView({ block: "nearest" });
    if (g.route.name === "play") return; // màn chơi: thẻ giới thiệu tự nhận focus
    const h = ref.current?.querySelector<HTMLElement>("h1");
    if (h) {
      h.tabIndex = -1;
      h.focus({ preventScroll: true });
    }
  }, [routeKey, g.config.hashRouting, g.route.name]);

  const r = g.route;
  return (
    <div ref={ref} className="lg-root" data-motion={g.reducedMotion ? "reduced" : "full"} lang="vi">
      <main className="lg-app">
        {r.name === "home" && <Home />}
        {r.name === "game" && <GameHub gameId={r.gameId} />}
        {r.name === "play" && <PlayScreen levelId={r.levelId} />}
        {r.name === "badges" && <BadgesScreen />}
        {r.name === "settings" && <SettingsScreen />}
      </main>
      <Toasts />
      <Confetti trigger={g.confetti} reduced={g.reducedMotion} />
    </div>
  );
}
