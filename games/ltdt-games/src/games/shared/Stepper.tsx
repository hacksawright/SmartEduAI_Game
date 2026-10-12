// Ô nhập số có nút − / + (vùng chạm 44px), gõ trực tiếp được, bàn phím số trên điện thoại.

import { Minus, Plus } from "lucide-react";
import { useId } from "react";

export function Stepper(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  /** Enter trong ô nhập */
  onEnter?: () => void;
  disabled?: boolean;
  unit?: string;
}) {
  const id = useId();
  const { value, min, max, disabled } = props;
  const set = (v: number) => {
    if (!Number.isFinite(v)) return;
    props.onChange(Math.max(min, Math.min(max, Math.round(v))));
  };
  return (
    <div className="lg-stepper">
      <label className="lg-stepper__label" htmlFor={id}>
        {props.label}
      </label>
      <div className="lg-stepper__row">
        <button
          type="button"
          className="lg-icon-btn lg-stepper__btn"
          aria-label={`Giảm ${props.label.toLowerCase()}`}
          onClick={() => set(value - 1)}
          disabled={disabled || value <= min}
        >
          <Minus size={20} aria-hidden="true" />
        </button>
        <input
          id={id}
          className="lg-stepper__input lg-mono"
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={value}
          disabled={disabled}
          onChange={(e) => set(parseInt(e.target.value, 10))}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              props.onEnter?.();
            }
          }}
        />
        <button
          type="button"
          className="lg-icon-btn lg-stepper__btn"
          aria-label={`Tăng ${props.label.toLowerCase()}`}
          onClick={() => set(value + 1)}
          disabled={disabled || value >= max}
        >
          <Plus size={20} aria-hidden="true" />
        </button>
        {props.unit && <span className="lg-stepper__unit">{props.unit}</span>}
      </div>
    </div>
  );
}
