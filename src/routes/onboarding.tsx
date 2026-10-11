import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Network, Sparkles } from "lucide-react";

export const Route = createFileRoute("/onboarding")({
  component: Onboarding,
});

function Onboarding() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (profile) {
      setFullName(profile.full_name ?? "");
    }
  }, [profile, loading]);

  const finish = async () => {
    if (!user) return;
    const name = fullName.trim();
    if (!name) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").update({
      full_name: name,
      onboarding_completed: true,
    }).eq("id", user.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    await refreshProfile();
    toast.success(`Chào ${name}! Bắt đầu học thôi 🚀`);
    router.navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="size-9 rounded-xl bg-gradient-primary flex items-center justify-center text-primary-foreground">
            <Network className="size-5" />
          </div>
          <div className="font-bold text-lg">SmartEdu</div>
        </div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
          className="bg-card rounded-2xl border border-border shadow-[var(--shadow-card)] p-8">
          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary-soft text-primary text-xs font-semibold mb-3">
            <Sparkles className="size-3" /> Chào mừng bạn
          </div>
          <h1 className="text-2xl font-bold">Bạn tên là gì?</h1>
          <p className="text-sm text-muted-foreground mt-1">Họ tên này sẽ hiện trên bảng xếp hạng tuần.</p>

          <div className="mt-6 space-y-1.5">
            <Label htmlFor="name">Họ và tên</Label>
            <Input
              id="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="VD: Nguyễn Văn An"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") finish(); }}
            />
          </div>

          <Button
            onClick={finish}
            disabled={busy || !fullName.trim()}
            className="w-full mt-6 bg-gradient-primary hover:opacity-90"
            size="lg"
          >
            {busy ? "Đang lưu..." : "Vào lớp 🚀"}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
