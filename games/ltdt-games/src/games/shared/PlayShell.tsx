// Khung màn chơi (docs/ART_DIRECTION.md mục 6): thanh trên, bàn cờ, panel phải (bottom sheet
// trên màn hẹp), thanh điều khiển.

import { ArrowLeft, Bot, ChevronDown, ChevronUp, Lightbulb, Volume2, VolumeX } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { useGames } from "../../app/GamesContext";
import type { Level } from "../../core/levels/types";
import { Hearts, StarMeter } from "../../ui/components/Meters";
import { levelCrumb } from "./labels";

export interface PlayShellProps {
  level: Level;
  race: boolean;
  /** bỏ trống: game không dùng mạng */
  lives?: number;
  stars: number;
  starsLabel?: string;
  canHint: boolean;
  onHint: () => void;
  hintLabel?: string;
  board: ReactNode;
  /** lớp thêm cho khung bàn chơi (ví dụ nền bản đồ Thành phố bùn) */
  stageClass?: string;
  /** chip nổi trên góc bàn cờ */
  boardTop?: ReactNode;
  /** câu hỏi + phản hồi: luôn hiện (kể cả bottom sheet thu gọn) */
  prompt: ReactNode;
  /** chi tiết: hàng đợi, mã giả, bảng nhãn… */
  details?: ReactNode;
  detailsLabel?: string;
  /** mở rộng bottom sheet (ví dụ bước nhập bảng nhãn của Dijkstra) */
  sheetOpen?: boolean;
  /** bottom sheet thu gọn cao hơn mặc định: khi phần nhập chính nằm trong panel (ma trận để điền) */
  tallSheet?: boolean;
  footer: { left?: ReactNode; center?: ReactNode; right?: ReactNode };
  /** thông báo cho trình đọc màn hình */
  live?: string;
  children?: ReactNode;
}

export function PlayShell(p: PlayShellProps) {
  const { navigate, settings, updateSettings, play } = useGames();
  const [open, setOpen] = useState(false);
  const sheetOpen = p.sheetOpen || open;
  const detailsId = useId();

  return (
    <div
      className={`lg-play${sheetOpen ? " lg-play--sheet-open" : ""}${p.tallSheet ? " lg-play--sheet-tall" : ""}${p.race ? " lg-play--race" : ""}`}
    >
      <header className="lg-topbar">
        <button
          type="button"
          className="lg-icon-btn"
          onClick={() => {
            play("close");
            navigate({ name: "game", gameId: p.level.game });
          }}
          aria-label="Về danh sách màn"
        >
          <ArrowLeft size={22} aria-hidden="true" />
        </button>
        <div className="lg-topbar__title">
          <span className="lg-topbar__crumb">
            {levelCrumb(p.level)}
            {p.race && (
              <span className="lg-chip lg-chip--accent lg-topbar__race">
                <Bot size={14} aria-hidden="true" /> Đua với máy
              </span>
            )}
          </span>
          <h1 className="lg-topbar__name">{p.level.title}</h1>
        </div>
        <div className="lg-topbar__meters">
          {p.lives !== undefined && <Hearts lives={p.lives} />}
          <StarMeter stars={p.stars} label={p.starsLabel} />
        </div>
        <div className="lg-topbar__actions">
          <button
            type="button"
            className="lg-btn lg-btn--sm lg-hint-btn"
            onClick={p.onHint}
            disabled={!p.canHint}
            aria-label={p.hintLabel ?? "Gợi ý (trừ 1 sao)"}
          >
            <Lightbulb size={18} aria-hidden="true" />
            <span className="lg-hint-btn__text">Gợi ý</span>
          </button>
          <button
            type="button"
            className="lg-icon-btn"
            onClick={() => updateSettings({ sound: !settings.sound })}
            aria-label={settings.sound ? "Tắt âm thanh" : "Bật âm thanh"}
            aria-pressed={!settings.sound}
          >
            {settings.sound ? <Volume2 size={22} aria-hidden="true" /> : <VolumeX size={22} aria-hidden="true" />}
          </button>
        </div>
      </header>

      <div className="lg-play__main">
        <section className={`lg-play__stage${p.stageClass ? ` ${p.stageClass}` : ""}`} aria-label="Bàn chơi">
          {p.boardTop && <div className="lg-play__boardtop">{p.boardTop}</div>}
          {p.board}
        </section>
        <aside className="lg-play__panel" aria-label="Bảng điều khiển">
          <div className="lg-play__prompt">{p.prompt}</div>
          {p.details && (
            <>
              <button
                type="button"
                className="lg-play__sheet-toggle"
                aria-expanded={sheetOpen}
                aria-controls={detailsId}
                onClick={() => setOpen((o) => !o)}
              >
                {sheetOpen ? <ChevronDown size={18} aria-hidden="true" /> : <ChevronUp size={18} aria-hidden="true" />}
                {sheetOpen ? "Thu gọn" : (p.detailsLabel ?? "Xem chi tiết")}
              </button>
              <div className="lg-play__details" id={detailsId}>
                {p.details}
              </div>
            </>
          )}
        </aside>
      </div>

      <footer className="lg-controls">
        <div className="lg-controls__left">{p.footer.left}</div>
        <div className="lg-controls__center">{p.footer.center}</div>
        <div className="lg-controls__right">{p.footer.right}</div>
      </footer>

      <div className="lg-sr-only" role="status" aria-live="polite">
        {p.live}
      </div>
      {p.children}
    </div>
  );
}
