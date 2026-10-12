import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import { useGames } from "../../app/GamesContext";

export function Toasts() {
  const { toasts, dismissToast } = useGames();
  return (
    <div className="lg-toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`lg-toast lg-toast--${t.tone}`}>
          {t.tone === "success" ? (
            <CircleCheck size={20} aria-hidden="true" />
          ) : t.tone === "error" ? (
            <CircleAlert size={20} aria-hidden="true" />
          ) : (
            <Info size={20} aria-hidden="true" />
          )}
          <span>{t.text}</span>
          <button type="button" className="lg-toast__close" onClick={() => dismissToast(t.id)} aria-label="Đóng thông báo">
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
