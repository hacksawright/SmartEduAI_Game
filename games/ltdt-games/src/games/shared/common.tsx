// Mảnh giao diện dùng chung cho các game dạng dự đoán (BFS/DFS, Dijkstra).

import { Bot } from "lucide-react";
import { fmtTime } from "./graphUtil";
import type { LevelSession } from "./session";

/** Dòng giải thích luật đua trong thẻ giới thiệu. */
export function RaceIntro({ total, seconds }: { total: number; seconds: number }) {
  return (
    <p className="lg-intro__race">
      <Bot size={20} aria-hidden="true" />
      <span>
        <strong>Đua với máy:</strong> máy trả lời 1 câu mỗi {seconds} giây, tổng {total} câu. Trả lời xong trước máy và còn
        mạng thì thắng.
      </span>
    </p>
  );
}

/** "1 lỗi · 0 gợi ý · 0:42" dưới điểm ở thẻ kết quả. */
export function summaryOf(mistakes: number, session: LevelSession): string {
  return `${mistakes} lỗi · ${session.hints} gợi ý · ${fmtTime(session.elapsedMs())}`;
}
