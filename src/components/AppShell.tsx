import { Link, useRouter } from "@tanstack/react-router";
import { Home, BookOpen, Swords, Trophy, Shield, User, Flame, Pencil, Network, ClipboardList } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

const navItems = [
  { to: "/dashboard", label: "Trang chủ", icon: Home },
  { to: "/practice", label: "Luyện tập", icon: ClipboardList },
  { to: "/courses", label: "Khóa học", icon: BookOpen },
  { to: "/dungeon", label: "Phó bản", icon: Swords },
  { to: "/arena", label: "Đấu trường", icon: Shield },
  { to: "/leaderboard", label: "Xếp hạng", icon: Trophy },
  { to: "/profile", label: "Hồ sơ", icon: User },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const router = useRouter();

  const handleRename = () => {
    router.navigate({ to: "/onboarding" });
  };


  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex w-64 shrink-0 border-r border-border bg-card flex-col">
        <div className="px-6 py-5 border-b border-border">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="size-9 rounded-xl bg-gradient-primary flex items-center justify-center text-primary-foreground">
              <Network className="size-5" />
            </div>
            <div>
              <div className="font-bold text-base leading-none">SmartEdu</div>
              <div className="text-xs text-muted-foreground mt-0.5">Lý thuyết đồ thị</div>
            </div>
          </Link>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              activeProps={{ className: "bg-primary-soft text-primary hover:bg-primary-soft" }}
            >
              <n.icon className="size-4" />
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-border">
          <div className="px-3 py-2 rounded-lg bg-secondary/60 mb-2">
            <div className="text-xs text-muted-foreground">Cấp độ {profile?.level ?? 1}</div>
            <div className="text-sm font-semibold truncate">{profile?.full_name?.trim() || "Học sinh"}</div>
            <div className="flex items-center gap-1 mt-1 text-xs">
              <Flame className="size-3 text-[color:var(--streak)] streak-flame" />
              <span className="font-medium">{profile?.streak_current ?? 0} ngày</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleRename} className="w-full justify-start gap-2 text-muted-foreground">
            <Pencil className="size-4" /> Sửa tên
          </Button>

        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-30 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-gradient-primary flex items-center justify-center text-primary-foreground">
            <Network className="size-4" />
          </div>
          <span className="font-bold">Đồ thị</span>
        </Link>
        <div className="flex items-center gap-2 text-xs">
          <Flame className="size-4 text-[color:var(--streak)] streak-flame" />
          <span className="font-semibold">{profile?.streak_current ?? 0}</span>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 min-w-0 pb-20 md:pb-0">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border grid grid-cols-7">
        {navItems.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            className="flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] text-muted-foreground"
            activeProps={{ className: "text-primary" }}
          >
            <n.icon className="size-5" />
            <span>{n.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
