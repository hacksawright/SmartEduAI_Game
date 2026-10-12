// Khung "Tôi là thuật toán" (mục 4.1 kế hoạch): trước mỗi bước, SV dự đoán;
// engine kiểm tra rồi mới thực thi. Mỗi thuật toán cài một PredictionEngine.

export interface Progress {
  /** bước hiện tại, tính từ 1 */
  step: number;
  total: number;
}

export interface Verdict<A> {
  correct: boolean;
  /** đáp án chuẩn (khi có nhiều đáp án đúng: một trong số đó, ưu tiên chỉ số nhỏ) */
  expected: A;
  /** giải thích ngắn, hiện khi sai */
  explain: string;
}

export interface PredictionEngine<S, A> {
  init(): S;
  isDone(s: S): boolean;
  /** đáp án chuẩn cho câu hỏi hiện tại (null khi đã xong) */
  expected(s: S): A | null;
  check(s: S, a: A): Verdict<A>;
  /** thực thi một đáp án đúng; state là bất biến (trả về state mới) */
  apply(s: S, a: A): S;
  progress(s: S): Progress;
  /** gợi ý Socratic: mức 1 là câu hỏi dẫn dắt, mức 2 kèm vật chỉ dẫn trên đồ thị */
  hint(s: S, level: 1 | 2): Hint;
  /** tổng số câu hỏi của trace tham chiếu (dùng cho chế độ đua với máy) */
  referenceQuestionCount(): number;
}

export interface Hint {
  text: string;
  /** các đỉnh được tô sáng trên đồ thị (chỉ ở mức 2) */
  highlight?: string[];
}
