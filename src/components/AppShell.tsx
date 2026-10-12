import { useState } from "react";
import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import {
  Home,
  BookOpen,
  Swords,
  Trophy,
  Shield,
  User,
  Flame,
  Pencil,
  Network,
  ClipboardList,
  Gamepad2,
  Menu,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const navItems = [
  { to: "/dashboard", label: "Trang chủ", icon: Home },
  { to: "/practice", label: "Luyện tập", icon: ClipboardList },
  { to: "/games", label: "Trò chơi", icon: Gamepad2 },
  { to: "/courses", label: "Khóa học", icon: BookOpen },
  { to: "/dungeon", label: "Phó bản", icon: Swords },
  { to: "/arena", label: "Đấu trường", icon: Shield },
  { to: "/leaderboard", label: "Xếp hạng", icon: Trophy },
  { to: "/profile", label: "Hồ sơ", icon: User },
] as const;

// Thanh dưới trên mobile tối đa 5 mục; các mục còn lại nằm trong "Thêm"
const mobilePrimary = ["/dashboard", "/practice", "/games", "/leaderboard"] as const;
const mobileMore = navItems.filter((n) => !(mobilePrimary as readonly string[]).includes(n.to));

export function AppShell({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = mobileMore.some((n) => pathname.startsWith(n.to));

  const handleRename = () => {
    setMoreOpen(false);
    router.navigate({ to: "/onboarding" });
  };

  return (
    // --app-chrome-h: tổng chiều cao thanh trên + thanh dưới trên mobile (trang /games dùng để
    // màn chơi vừa khít màn hình)
    <div className="min-h-screen bg-background flex flex-col md:flex-row [--app-chrome-h:calc(7.5rem+env(safe-area-inset-bottom))] md:[--app-chrome-h:0px]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-card focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:shadow-[var(--shadow-card)] focus:outline-2 focus:outline-primary"
      >
        Bỏ qua điều hướng
      </a>

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
        <nav aria-label="Điều hướng chính" className="flex-1 px-3 py-4 space-y-0.5">
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
            <div className="text-sm font-semibold truncate">
              {profile?.full_name?.trim() || "Học sinh"}
            </div>
            <div className="flex items-center gap-1 mt-1 text-xs">
              <Flame className="size-3 text-[color:var(--streak)] streak-flame" />
              <span className="font-medium">{profile?.streak_current ?? 0} ngày</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRename}
            className="w-full justify-start gap-2 text-muted-foreground"
          >
            <Pencil className="size-4" /> Sửa tên
          </Button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-30 h-14 bg-card border-b border-border px-4 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-gradient-primary flex items-center justify-center text-primary-foreground">
            <Network className="size-4" />
          </div>
          <span className="font-bold">Đồ thị</span>
        </Link>
        <div className="flex items-center gap-2 text-xs">
          <Flame className="size-4 text-[color:var(--streak)] streak-flame" aria-hidden />
          <span className="font-semibold">
            {profile?.streak_current ?? 0}
            <span className="sr-only"> ngày liên tục</span>
          </span>
        </div>
      </header>

      {/* Main content */}
      <main
        id="main"
        tabIndex={-1}
        className="flex-1 min-w-0 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0 focus:outline-none"
      >
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav
        aria-label="Điều hướng chính"
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border grid grid-cols-5 pb-[env(safe-area-inset-bottom)]"
      >
        {mobilePrimary.map((to) => {
          const n = navItems.find((item) => item.to === to)!;
          return (
            <Link
              key={n.to}
              to={n.to}
              className="flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground"
              activeProps={{ className: "text-primary-strong" }}
            >
              <n.icon className="size-5" aria-hidden />
              <span>{n.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-haspopup="dialog"
          className={`flex h-16 cursor-pointer flex-col items-center justify-center gap-1 text-[11px] font-medium ${
            moreActive ? "text-primary-strong" : "text-muted-foreground"
          }`}
        >
          <Menu className="size-5" aria-hidden />
          <span>Thêm</span>
        </button>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
        >
          <SheetHeader className="text-left">
            <SheetTitle>Thêm</SheetTitle>
            <SheetDescription>Các mục khác của SmartEdu.</SheetDescription>
          </SheetHeader>
          <nav aria-label="Mục khác" className="mt-4 grid gap-1">
            {mobileMore.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setMoreOpen(false)}
                className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-medium hover:bg-accent"
                activeProps={{ className: "bg-primary-soft text-primary-strong" }}
              >
                <n.icon className="size-5 text-muted-foreground" aria-hidden />
                <span className="flex-1">{n.label}</span>
                <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
              </Link>
            ))}
            <button
              type="button"
              onClick={handleRename}
              className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl px-3 text-left text-sm font-medium hover:bg-accent"
            >
              <Pencil className="size-5 text-muted-foreground" aria-hidden />
              <span className="flex-1">Sửa tên</span>
              <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
            </button>
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );
}
