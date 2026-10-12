import { ArrowLeft, Award, Lock } from "lucide-react";
import { useGames } from "../app/GamesContext";
import { BADGES, badgeTitle } from "../services/badges";

export function BadgesScreen() {
  const g = useGames();
  const earned = BADGES.filter((b) => g.progress.badges[b.id]).length;
  return (
    <div className="lg-page lg-badges">
      <header className="lg-hub__head">
        <button type="button" className="lg-icon-btn" onClick={() => g.navigate({ name: "home" })} aria-label="Về sảnh game">
          <ArrowLeft size={22} aria-hidden="true" />
        </button>
        <div>
          <p className="lg-hub__kicker">Thành tích</p>
          <h1 className="lg-hub__title">Huy hiệu</h1>
          <p className="lg-hub__blurb">
            Đã nhận <span className="lg-mono">{earned}</span>/<span className="lg-mono">{BADGES.length}</span> huy hiệu ·{" "}
            <span className="lg-mono">{g.progress.points}</span> điểm thưởng
          </p>
        </div>
      </header>
      <ul className="lg-badge-grid">
        {BADGES.map((b) => {
          const at = g.progress.badges[b.id];
          const { have, need } = b.progress(g.progress);
          const pct = Math.round((Math.min(have, need) / Math.max(1, need)) * 100);
          return (
            <li key={b.id} className={`lg-badge ${at ? "lg-badge--on lg-clay" : "lg-badge--off lg-card"}`}>
              <span className="lg-badge__icon" aria-hidden="true">
                {at ? <Award size={28} /> : <Lock size={22} />}
              </span>
              <div className="lg-badge__body">
                <h2 className="lg-badge__title">{badgeTitle(b)}</h2>
                <p className="lg-badge__desc">{b.desc}</p>
                <div className="lg-badge__prog">
                  <span className="lg-progress" aria-hidden="true">
                    <span style={{ width: `${pct}%` }} />
                  </span>
                  <span className="lg-mono lg-badge__count">
                    {Math.min(have, need)}/{need}
                  </span>
                </div>
                {at && <p className="lg-badge__date">Nhận ngày {new Date(at).toLocaleDateString("vi-VN")}</p>}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
