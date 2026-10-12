import { useEffect, useRef, useState } from "react";
import { Gamepad2, RotateCcw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  attachLtdtStylesheet,
  loadLtdtGames,
  ltdtConfig,
  type LtdtGamesApp,
} from "./ltdt-loader";

type Status = "loading" | "ready" | "error";

/**
 * Vùng chứa module Trò chơi. Game chạy trong cây React riêng của bundle ltdt-games.js,
 * gắn vào thẻ div bên dưới; component này chỉ lo tải, gắn, gỡ và báo lỗi.
 */
export function LtdtGamesHost({ userId, initialRoute }: { userId: string; initialRoute: string }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    let cancelled = false;
    let app: LtdtGamesApp | null = null;
    const css = attachLtdtStylesheet();
    setStatus("loading");

    Promise.all([loadLtdtGames(), css.ready])
      .then(([mod]) => {
        if (cancelled) return;
        app = mod.mountLtdtGames(el, ltdtConfig(userId, initialRoute));
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.warn("[Trò chơi] Không tải được module", error);
        css.release();
        setStatus("error");
      });

    return () => {
      cancelled = true;
      // gỡ cây React của game; nếu đang chơi dở, game tự ghi nhận "bỏ dở màn"
      app?.unmount();
      css.release();
    };
  }, [userId, initialRoute, attempt]);

  return (
    <div className="se-games" data-status={status}>
      {status === "loading" && (
        <div
          role="status"
          className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4 text-center"
        >
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <Gamepad2 className="size-7 motion-safe:animate-pulse" aria-hidden />
          </div>
          <p className="font-semibold">Đang mở Trò chơi đồ thị…</p>
        </div>
      )}

      {status === "error" && (
        <div className="flex min-h-[60vh] items-center justify-center px-4">
          <div
            role="alert"
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-[var(--shadow-card)]"
          >
            <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-[color:var(--danger-soft)] text-[color:var(--danger-strong)]">
              <TriangleAlert className="size-6" aria-hidden />
            </div>
            <h1 className="mt-4 text-xl font-bold">Chưa mở được Trò chơi</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Kiểm tra kết nối mạng rồi thử lại. Phần Luyện tập và Xếp hạng vẫn dùng bình thường.
            </p>
            <Button className="mt-5 min-h-11 gap-2" onClick={() => setAttempt((n) => n + 1)}>
              <RotateCcw className="size-4" aria-hidden /> Thử lại
            </Button>
          </div>
        </div>
      )}

      {/* React của SmartEdu không render gì vào thẻ này: game tự quản lý nội dung bên trong */}
      <div ref={mountRef} hidden={status !== "ready"} />
    </div>
  );
}
