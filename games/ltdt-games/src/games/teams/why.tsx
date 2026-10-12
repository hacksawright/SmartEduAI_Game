import type { Team, TeamsState } from "../../core/games/twoTeams";
import { components, type Graph, type VertexId } from "../../core/graph";
import { GraphBoard } from "../../ui/board/GraphBoard";
import { joinVi } from "../shared/graphUtil";
import type { WhyContent } from "../shared/Overlays";
import { TEAM_COLOR } from "./logic";

const CITE =
  "Giáo trình Chương 4 – Đồ thị hai phía: đồ thị là hai phía khi và chỉ khi không có chu trình độ dài lẻ; kiểm tra bằng BFS.";

const THEOREM = "Định lý: đồ thị là hai phía khi và chỉ khi nó không có chu trình nào có độ dài lẻ.";

export function teamsWhy(graph: Graph, st: TeamsState, cycle: VertexId[] | null): WhyContent {
  if (st.status === "proved" && cycle) {
    const k = cycle.length;
    // gán thử X, Y, X, … dọc vòng: đỉnh cuối và đỉnh đầu cùng là X, cạnh khép vòng bị trùng đội
    const along: Record<VertexId, Team> = {};
    cycle.forEach((v, i) => (along[v] = i % 2 === 0 ? "X" : "Y"));
    const last = cycle[k - 1];
    const first = cycle[0];
    const onCycle = (u: VertexId, v: VertexId) => {
      const i = cycle.indexOf(u);
      const j = cycle.indexOf(v);
      return i >= 0 && j >= 0 && (Math.abs(i - j) === 1 || Math.abs(i - j) === k - 1);
    };
    const clash = (u: VertexId, v: VertexId) => (u === last && v === first) || (u === first && v === last);
    return {
      title: `Không chia được: vòng ${cycle.join("–")}–${first} có ${k} cạnh, là số lẻ.`,
      lines: [
        `Đi quanh vòng, mỗi bước phải đổi đội: ${cycle.map((v) => `${v}:${along[v]}`).join(", ")}. Sau ${k} bước (lẻ) quay về ${first}, mà ${last} và ${first} lại cùng đội X: mâu thuẫn.`,
        THEOREM,
        "BFS phát hiện điều này khi gặp một cạnh nối hai đỉnh cùng đội (cùng tính chẵn lẻ của tầng). Chỉ cần một vòng lẻ là đủ để kết luận.",
      ],
      figure: (
        <GraphBoard
          graph={graph}
          label="Vòng lẻ, đội gán thử dọc vòng"
          radiusPx={17}
          allowTranspose={false}
          vertex={(id) => {
            const t = along[id];
            return t
              ? { fill: TEAM_COLOR[t].fill, textColor: TEAM_COLOR[t].text, badge: t, badgeColor: TEAM_COLOR[t] }
              : { state: "dim" };
          }}
          edge={(e) =>
            clash(e.u, e.v) ? { state: "error", label: "!" } : { state: onCycle(e.u, e.v) ? "result" : "dim", label: null }
          }
        />
      ),
      caption: "Gán thử X, Y xen kẽ dọc vòng: cạnh có dấu “!” nối hai đỉnh cùng đội.",
      cite: CITE,
    };
  }

  const of = (t: Team) => graph.vertices.filter((v) => st.team[v.id] === t).map((v) => v.id);
  const comps = components(graph).length;
  const lines = [
    "Đồ thị hai phía: tập đỉnh chia được thành hai nhóm sao cho mọi cạnh đều nối hai nhóm khác nhau.",
    THEOREM,
    "Cách kiểm tra: BFS từ một đỉnh, xếp đỉnh tầng chẵn vào một đội, tầng lẻ vào đội kia; nếu không cạnh nào nối hai đỉnh cùng đội thì chia được.",
    `Bạn đã chia: đội X gồm ${joinVi(of("X"))}; đội Y gồm ${joinVi(of("Y"))}.`,
  ];
  lines.push(
    comps > 1
      ? `Lớp có ${comps} nhóm không nối với nhau: mỗi nhóm chia riêng, và đổi đội cả một nhóm vẫn đúng, nên có ${2 ** (comps - 1)} cách chia (không tính đổi tên hai đội).`
      : "Đồ thị liên thông nên cách chia là duy nhất, nếu không tính việc đổi tên hai đội cho nhau.",
  );
  return {
    title: "Chia được: đây là đồ thị hai phía.",
    lines,
    figure: (
      <GraphBoard
        graph={graph}
        label="Cách chia hai đội của bạn"
        radiusPx={17}
        allowTranspose={false}
        vertex={(id) => {
          const t = st.team[id];
          return t ? { fill: TEAM_COLOR[t].fill, textColor: TEAM_COLOR[t].text, badge: t, badgeColor: TEAM_COLOR[t] } : {};
        }}
        edge={() => ({ state: "result", label: null })}
      />
    ),
    caption: "Huy hiệu X, Y là đội của từng bạn; mọi cạnh đều nối hai đội khác nhau.",
    cite: CITE,
  };
}
