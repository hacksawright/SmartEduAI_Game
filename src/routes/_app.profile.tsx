import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { getLevelProgress, getLevelTitle } from "@/lib/math-utils";
import { Flame, Trophy, Award, Target, Lock } from "lucide-react";
import { BADGES, computeEarnedBadges, type BadgeStats } from "@/lib/badges";

export const Route = createFileRoute("/_app/profile")({
  component: Profile,
});

function Profile() {
  const { user, profile } = useAuth();
  const prog = getLevelProgress(profile?.xp_total ?? 0);

  const { data: stats } = useQuery({
    queryKey: ["profile-stats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [{ count: lessonsDone }, { count: dungeonsDone }, { data: perfectDungeons }, { count: duelsWon }] = await Promise.all([
        supabase.from("student_lesson_progress").select("id", { count: "exact", head: true })
          .eq("student_id", user!.id).eq("status", "completed"),
        supabase.from("daily_dungeon_sessions").select("id", { count: "exact", head: true })
          .eq("student_id", user!.id).not("completed_at", "is", null),
        supabase.from("daily_dungeon_sessions").select("id").eq("student_id", user!.id).eq("score", 3),
        supabase.from("duel_sessions").select("id", { count: "exact", head: true })
          .eq("winner_id", user!.id),
      ]);
      return {
        lessonsDone: lessonsDone ?? 0,
        dungeonsDone: dungeonsDone ?? 0,
        perfectDungeons: perfectDungeons?.length ?? 0,
        duelsWon: duelsWon ?? 0,
      };
    },
  });

  const badgeStats: BadgeStats = {
    lessonsCompleted: stats?.lessonsDone ?? 0,
    dungeonsCompleted: stats?.dungeonsDone ?? 0,
    perfectDungeons: stats?.perfectDungeons ?? 0,
    streakLongest: profile?.streak_longest ?? 0,
    xpTotal: profile?.xp_total ?? 0,
    level: profile?.level ?? 1,
    duelsWon: stats?.duelsWon ?? 0,
  };
  const earned = computeEarnedBadges(badgeStats);
  const earnedIds = new Set(earned.map((b) => b.id));

  return (
    <div className="px-4 md:px-8 py-6 md:py-10 max-w-3xl mx-auto space-y-6">
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="size-20 rounded-2xl bg-gradient-primary flex items-center justify-center text-primary-foreground text-3xl font-bold shrink-0">
            {profile?.full_name?.charAt(0) ?? "?"}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold">{profile?.full_name?.trim() || "Học sinh"}</h1>
            {profile?.school && <div className="text-xs text-muted-foreground mt-0.5">{profile.school}</div>}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-soft text-primary text-xs font-semibold mt-2">
              Cấp {prog.level} · {getLevelTitle(prog.level)}
            </div>
          </div>
        </div>

        <div className="mt-5 h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-gradient-primary" style={{ width: `${prog.pct}%` }} />
        </div>
        <div className="mt-1 text-xs text-muted-foreground text-center">{prog.current} / {prog.needed} XP đến cấp tiếp theo</div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Trophy className="size-4 text-[color:var(--xp)]" />} label="Tổng XP" value={String(profile?.xp_total ?? 0)} />
        <StatCard icon={<Award className="size-4 text-primary" />} label="Bài đã học" value={String(stats?.lessonsDone ?? 0)} />
        <StatCard icon={<Flame className="size-4 text-[color:var(--streak)]" />} label="Chuỗi tốt nhất" value={String(profile?.streak_longest ?? 0)} />
        <StatCard icon={<Target className="size-4 text-[color:var(--success)]" />} label="Trận PvP thắng" value={String(stats?.duelsWon ?? 0)} />
      </div>

      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold">Huy hiệu</h2>
          <span className="text-xs text-muted-foreground font-medium">{earned.length}/{BADGES.length} đã đạt</span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {BADGES.map((b) => {
            const got = earnedIds.has(b.id);
            const Icon = b.icon;
            return (
              <div key={b.id} className="text-center group" title={`${b.name} — ${b.description}`}>
                <div className={`relative size-16 mx-auto rounded-2xl flex items-center justify-center transition-all ${
                  got ? `bg-gradient-to-br ${b.gradient} shadow-md` : "bg-muted"
                }`}>
                  {got ? <Icon className="size-7 text-white" /> : <Lock className="size-5 text-muted-foreground" />}
                </div>
                <div className={`mt-1.5 text-xs font-medium truncate ${got ? "text-foreground" : "text-muted-foreground"}`}>{b.name}</div>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-4">Tiếp tục học và đấu để mở khóa thêm huy hiệu!</p>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}
