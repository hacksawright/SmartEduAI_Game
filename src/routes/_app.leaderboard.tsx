import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { currentWeekStart } from "@/lib/week";
import { fetchWeeklyLeaderboard, weeklyLeaderboardKey } from "@/features/quiz/api";
import { LeaderboardView } from "@/features/quiz/LeaderboardView";

export const Route = createFileRoute("/_app/leaderboard")({
  head: () => ({
    meta: [
      { title: "Bảng xếp hạng tuần — SmartEdu" },
      {
        name: "description",
        content: "Xếp hạng tuần theo tổng điểm cao nhất của từng chương Luyện tập.",
      },
    ],
  }),
  component: Leaderboard,
});

function Leaderboard() {
  const { user } = useAuth();
  const weekStart = currentWeekStart();

  const { data, isError, isLoading, refetch } = useQuery({
    queryKey: weeklyLeaderboardKey(weekStart),
    queryFn: () => fetchWeeklyLeaderboard(supabase, weekStart),
  });

  return (
    <MotionConfig reducedMotion="user">
      <LeaderboardView
        weekStart={weekStart}
        data={data}
        userId={user?.id}
        loading={isLoading}
        error={isError}
        onRetry={() => void refetch()}
      />
    </MotionConfig>
  );
}
