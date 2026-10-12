import { ArrowLeft, RotateCcw } from "lucide-react";
import { useId, useState } from "react";
import { useGames } from "../app/GamesContext";
import type { Settings } from "../services/settings";
import { Modal } from "../ui/components/Modal";

export function SettingsScreen() {
  const g = useGames();
  const s = g.settings;
  const [confirm, setConfirm] = useState(false);
  const volId = useId();
  const dlgId = useId();

  const motionOptions: { v: Settings["motion"]; label: string }[] = [
    { v: "system", label: "Theo hệ điều hành" },
    { v: "reduced", label: "Giảm chuyển động" },
    { v: "full", label: "Đầy đủ" },
  ];

  return (
    <div className="lg-page lg-settings">
      <header className="lg-hub__head">
        <button type="button" className="lg-icon-btn" onClick={() => g.navigate({ name: "home" })} aria-label="Về sảnh game">
          <ArrowLeft size={22} aria-hidden="true" />
        </button>
        <div>
          <p className="lg-hub__kicker">Sảnh game</p>
          <h1 className="lg-hub__title">Cài đặt</h1>
        </div>
      </header>

      <section className="lg-card lg-settings__group" aria-labelledby="set-sound">
        <h2 id="set-sound">Âm thanh</h2>
        <label className="lg-switch">
          <input type="checkbox" checked={s.sound} onChange={(e) => g.updateSettings({ sound: e.target.checked })} />
          <span className="lg-switch__track" aria-hidden="true" />
          <span>Bật âm thanh</span>
        </label>
        <div className="lg-settings__row">
          <label htmlFor={volId}>Âm lượng</label>
          <input
            id={volId}
            type="range"
            min={0}
            max={100}
            step={5}
            value={Math.round(s.volume * 100)}
            disabled={!s.sound}
            onChange={(e) => g.updateSettings({ volume: Number(e.target.value) / 100 })}
            onPointerUp={() => g.play("tick")}
            className="lg-range"
          />
          <span className="lg-mono">{Math.round(s.volume * 100)}%</span>
        </div>
      </section>

      <section className="lg-card lg-settings__group" aria-labelledby="set-motion">
        <h2 id="set-motion">Chuyển động</h2>
        <div className="lg-seg" role="radiogroup" aria-labelledby="set-motion">
          {motionOptions.map((o) => (
            <label key={o.v} className={`lg-seg__opt${s.motion === o.v ? " lg-seg__opt--on" : ""}`}>
              <input
                type="radio"
                name="motion"
                value={o.v}
                checked={s.motion === o.v}
                onChange={() => g.updateSettings({ motion: o.v })}
              />
              {o.label}
            </label>
          ))}
        </div>
        <p className="lg-muted lg-settings__note">
          Giảm chuyển động tắt hiệu ứng nảy, rung, vòng sáng tỏa và pháo giấy. Hiện đang:{" "}
          <strong>{g.reducedMotion ? "giảm" : "đầy đủ"}</strong>.
        </p>
      </section>

      <section className="lg-card lg-settings__group" aria-labelledby="set-play">
        <h2 id="set-play">Khi chơi</h2>
        <label className="lg-switch">
          <input
            type="checkbox"
            checked={s.pseudocode}
            onChange={(e) => g.updateSettings({ pseudocode: e.target.checked })}
          />
          <span className="lg-switch__track" aria-hidden="true" />
          <span>Hiện mã giả trong Tôi là thuật toán</span>
        </label>
      </section>

      <section className="lg-card lg-settings__group" aria-labelledby="set-data">
        <h2 id="set-data">Dữ liệu</h2>
        <p className="lg-muted">
          Tiến độ lưu trên trình duyệt này theo tài khoản <span className="lg-mono">{g.config.userId}</span>. Điểm thưởng đã cộng
          vào hệ thống SmartEduAI không bị xóa
          {g.config.apiBase ? "; sao và điểm đã ghi trên server được tải lại ở lần mở sau." : "."}
        </p>
        <button type="button" className="lg-btn lg-btn--danger" onClick={() => setConfirm(true)}>
          <RotateCcw size={18} aria-hidden="true" /> Xóa tiến độ trên máy này
        </button>
      </section>

      <section className="lg-card lg-settings__group" aria-labelledby="set-credits">
        <h2 id="set-credits">Ghi công</h2>
        <p className="lg-muted lg-settings__note">
          Hình nhà, cây, người dân và âm thanh: Kenney.nl (CC0). Phông chữ Baloo 2, Be Vietnam Pro và JetBrains Mono (SIL OFL
          1.1). Biểu tượng: Lucide (ISC).
        </p>
      </section>

      <Modal open={confirm} labelledBy={dlgId} onClose={() => setConfirm(false)} className="lg-confirm">
        <h2 id={dlgId}>Xóa tiến độ?</h2>
        <p>
          Sao, kỷ lục và huy hiệu lưu trên trình duyệt này sẽ bị xóa.
          {g.config.apiBase ? " Sao và điểm đã ghi trên server vẫn còn và được tải lại ở lần mở sau." : " Không thể hoàn tác."}
        </p>
        <div className="lg-confirm__actions">
          <button
            type="button"
            className="lg-btn lg-btn--danger"
            onClick={() => {
              g.resetProgress();
              setConfirm(false);
              g.toast("Đã xóa tiến độ trên máy này.", "info");
            }}
          >
            Xóa tiến độ
          </button>
          <button type="button" className="lg-btn" onClick={() => setConfirm(false)} data-autofocus>
            Giữ lại
          </button>
        </div>
      </Modal>
    </div>
  );
}
