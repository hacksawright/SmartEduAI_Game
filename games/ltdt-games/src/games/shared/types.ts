import type { Level } from "../../core/levels/types";

export interface GameProps<L extends Level = Level> {
  level: L;
  /** id dùng cho tiến độ/sự kiện, có thể có hậu tố -race */
  levelId: string;
  race: boolean;
  onRestart: () => void;
}

/** Bộ đếm hiệu ứng: tăng số để chạy lại animation của đỉnh/cạnh. */
export interface Fx {
  pops: Record<string, number>;
  shakes: Record<string, number>;
  flows: Record<string, { n: number; from: string }>;
  draws: Record<string, { n: number; from: string }>;
}

export const emptyFx = (): Fx => ({ pops: {}, shakes: {}, flows: {}, draws: {} });

export function bumpFx(
  f: Fx,
  m: { pops?: string[]; shakes?: string[]; flows?: [string, string][]; draws?: [string, string][] },
): Fx {
  const pops = { ...f.pops };
  const shakes = { ...f.shakes };
  const flows = { ...f.flows };
  const draws = { ...f.draws };
  for (const v of m.pops ?? []) pops[v] = (pops[v] ?? 0) + 1;
  for (const v of m.shakes ?? []) shakes[v] = (shakes[v] ?? 0) + 1;
  for (const [e, from] of m.flows ?? []) flows[e] = { n: (flows[e]?.n ?? 0) + 1, from };
  for (const [e, from] of m.draws ?? []) draws[e] = { n: (draws[e]?.n ?? 0) + 1, from };
  return { pops, shakes, flows, draws };
}
