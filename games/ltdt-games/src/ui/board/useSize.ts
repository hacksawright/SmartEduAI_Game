import { useLayoutEffect, useRef, useState } from "react";

/** Kích thước nội dung của một phần tử, cập nhật bằng ResizeObserver. */
export function useSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // So đúng từng giá trị: bỏ qua thay đổi nhỏ (trước đây < 0.5 px) thì lần đo đầu lúc bố cục chưa chốt
    // (ví dụ màn chơi vừa tải xong chunk) bị giữ mãi. Nội dung không làm khung đổi cỡ (SVG đặt tuyệt đối) nên không lặp.
    const read = () => {
      const r = el.getBoundingClientRect();
      setSize((s) => (s.w === r.width && s.h === r.height ? s : { w: r.width, h: r.height }));
    };
    read();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", read);
      return () => window.removeEventListener("resize", read);
    }
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return { ref, size };
}
