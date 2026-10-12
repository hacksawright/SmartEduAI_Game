import type { BoardCtx } from "../../ui/board/GraphBoard";

/** Sông Pregel cho màn Bảy cây cầu: tọa độ logic theo hình của màn (đảo ở 2, vùng đông ở 4). */
export function River({ layout }: BoardCtx) {
  const vb = layout.viewBox;
  const x0 = vb.x - 40;
  const x1 = vb.x + vb.w + 40;
  // sóng nhỏ rải dọc hai nhánh
  const waves = [300, 420, 600, 760].flatMap((x) => [`M ${x} 152 q 9 -7 18 0 t 18 0`, `M ${x + 40} 348 q 9 -7 18 0 t 18 0`]);
  const d = [
    `M ${x0} 250 L 170 250`,
    `M 170 250 C 210 250, 215 160, 270 160 L ${x1} 160`,
    `M 170 250 C 210 250, 215 340, 270 340 L ${x1} 340`,
    "M 490 160 L 490 340",
  ].join(" ");
  return (
    <g className="lg-river" aria-hidden="true">
      <path className="lg-river__bank" d={d} />
      <path className="lg-river__water" d={d} />
      <path className="lg-river__wave" d={waves.join(" ")} />
    </g>
  );
}
