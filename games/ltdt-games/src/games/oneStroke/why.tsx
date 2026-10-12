import type { EulerAnalysis } from "../../core/algorithms/euler";
import type { OneStrokeState } from "../../core/games/oneStroke";
import { degrees, inOutDegrees, type Graph } from "../../core/graph";
import type { OneStrokeLevel } from "../../core/levels/types";
import { GraphBoard } from "../../ui/board/GraphBoard";
import { joinVi } from "../shared/graphUtil";
import type { WhyContent } from "../shared/Overlays";
import { River } from "./River";

const CITE = "Giáo trình Chương 3 – Đường đi và chu trình Euler (Định lý 3.3–3.5).";

export function oneStrokeWhy(level: OneStrokeLevel, graph: Graph, an: EulerAnalysis, st: OneStrokeState): WhyContent {
  const deg = degrees(graph);
  const io = inOutDegrees(graph);
  const dir = graph.directed;
  const odd = dir ? an.unbalanced : an.odd;
  const proved = st.status === "proved";
  const start = st.path[0];
  const end = st.path[st.path.length - 1];

  const figure = (
    <GraphBoard
      graph={graph}
      label={proved ? "Hình vừa chơi, tô các đỉnh làm bằng chứng" : "Nét vẽ của bạn"}
      radiusPx={17}
      allowTranspose={false}
      under={level.decor === "river" ? River : undefined}
      vertex={(id) => {
        const x = io.get(id)!;
        return {
          state: !proved && id === end ? "current" : "idle",
          ring: proved ? (odd.includes(id) ? "evidence" : undefined) : id === start ? "start" : undefined,
          badge: dir ? `${x.in}/${x.out}` : deg.get(id),
          badgeTone: odd.includes(id) ? "odd" : "degree",
        };
      }}
      edge={(e) => ({ state: !proved && st.used.includes(e.id) ? "drawn" : "idle", label: null })}
    />
  );

  const pass = dir
    ? "Mỗi lần đi qua một đỉnh, nét vẽ dùng 1 cung vào và 1 cung ra. Chỉ điểm đầu được dư 1 cung ra và điểm cuối dư 1 cung vào."
    : "Mỗi lần đi qua một đỉnh, nét vẽ dùng 2 cạnh: 1 để vào, 1 để ra. Chỉ điểm đầu và điểm cuối mới có thể dùng lẻ cạnh.";
  const theorem = dir
    ? "Đồ thị có hướng liên thông có chu trình Euler khi và chỉ khi mọi đỉnh có bán bậc vào bằng bán bậc ra; có đường đi Euler khi và chỉ khi đúng một đỉnh có ra = vào + 1, đúng một đỉnh có vào = ra + 1, các đỉnh khác cân bằng."
    : "Đồ thị liên thông có chu trình Euler khi và chỉ khi mọi đỉnh có bậc chẵn; có đường đi Euler (không khép kín) khi và chỉ khi có đúng 2 đỉnh bậc lẻ.";
  const lines = [pass, theorem];
  let title: string;

  if (!proved) {
    if (an.kind === "circuit") {
      title = dir
        ? "Mọi đỉnh có vào = ra nên vẽ được một nét khép kín."
        : "Mọi đỉnh đều bậc chẵn nên vẽ được một nét và quay về chỗ cũ.";
      lines.push(`Nét của bạn bắt đầu và kết thúc ở ${start}. Bắt đầu ở đỉnh khác cũng vẽ được.`);
    } else {
      title = dir
        ? "Một đỉnh dư cung ra, một đỉnh dư cung vào: đó là điểm đầu và điểm cuối."
        : "Có đúng 2 đỉnh bậc lẻ: nét vẽ đi từ đỉnh lẻ này tới đỉnh lẻ kia.";
      lines.push(
        `Nét của bạn đi từ ${start} tới ${end}, đúng như định lý: ${joinVi(odd)} là ${dir ? "hai đỉnh lệch vào/ra" : "hai đỉnh bậc lẻ"}.`,
      );
    }
  } else if (!an.connected && odd.length === 0) {
    title = "Các cạnh không nối liền nhau nên không thể vẽ một nét.";
    lines.push(
      "Dù mọi đỉnh đều cân bằng, bút không thể đi từ phần hình này sang phần kia mà không nhấc lên. Điều kiện liên thông quan trọng như điều kiện về bậc.",
    );
  } else {
    title = dir
      ? `Có ${odd.length} đỉnh lệch vào/ra nên không thể vẽ một nét.`
      : `Hình có ${odd.length} đỉnh bậc lẻ, nhiều hơn 2, nên không thể vẽ một nét.`;
    lines.push(`${dir ? "Các đỉnh lệch" : "Các đỉnh bậc lẻ"}: ${joinVi(odd)}.`);
  }
  if (level.decor === "river")
    lines.push("Đây chính là bài toán bảy cây cầu ở Königsberg mà Euler giải năm 1736: cả bốn vùng đất đều nối với số lẻ cây cầu.");

  return {
    title,
    lines,
    figure,
    caption: proved
      ? `Số trên đỉnh là ${dir ? "bán bậc vào/ra" : "bậc"}; số màu cam là đỉnh làm bằng chứng.`
      : `Vòng xanh: chỗ đặt bút; viền cam: chỗ kết thúc. Số trên đỉnh là ${dir ? "bán bậc vào/ra" : "bậc"}.`,
    cite: CITE,
  };
}
