// Sao và điểm của một màn (GDD mục 2.2–2.3). Dùng chung cho client và server.

export type Stars = 1 | 2 | 3;

export interface Outcome {
  stars: Stars;
  /** 100–1000: hoàn thành màn luôn có ít nhất 100 điểm */
  score: number;
}

const clampStars = (n: number): Stars => Math.max(1, Math.min(3, n)) as Stars;
const clampScore = (n: number) => Math.max(100, Math.min(1000, Math.round(n)));

/** Mỗi lần dùng gợi ý trừ đúng 1 sao, không xuống dưới 1. */
export const applyHints = (base: number, hints: number): Stars => clampStars(base - hints);

/** Tôi là thuật toán (BFS/DFS/Dijkstra): 0 lỗi → 3, 1 lỗi → 2, 2 lỗi → 1. */
export function algoOutcome(m: { questions: number; mistakes: number; hints: number }): Outcome {
  const base = 3 - m.mistakes;
  const correct = Math.max(0, m.questions - m.mistakes);
  return {
    stars: applyHints(base, m.hints),
    score: clampScore((1000 * correct) / Math.max(1, m.questions) - 100 * m.hints),
  };
}

/** Một nét vẽ: 0 lỗi → 3, 1–2 lỗi → 2, ≥ 3 lỗi → 1. */
export function oneStrokeOutcome(m: { mistakes: number; hints: number }): Outcome {
  const base = m.mistakes === 0 ? 3 : m.mistakes <= 2 ? 2 : 1;
  return { stars: applyHints(base, m.hints), score: clampScore(1000 - 150 * m.mistakes - 100 * m.hints) };
}

/** Thành phố bùn: bằng tối ưu → 3, chênh ≤ 10% → 2, cây khung hợp lệ → 1 (mục 4.3 kế hoạch). */
export function muddyOutcome(m: { cost: number; optimal: number; hints: number }): Outcome {
  const base = m.cost <= m.optimal ? 3 : m.cost <= m.optimal * 1.1 + 1e-9 ? 2 : 1;
  return {
    stars: applyHints(base, m.hints),
    score: clampScore((1000 * m.optimal) / Math.max(1, m.cost) - 100 * m.hints),
  };
}

/** Xếp thứ tự cho Greedy: đạt χ ở lần chạy đầu → 3, trong ≤ 3 lần → 2, còn lại → 1. */
export function greedyOutcome(m: { runs: number; hints: number }): Outcome {
  const base = m.runs <= 1 ? 3 : m.runs <= 3 ? 2 : 1;
  return { stars: applyHints(base, m.hints), score: clampScore(1000 - 150 * (m.runs - 1) - 100 * m.hints) };
}

/** Dịch ma trận: đúng ở lần kiểm tra đầu và kịp giờ → 3, đúng trong ≤ 2 lần → 2, còn lại → 1. */
export function matrixOutcome(m: { checks: number; overParSeconds: number; hints: number }): Outcome {
  const wrong = m.checks - 1;
  const base = m.checks === 1 && m.overParSeconds <= 0 ? 3 : m.checks <= 2 ? 2 : 1;
  return {
    stars: applyHints(base, m.hints),
    score: clampScore(1000 - 150 * wrong - 100 * m.hints - 5 * Math.max(0, m.overParSeconds)),
  };
}

/** Số sao dự kiến hiển thị trên thanh trên trong lúc chơi. */
export function projectedStars(base: number, hints: number): Stars {
  return applyHints(base, hints);
}
