import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { LtdtGamesHost } from "@/features/games/LtdtGamesHost";
import { isLtdtGameId, ltdtInitialRoute } from "@/features/games/ltdt-loader";

interface GamesSearch {
  game?: string;
  level?: string;
}

export const Route = createFileRoute("/_app/games")({
  validateSearch: (search: Record<string, unknown>): GamesSearch => ({
    game: isLtdtGameId(search.game) ? search.game : undefined,
    level: typeof search.level === "string" ? search.level : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Trò chơi đồ thị — SmartEdu" },
      {
        name: "description",
        content:
          "Sáu trò chơi lý thuyết đồ thị: tự làm thay BFS, DFS, Dijkstra, Kruskal và giải câu đố Euler.",
      },
    ],
  }),
  component: GamesPage,
});

function GamesPage() {
  const { user } = useAuth();
  const search = Route.useSearch();
  const initialRoute = ltdtInitialRoute(search);
  if (!user) return null;
  // key: đổi màn mở đầu thì gắn lại game (config chỉ được đọc lúc gắn)
  return <LtdtGamesHost key={initialRoute} userId={user.id} initialRoute={initialRoute} />;
}
