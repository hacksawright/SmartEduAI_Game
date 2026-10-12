import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { MotionConfig } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { chapterByKey } from "@/lib/graph-chapters";
import { currentWeekStart } from "@/lib/week";
import { chapterBestKey, fetchChapterBest } from "@/features/quiz/api";
import { ChapterHub } from "@/features/quiz/ChapterHub";
import { ChapterQuiz } from "@/features/quiz/ChapterQuiz";

export const Route = createFileRoute("/_app/practice")({
  head: () => ({
    meta: [
      { title: "Luyện theo chương — SmartEdu" },
      {
        name: "description",
        content: "Làm bài 5 câu mỗi chương Lý thuyết đồ thị, lấy điểm tuần và lên bảng xếp hạng.",
      },
    ],
  }),
  component: Practice,
});

function Practice() {
  const { user, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const weekStart = currentWeekStart();
  const [activeKey, setActiveKey] = useState<string | null>(null);
  // tăng lên khi bấm "Làm lại chương" để bắt đầu một lần làm mới
  const [run, setRun] = useState(0);

  const {
    data: bestByChapter = {},
    isError,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: chapterBestKey(user?.id, weekStart),
    enabled: !!user,
    queryFn: () => fetchChapterBest(supabase, user!.id, weekStart),
  });

  const active = activeKey ? chapterByKey(activeKey) : undefined;

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [activeKey, run]);

  if (active) {
    return (
      <MotionConfig reducedMotion="user">
        <ChapterQuiz
          key={`${active.key}-${run}`}
          chapter={active}
          weekStart={weekStart}
          previousBest={bestByChapter[active.key] ?? 0}
          onExit={() => setActiveKey(null)}
          onRestart={() => setRun((value) => value + 1)}
          onSaved={async () => {
            await queryClient.invalidateQueries({ queryKey: chapterBestKey(user?.id, weekStart) });
            await queryClient.invalidateQueries({ queryKey: ["weekly-leaderboard"] });
            await refreshProfile();
          }}
        />
      </MotionConfig>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <ChapterHub
        weekStart={weekStart}
        best={bestByChapter}
        loading={isLoading}
        error={isError}
        onRetry={() => void refetch()}
        onStart={setActiveKey}
      />
    </MotionConfig>
  );
}
