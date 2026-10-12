import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/** Hộp thoại có giữ focus bên trong, Esc để đóng (nếu cho phép), trả focus khi đóng. */
export function Modal(props: {
  open: boolean;
  labelledBy: string;
  describedBy?: string;
  onClose?: () => void;
  className?: string;
  /** "center": giữa màn hình; "sheet": trượt từ dưới lên trên màn hẹp */
  variant?: "center" | "sheet";
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!props.open) return;
    const prev = document.activeElement as HTMLElement | null;
    const el = ref.current;
    const target = el?.querySelector<HTMLElement>("[data-autofocus]") ?? el?.querySelector<HTMLElement>(FOCUSABLE);
    // chờ một khung hình để animation mở không làm mất focus
    const id = requestAnimationFrame(() => (target ?? el)?.focus({ preventScroll: true }));
    return () => {
      cancelAnimationFrame(id);
      if (prev && document.contains(prev)) prev.focus({ preventScroll: true });
    };
  }, [props.open]);

  if (!props.open) return null;

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape" && props.onClose) {
      e.stopPropagation();
      props.onClose();
      return;
    }
    if (e.key !== "Tab" || !ref.current) return;
    const items = [...ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((x) => x.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div className={`lg-modal lg-modal--${props.variant ?? "center"}`} onKeyDown={onKeyDown}>
      <div className="lg-modal__scrim" onClick={props.onClose} aria-hidden="true" />
      <div
        ref={ref}
        className={`lg-modal__card${props.className ? ` ${props.className}` : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={props.labelledBy}
        aria-describedby={props.describedBy}
        tabIndex={-1}
      >
        {props.children}
      </div>
    </div>
  );
}
