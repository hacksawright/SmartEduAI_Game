import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { getLevelProgress, getLevelTitle, vnGreeting } from "@/lib/math-utils";
import { displayName } from "@/lib/week";
import { Flame, Swords, BookOpen, Trophy, ChevronRight, Sparkles, ClipboardList, Gamepad2 } from "lucide-react";
import { motion } from "framer-motion";

export const Route = createFileRoute("/_app/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { user, profile } = useAuth();
  const xp = profile?.xp_total ?? 0;
  const prog = getLevelProgress(xp);

  // Today's dungeon status
  const today = new Date().toISOString().slice(0, 10);
  const { data: dungeonToday } = useQuery({
    queryKey: ["dungeon-today", user?.id, today],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("daily_dungeon_sessions")
        .select("*")
        .eq("student_id", user!.id)
        .eq("session_date", today)
        .maybeSingle();
      return data;
    },
  });

  // Recent feed events
  const { data: feedEvents } = useQuery({
    queryKey: ["feed-preview"],
    queryFn: async () => {
      const { data } = await supabase
        .from("social_feed_events")
        .select("*, profiles!social_feed_events_student_id_fkey(full_name)")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const firstName = profile?.full_name?.split(" ").pop() ?? "bạn";

  return (
    <div className="px-4 md:px-8 py-6 md:py-10 max-w-6xl mx-auto space-y-6">
      {/* Welcome */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl md:text-3xl font-bold">
          Chào {vnGreeting()}, {firstName}! 👋
        </h1>
        <p className="text-muted-foreground mt-1">Luyện một chương đồ thị hôm nay để lấy điểm tuần.</p>
      </motion.div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Flame className="size-4 streak-flame text-[color:var(--streak)]" />} label="Chuỗi ngày" value={`${profile?.streak_current ?? 0}`} sub="ngày liên tục" />
        <StatCard icon={<Sparkles className="size-4 text-[color:var(--xp)]" />} label="Tổng XP" value={`${xp}`} sub={getLevelTitle(prog.level)} />
        <StatCard icon={<Trophy className="size-4 text-primary" />} label="Cấp độ" value={`${prog.level}`} sub={`${prog.current}/${prog.needed} XP`} />
        <StatCard icon={<BookOpen className="size-4 text-[color:var(--success)]" />} label="Mục tiêu" value={`${profile?.daily_goal_minutes ?? 15} phút`} sub="mỗi ngày" />
      </div>

      {/* Level progress */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex justify-between items-end mb-2">
          <div>
            <div className="text-xs text-muted-foreground">Cấp {prog.level} · {getLevelTitle(prog.level)}</div>
            <div className="font-semibold">{prog.current} / {prog.needed} XP đến cấp {Math.min(prog.level + 1, 20)}</div>
          </div>
          <div className="text-2xl">⚡</div>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${prog.pct}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full bg-gradient-primary rounded-full"
          />
        </div>
      </div>

      {/* Main grid */}
      <div className="grid md:grid-cols-2 gap-4">
        <Link to="/practice" className="block group">
          <div className="h-full rounded-2xl p-6 bg-gradient-to-br from-[color:var(--primary-soft)] to-card border border-border hover:shadow-[var(--shadow-glow)] transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="size-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
                <ClipboardList className="size-5" />
              </div>
              <ChevronRight className="size-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </div>
            <h3 className="font-bold text-lg">Luyện theo chương</h3>
            <p className="text-sm text-muted-foreground mt-1">8 chương lý thuyết đồ thị. Mỗi câu đúng 20 điểm, lấy điểm cao nhất trong tuần.</p>
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
              Làm bài lấy điểm
            </div>
          </div>
        </Link>

        {/* Trò chơi: module riêng, điểm và huy hiệu không cộng vào điểm tuần */}
        <Link to="/games" className="block group">
          <div className="h-full bg-card border border-border rounded-2xl p-6 hover:border-primary hover:shadow-[var(--shadow-glow)] transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="size-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center">
                <Gamepad2 className="size-5" />
              </div>
              <ChevronRight className="size-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </div>
            <h3 className="font-bold text-lg">Trò chơi đồ thị</h3>
            <p className="text-sm text-muted-foreground mt-1">6 trò chơi: tự chạy BFS, DFS, Dijkstra, Kruskal và vẽ một nét. Điểm tính riêng, không vào bảng xếp hạng tuần.</p>
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-soft text-primary-strong text-sm font-semibold">
              Vào chơi
            </div>
          </div>
        </Link>

        <Link to="/courses" className="block group">
          <div className="h-full bg-card border border-border rounded-2xl p-6 hover:border-primary hover:shadow-[var(--shadow-glow)] transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="size-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center">
                <BookOpen className="size-5" />
              </div>
              <ChevronRight className="size-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </div>
            <h3 className="font-bold text-lg">Khóa học</h3>
            <p className="text-sm text-muted-foreground mt-1">Phần khóa học đang để trống, sẽ do người phụ trách khác bổ sung.</p>
          </div>
        </Link>

        {/* Daily Dungeon */}
        <Link to="/dungeon" className="block group">
          <div className="h-full rounded-2xl p-6 bg-gradient-to-br from-[color:var(--primary-soft)] to-card border border-border hover:shadow-[var(--shadow-glow)] transition-all relative overflow-hidden">
            <div className="absolute top-0 right-0 text-7xl opacity-10">⚔️</div>
            <div className="flex items-center justify-between mb-3">
              <div className="size-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
                <Swords className="size-5" />
              </div>
              <ChevronRight className="size-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </div>
            <h3 className="font-bold text-lg">Phó bản hôm nay</h3>
            {dungeonToday?.completed_at ? (
              <p className="text-sm text-[color:var(--success)] mt-1 font-medium">
                ✓ Hoàn thành! {dungeonToday.score}/3 — Gặp lại ngày mai
              </p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mt-1">3 câu lý thuyết đồ thị. 5 phút.</p>
                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                  Tham chiến ngay
                </div>
              </>
            )}
          </div>
        </Link>
      </div>

      {/* Feed preview */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold">Bảng tin lớp học</h3>
          <Link to="/leaderboard" className="text-sm text-primary hover:underline">Xếp hạng →</Link>
        </div>
        <div className="space-y-3">
          {(feedEvents ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">Chưa có hoạt động. Hãy là người đầu tiên hoàn thành một chương!</p>
          )}
          {feedEvents?.slice(0, 5).map((e: any) => (
            <FeedItem key={e.id} event={e} />
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>
    </div>
  );
}

function FeedItem({ event }: { event: any }) {
  const name = displayName(event.profiles?.full_name);
  const map: Record<string, string> = {
    streak_milestone: `đạt chuỗi ${event.event_data_json?.days ?? ""} ngày học liên tục 🔥`,
    chapter_complete: `vừa chinh phục chương ${event.event_data_json?.title ?? ""} 🎉`,
    level_up: `lên cấp ${event.event_data_json?.level ?? ""} ⭐`,
    duel_win: `vừa thắng trận PvP ⚡`,
    dungeon_perfect: `đạt 3/3 Phó bản hôm nay 💯`,
  };
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/40">
      <div className="size-9 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
        {name.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm"><span className="font-semibold">{name}</span> {map[event.event_type] ?? "có hoạt động mới"}</div>
      </div>
    </div>
  );
}
