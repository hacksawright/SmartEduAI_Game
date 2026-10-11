import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useEffect } from "react";
import { Network, Sparkles, Swords, Trophy, Flame, BookOpen } from "lucide-react";
import { motion } from "framer-motion";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "Lý thuyết đồ thị — Học và luyện mỗi ngày" },
      { name: "description", content: "Luyện lý thuyết đồ thị theo chương, cộng điểm tuần và tranh giải trên bảng xếp hạng." },
    ],
  }),
});

function Landing() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.navigate({ to: "/dashboard" });
  }, [user, loading, router]);

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b border-border bg-card/60 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-xl bg-gradient-primary flex items-center justify-center text-primary-foreground">
              <Network className="size-5" />
            </div>
            <div className="font-bold text-lg">SmartEdu</div>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild className="bg-gradient-primary hover:opacity-90"><Link to="/dashboard">Vào học ngay</Link></Button>
          </div>

        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 py-16 md:py-24 grid md:grid-cols-2 gap-12 items-center">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-soft text-primary text-xs font-semibold mb-6">
            <Sparkles className="size-3" /> Lý thuyết đồ thị
          </div>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight tracking-tight">
            Học đồ thị<br />
            <span className="bg-gradient-primary bg-clip-text text-transparent">qua từng chương.</span>
          </h1>
          <p className="mt-5 text-lg text-muted-foreground max-w-md">
            Làm bài cuối mỗi chương, cộng điểm trong tuần, và xem ai đang đứng đầu để nhận giải. Khóa học lý thuyết sẽ được bổ sung sau.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" asChild className="bg-gradient-primary hover:opacity-90 shadow-[var(--shadow-glow)]">
              <Link to="/dashboard">Vào luyện tập →</Link>
            </Button>
          </div>

          <div className="mt-8 flex items-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Flame className="size-4 text-[color:var(--streak)]" /> Streak hàng ngày</span>
            <span className="flex items-center gap-1.5"><Trophy className="size-4 text-[color:var(--xp)]" /> Xếp hạng tuần</span>
            <span className="flex items-center gap-1.5"><Swords className="size-4 text-primary" /> PvP 5 phút</span>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.15 }}>
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-primary opacity-20 blur-3xl rounded-3xl" />
            <div className="relative bg-card rounded-3xl border border-border shadow-[var(--shadow-card)] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">Đang luyện</div>
                  <div className="font-bold">Chương 2: DFS và BFS</div>
                </div>
                <div className="text-xs px-2 py-1 rounded-md bg-primary-soft text-primary font-semibold">Câu 3/5</div>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-gradient-primary rounded-full" style={{ width: "60%" }} />
              </div>
              <div className="p-4 rounded-xl bg-secondary/50 text-sm leading-relaxed">
                Trên đồ thị không trọng số, thuật toán nào tìm đường đi ít cạnh nhất?
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button className="px-3 py-2 rounded-lg border border-border text-sm hover:bg-accent text-left">BFS ✓</button>
                <button className="px-3 py-2 rounded-lg border border-border text-sm text-left text-muted-foreground">Kruskal</button>
                <button className="px-3 py-2 rounded-lg border border-border text-sm text-left text-muted-foreground">Tô màu</button>
                <button className="px-3 py-2 rounded-lg border border-border text-sm text-left text-muted-foreground">Luồng max</button>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 text-[color:var(--streak)]"><Flame className="size-3 streak-flame" /> 12 ngày</span>
                <span className="px-2 py-1 rounded-md bg-success/15 text-[color:var(--success)] font-semibold">+60 điểm</span>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="bg-card/40 border-y border-border">
        <div className="max-w-6xl mx-auto px-4 py-16 grid md:grid-cols-3 gap-6">
          {[
            { icon: BookOpen, title: "Tám chương đồ thị", desc: "Từ khái niệm, DFS/BFS, Euler, đồ thị phẳng, tô màu, đường ngắn nhất, cây khung đến luồng cực đại." },
            { icon: Swords, title: "Điểm theo chương", desc: "Mỗi câu đúng 20 điểm. Trong tuần, mỗi chương lấy lần cao nhất rồi cộng vào bảng xếp hạng." },
            { icon: Trophy, title: "Giải thưởng tuần", desc: "Bạn có tổng điểm cao nhất trong tuần đứng đầu bảng và nhận giải của lớp." },
          ].map((f) => (
            <div key={f.title} className="p-6 rounded-2xl bg-card border border-border">
              <div className="size-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center mb-3">
                <f.icon className="size-5" />
              </div>
              <h3 className="font-bold text-lg">{f.title}</h3>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="py-8 text-center text-sm text-muted-foreground">
        © 2026 SmartEdu · Lý thuyết đồ thị
      </footer>
    </div>
  );
}
