import { Heart, Star } from "lucide-react";

/** Mạng còn lại. Tim vừa mất chạy hiệu ứng vỡ (key đổi khi trạng thái đổi). */
export function Hearts({ lives, max = 3 }: { lives: number; max?: number }) {
  return (
    <div className="lg-hearts" role="img" aria-label={`Còn ${lives} trên ${max} mạng`}>
      {Array.from({ length: max }, (_, i) => {
        const on = i < lives;
        return (
          <span key={`${i}-${on}`} className={`lg-heart ${on ? "lg-heart--on" : "lg-heart--off"}`}>
            <Heart size={20} strokeWidth={2.2} fill={on ? "currentColor" : "none"} aria-hidden="true" />
          </span>
        );
      })}
    </div>
  );
}

/** Số sao dự kiến trên thanh trên. */
export function StarMeter({ stars, max = 3, label }: { stars: number; max?: number; label?: string }) {
  return (
    <div className="lg-starmeter" role="img" aria-label={label ?? `Dự kiến ${stars} trên ${max} sao`}>
      {Array.from({ length: max }, (_, i) => {
        const on = i < stars;
        return (
          <span key={`${i}-${on}`} className={`lg-star ${on ? "lg-star--on" : "lg-star--off"}`}>
            <Star size={20} strokeWidth={2.2} fill={on ? "currentColor" : "none"} aria-hidden="true" />
          </span>
        );
      })}
    </div>
  );
}

/** Sao trên trang chọn màn (nhỏ, tĩnh). */
export function StarsSmall({ stars, max = 3 }: { stars: number; max?: number }) {
  return (
    <span className="lg-stars-sm" role="img" aria-label={`${stars} trên ${max} sao`}>
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          size={16}
          strokeWidth={2.2}
          className={i < stars ? "lg-stars-sm__on" : "lg-stars-sm__off"}
          fill={i < stars ? "currentColor" : "none"}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}
