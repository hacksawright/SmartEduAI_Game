# Tích hợp vào SmartEduAI

> Dành cho nhóm phát triển website SmartEduAI: người nhúng game vào trang (frontend), người làm API điểm (TV1) và chatbot (TV5), người giữ mã thuật toán (TV3, TV4).
> Mọi hàm, kiểu dữ liệu và file nhắc tới ở đây đều có trong mã nguồn. Khi tài liệu và mã lệch nhau, mã là chuẩn; `server/mock-api.ts` là bản chạy được của hợp đồng API ở mục 4.

## 1. Tổng quan

Game là một ứng dụng web tĩnh, không cần server riêng. Hai thứ bên ngoài đều tùy chọn: API điểm của TV1 và chatbot Socratic của TV5. Thiếu thứ nào thì game tự chạy bản thay thế (chấm và cộng điểm ngay trong trình duyệt; gợi ý tĩnh).

| Cách đưa vào website | Khi nào dùng | Bản build |
|---|---|---|
| **Nhúng module** (khuyến nghị) | Muốn truyền token, nhận sự kiện, giữ URL của trang chủ | `npm run build:embed` → `dist-embed/` |
| **iframe** | CSS của trang chủ quá mạnh (mục 2.6), hoặc muốn tách hẳn | `npm run build` → `dist/` |

## 2. Nhúng module

### 2.1 Build và đặt file

```bash
npm run build:embed
```

| File trong `dist-embed/` | Nội dung |
|---|---|
| `ltdt-games.js` | ES module, đã gồm React 19, sảnh và các trang chung (khoảng 236 kB, gzip 73 kB) |
| `ltdt-games.css` | toàn bộ CSS (khoảng 61 kB, gzip 12 kB) |
| `assets/` | các chunk JS: khung màn chơi dùng chung và giao diện của từng game, chỉ tải khi mở màn (tổng khoảng 284 kB, gzip 104 kB); font woff2 (subset latin và vietnamese; trình duyệt chỉ tải file cần dùng); âm thanh; hình Thành phố bùn; license |

Chép nguyên thư mục lên phần static của website, ví dụ `/static/ltdt-games/`. Giữ `assets/` nằm cạnh `ltdt-games.js`: game tìm asset và các chunk JS theo đường dẫn của chính file JS (`import.meta.url`), nên không cần cấu hình thêm.

### 2.2 Gắn vào trang

```html
<link rel="stylesheet" href="/static/ltdt-games/ltdt-games.css" />
<div id="games"></div>
<script type="module">
  import { mountLtdtGames } from "/static/ltdt-games/ltdt-games.js";

  const app = mountLtdtGames(document.getElementById("games"), {
    userId: currentUser.id,
    courseId: "LTDT",
    apiBase: "/api/v1",
    hintEndpoint: "/api/chatbot/hint",
    hashRouting: false,
    authToken: () => auth.getAccessToken(),
    onEvent: (name, payload) => {
      if (name === "learning_event") refreshHeaderPoints();
    },
  });

  // SPA rời trang chứa game:
  // app.unmount();
</script>
```

`mountLtdtGames(el, config)` trả về `{ unmount() }`. Khi SPA chuyển sang trang khác, gọi `unmount()`: React gỡ toàn bộ cây giao diện, và nếu sinh viên đang chơi dở thì sự kiện `game_level_abandoned` được gửi. Config chỉ được đọc lúc mount; muốn đổi (ví dụ đổi tài khoản) thì `unmount()` rồi mount lại.

Module còn export `verifySubmission` (mục 4.4) và hai kiểu TypeScript `GamesConfig`, `LearningEvent`.

### 2.3 `GamesConfig`

| Trường | Kiểu | Mặc định | Ý nghĩa |
|---|---|---|---|
| `userId` | `string` | bắt buộc | id sinh viên; là `user_id` trong mọi sự kiện và là một phần khóa localStorage |
| `courseId` | `string` | bắt buộc | ví dụ `"LTDT"`; là `course_id` trong mọi sự kiện |
| `apiBase` | `string` | không có: chấm và cộng điểm trong trình duyệt (`LocalPointsClient`) | gốc API điểm của TV1, ví dụ `"/api/v1"` (mục 4) |
| `hintEndpoint` | `string` | không có: gợi ý tĩnh | endpoint chatbot Socratic của TV5 (mục 5) |
| `assetBase` | `string` | thư mục `assets/` cạnh `ltdt-games.js` | thư mục asset, kết thúc bằng `/` |
| `unlockAll` | `boolean` | `false` | mở mọi màn (giảng viên, kiểm thử) |
| `hashRouting` | `boolean` | `true` | xem mục 2.5 |
| `initialRoute` | `string` | `"#/"` | màn hình đầu tiên khi `hashRouting: false` |
| `authToken` | `() => string \| Promise<string>` | không có | được gọi trước **mỗi** request (token làm mới được); kết quả đặt vào `Authorization: Bearer …` của mọi request tới `apiBase` và `hintEndpoint`, trừ `sendBeacon` (mục 4.3) |
| `onEvent` | `(name, payload) => void` | không có | nhận mọi sự kiện (mục 6) |

### 2.4 Chiều cao vùng chơi

Màn chơi cao đúng bằng biến CSS `--lg-play-h`, mặc định `100dvh`. Trang có header cố định thì trừ phần đó ra:

```css
#games {
  --lg-play-h: calc(100dvh - 56px);
}
```

Sảnh, trang chương, huy hiệu và cài đặt cao theo nội dung.

### 2.5 Định tuyến

- `hashRouting: true` (mặc định, dùng khi chạy riêng): route nằm trên hash của URL (`#/game/dijkstra`), nút Back của trình duyệt dùng được.
- `hashRouting: false` (nên dùng khi nhúng): route giữ trong bộ nhớ; game không đọc và không ghi URL của trang chủ. `initialRoute` chọn màn hình mở đầu.

| Route | Màn hình |
|---|---|
| `#/` | sảnh game |
| `#/game/<gameId>` | trang của một game (danh sách màn) |
| `#/play/<levelId>` | màn chơi; thêm hậu tố `-race` cho chế độ Đua với máy |
| `#/badges` | huy hiệu |
| `#/settings` | cài đặt |

`gameId` là một trong `matrix_translate`, `traversal`, `one_stroke`, `untangle`, `two_teams`, `greedy_order`, `dijkstra`, `muddy_city`, `max_flow`. Danh sách `levelId` nằm trong `GDD.md` (mục 3–11) và `src/core/levels/`. Route không hợp lệ đưa về sảnh; màn chưa mở hiện "Màn này chưa mở".

### 2.6 Cách ly CSS

- Mọi selector của game bắt đầu bằng một class `.lg-*` và mọi thứ nằm trong `.lg-root`. Game không đặt style cho `html`, `body`, `:root` hay thẻ trần bên ngoài vùng của mình. Riêng các khai báo `@font-face` (Baloo 2, Be Vietnam Pro, JetBrains Mono) có hiệu lực cho cả trang, như mọi `@font-face`.
- `src/ui/base.css` trả lại giá trị mặc định cho các thẻ hay bị CSS toàn cục đè (tiêu đề, đoạn văn, danh sách, `label`, `svg`, `img`, nút, ô nhập). Các luật này viết bằng `:where()` nên độ ưu tiên chỉ bằng một class, và mọi class của game vẫn thắng.
- Đã kiểm tra bằng `tests/e2e/embed.spec.ts`: bật CSS kiểu Bootstrap reboot + Tailwind preflight trên trang giả lập, so 14 màn hình ở 1440 px và 375 px, không lệch thuộc tính hiển thị nào.
- **Giới hạn:** CSS của trang chủ nhắm vào thẻ bên trong game bằng selector mạnh hơn một class (theo id, nhiều class lồng nhau) hoặc dùng `!important` vẫn có thể lọt vào. Gặp trường hợp đó thì dùng iframe (mục 3).
- Muốn khớp design system của website: ghi đè biến màu trong `src/ui/tokens.css` (xem `ART_DIRECTION.md`).

## 3. Dùng iframe

```html
<iframe
  src="/static/ltdt-games-app/index.html?user=sv001&api=/api/v1"
  title="Game Lý thuyết đồ thị"
  style="width: 100%; height: 100dvh; border: 0"
></iframe>
```

- Bản `npm run build` (thư mục `dist/`) đọc cấu hình từ query: `user`, `api`, `hint`, `unlock=all`. Đường dẫn trong bản build là tương đối, nên đặt ở thư mục con nào cũng chạy.
- iframe không truyền được `authToken` và `onEvent`. Nếu iframe cùng origin với API thì cookie phiên vẫn đi kèm request (`fetch` mặc định gửi cookie cùng origin).
- Thiếu `api` thì bản tĩnh chấm và cộng điểm ngay trong trình duyệt. Cách này chỉ hợp để demo, vì sinh viên tự sửa được localStorage.

## 4. API điểm (TV1)

Mọi đường dẫn dưới đây tính từ `apiBase`. Khi chạy `npm run dev`, mock API ở `/api/v1` làm đúng các bước này và lưu vào `.mock-data/db.json`.

### 4.1 `POST /learning-events`

Gửi mỗi khi sinh viên hoàn thành một màn. Body là `LearningEvent` (`src/core/events.ts`): đúng schema ở mục 6 của kế hoạch, thêm trường `submission` (nhật ký bài làm).

```json
{
  "event": "game_level_completed",
  "idempotency_key": "sv001:dijkstra:ch6-l01:3",
  "user_id": "sv001",
  "course_id": "LTDT",
  "chapter_id": "ch6",
  "game_id": "dijkstra",
  "level_id": "ch6-l01",
  "stars": 3,
  "score": 1000,
  "hints_used": 0,
  "attempts": 1,
  "duration_ms": 48210,
  "timestamp": "2026-10-20T09:15:00+07:00",
  "submission": { "kind": "dijkstra", "answers": ["…"], "hints": 0 }
}
```

`timestamp` là giờ địa phương kèm độ lệch múi giờ. `attempts` là số lần đã bấm "Bắt đầu" màn này trên máy.

Server nên xử lý theo thứ tự sau (mock làm đúng như vậy, trừ bước 2):

1. Kiểm tra trường bắt buộc (`event`, `user_id`, `level_id`, `submission`). Thiếu thì trả `400`.
2. Đối chiếu `user_id` với người dùng của token hoặc phiên đăng nhập. Không tin `user_id` do client gửi.
3. Chấm lại: `verifySubmission(level_id, submission)` (mục 4.4). Không hợp lệ thì trả `422` kèm `reason`.
4. Dùng **số sao và điểm do server tính**, không dùng số client gửi. Dựng lại khóa `user_id:game_id:level_id:stars` từ số sao đó.
5. Khóa đã có thì trả `duplicate` và không cộng.
6. Cộng `creditFor(best_stars_cũ, stars)`, tức phần sao tăng thêm nhân với `POINTS_PER_STAR` (mock: 10, `src/core/events.ts`). Cập nhật `best_stars` và `best_score` của màn.

| Mã | Body | Client làm gì |
|---|---|---|
| `200` | `{ "status": "credited" \| "no_improvement" \| "duplicate", "credited": 10, "points_total": 30, "stars": 3, "score": 1000, "best_stars": 3, "adjusted": false, "idempotency_key": "…" }` | hiện "+10 điểm thưởng · tổng 30 điểm" hoặc "Không cộng thêm điểm…"; tổng điểm trên giao diện lấy theo `points_total` |
| `400`, `422` | `{ "status": "rejected", "reason": "…" }` | hiện "Máy chủ chưa ghi nhận điểm: …"; không gửi lại |
| `5xx` hoặc mất mạng | – | xếp event vào hàng đợi trong localStorage, hiện "Chưa gửi được điểm vì mất kết nối…"; gửi lại trước lần nộp kế tiếp và mỗi lần mở game. Gửi lại nhiều lần vẫn an toàn nhờ `idempotency_key` |

`adjusted: true` nghĩa là số sao client gửi khác số sao server chấm: dấu hiệu client bị sửa hoặc hai bên lệch phiên bản.

### 4.2 `GET /progress?user_id=<id>`

Đọc tiến độ đã ghi trên server. Client gọi một lần lúc mở game, sau khi đã gửi lại hàng đợi.

```json
{
  "points_total": 30,
  "levels": {
    "ch6-l01": { "best_stars": 3, "best_score": 1000 }
  }
}
```

Client gộp kết quả vào tiến độ trên máy (`mergeRemote` trong `src/services/progress.ts`):

- mỗi màn lấy `best_stars` và `best_score` lớn hơn giữa hai bên, nên màn kế tiếp cũng mở theo;
- tổng điểm lấy `points_total` (trừ khi sinh viên vừa nộp bài trong lúc đang tải, vì khi đó số này đã cũ);
- id màn không có trong game bị bỏ qua; lỗi mạng, mã khác `2xx` hoặc body sai dạng thì giữ nguyên tiến độ trên máy.

Thiếu endpoint này thì game vẫn chạy và điểm vẫn cộng đúng. Chỉ có điều sinh viên đổi máy sẽ thấy các màn đã qua bị khóa lại (`GDD.md`, câu hỏi 10).

### 4.3 `POST /analytics`

Sự kiện đo lường cho thí điểm (mục 9 kế hoạch, `GDD.md` mục 2.9). Server trả `202`; client không đọc phản hồi và không gửi lại.

Body: `{ "event": "<tên>", "user_id": "…", "course_id": "…", …trường riêng, "timestamp": "<ISO 8601 giờ UTC>" }`.

| `event` | Khi nào | Trường riêng |
|---|---|---|
| `game_level_started` | bấm "Bắt đầu" | `chapter_id`, `game_id`, `level_id`, `race`, `is_voluntary_replay` |
| `game_level_completed` | thắng màn (sau khi đã nộp điểm) | `chapter_id`, `game_id`, `level_id`, `race`, `is_voluntary_replay`, `stars`, `score`, `hints_used`, `duration_ms` |
| `game_level_failed` | hết 3 mạng hoặc thua máy | `chapter_id`, `game_id`, `level_id`, `race`, `reason` (câu tiếng Việt), `duration_ms`, `hints_used`, `mistakes` (khi hết mạng) |
| `game_level_abandoned` | rời trang hoặc rời màn khi đang chơi | `chapter_id`, `game_id`, `level_id`, `race`, `duration_ms`, `hints_used` |
| `game_hint_used` | mỗi lần dùng gợi ý | `chapter_id`, `game_id`, `level_id`, `race`, `hint_level`, `hints_used` |

`is_voluntary_replay` là `true` khi chơi lại một màn đã đạt 3 sao (không còn được cộng điểm).

`game_level_abandoned` gửi bằng `navigator.sendBeacon` để vẫn tới được server khi trang đóng. Beacon không mang được header `Authorization`, chỉ mang cookie cùng origin (`GDD.md`, câu hỏi 11). Các sự kiện khác dùng `fetch` với `keepalive` và có token.

### 4.4 Chấm lại ở server: `verifySubmission`

`verifySubmission(levelId, submission)` (`src/core/verify.ts`) phát lại nhật ký bài làm bằng chính engine và thuật toán của game, rồi trả về `{ ok: true, stars, score, detail }` hoặc `{ ok: false, reason }`. Client gọi đúng hàm này trước khi nộp, nên kết quả hai bên luôn khớp.

- **Backend Node/TypeScript:** import thẳng `src/core/verify.ts`. Thư mục `src/core/` là TypeScript thuần, không phụ thuộc React, DOM hay gói npm nào (mock API nạp nó qua Vite SSR).
- **Backend ngôn ngữ khác** (Python, Java…): chạy một tiến trình Node nhỏ bọc hàm này, hoặc viết lại theo `tests/unit/verify.test.ts`, coi các ca kiểm thử trong đó là đặc tả.
- Bản nhúng cũng export `verifySubmission` (cùng mã nguồn) để dùng ngay trên trang nếu cần.

Định dạng `submission` theo từng game (kiểu `Submission`):

| `kind` | Nội dung |
|---|---|
| `traversal`, `dijkstra` | `answers`: mọi câu trả lời theo thứ tự, kể cả câu sai; `race: { won, elapsedMs }` ở chế độ đua |
| `one_stroke` | `actions`: chuỗi thao tác vẽ, hoàn tác, làm lại và kết luận "Bất khả" |
| `muddy_city` | `paved`: id các con đường đã lát |
| `greedy_order` | `runs`: thứ tự đỉnh của từng lần chạy Greedy |
| `matrix_translate` | `checks`: bài làm và thời gian của từng lần bấm Kiểm tra |
| `untangle` | `actions`: các lần dời đỉnh (tọa độ mới), câu trả lời số miền và bằng chứng không phẳng |
| `two_teams` | `actions`: các lần xếp hoặc bỏ đội, "Xếp lại", "Kiểm tra" và vòng lẻ đã chỉ ra |
| `max_flow` | `actions`: các lần bơm (đường đi và lượng), "Đặt lại", "Đã cực đại" và phía S của lát cắt |

Mọi loại đều có `hints` (số lần dùng gợi ý). Nhật ký dài quá 5000 bước bị từ chối. Server không kiểm được `hints` và `race.elapsedMs` vì hai số này do client báo (`GDD.md`, câu hỏi 8).

## 5. Gợi ý Socratic (TV5)

Khi có `hintEndpoint`, mỗi lần sinh viên dùng gợi ý, game gửi:

```http
POST <hintEndpoint>
Content-Type: application/json
Authorization: Bearer <token>

{
  "mode": "socratic",
  "course_id": "LTDT",
  "chapter_id": "ch7",
  "game_id": "muddy_city",
  "level_id": "ch7-l01",
  "hint_level": 1,
  "state": "Thành phố bùn: 5 nhà, 7 đường. Đã lát A–B, B–C; tổng chi phí 5; 3 nhóm nhà.",
  "reference_hint": "Đường rẻ nhất trên cả bản đồ có nên lát không? …"
}
```

Chatbot trả về `{ "text": "…" }`.

- `state` mô tả ngắn trạng thái hiện tại bằng tiếng Việt, để câu hỏi bám đúng chỗ sinh viên đang làm.
- `reference_hint` là gợi ý tĩnh của game cho đúng trạng thái đó. Chatbot nên bám theo để không lộ đáp án.
- Quá 4 giây, lỗi mạng, mã khác `2xx` hoặc thiếu `text` thì game dùng gợi ý tĩnh; sinh viên không thấy lỗi.
- Chatbot chỉ thay phần chữ. Phần tô sáng trên đồ thị (gợi ý mức 2) luôn lấy từ gợi ý tĩnh.
- Số lần dùng gợi ý (để trừ sao) được đếm ở client. Nếu điểm game tính vào học phần, chatbot nên tự đếm số lần gọi ở phía server (`GDD.md`, câu hỏi 8).

## 6. Sự kiện cho trang chủ: `onEvent`

`onEvent(name, payload)` nhận:

- năm sự kiện analytics ở mục 4.3, với đúng payload đó (đã có `user_id`, `course_id`, `timestamp`). Có hay không có `apiBase` thì `onEvent` vẫn nhận;
- `"learning_event"`: payload là `LearningEvent` đầy đủ, kể cả `submission`. Sự kiện này đến sau khi event đã được nộp lên API (hoặc đã vào hàng đợi). Dùng nó để cập nhật điểm trên header của website, hiện thông báo riêng, hoặc chuyển tiếp sang hệ thống khác.

Khi thắng một màn, thứ tự là `learning_event` rồi `game_level_completed`. Lỗi ném ra trong `onEvent` bị bỏ qua và không làm hỏng game.

## 7. Dữ liệu lưu trên trình duyệt

| Khóa localStorage | Nội dung |
|---|---|
| `smartedu-ltdt:progress:v1:<userId>` | sao, điểm kỷ lục và số lần chơi của từng màn; tổng điểm; huy hiệu; chuỗi màn không dùng gợi ý; đã xem hướng dẫn game nào |
| `smartedu-ltdt:outbox:v1:<userId>` | learning event chưa gửi được (khi có `apiBase`) |
| `smartedu-ltdt:ledger:v1:<userId>` | sổ điểm của `LocalPointsClient` (khi không có `apiBase`) |
| `smartedu-ltdt:settings:v1` | âm thanh, âm lượng, chế độ chuyển động; dùng chung cho mọi tài khoản trên máy |

- localStorage bị chặn (chế độ riêng tư, chặn cookie) thì game dùng bộ nhớ tạm và vẫn chạy bình thường; tiến độ mất khi đóng trang. Với `apiBase`, sao và điểm được tải lại từ server ở lần mở sau.
- Nút "Xóa tiến độ trên máy này" trong Cài đặt chỉ xóa khóa `progress`. Tổng điểm hiển thị giữ nguyên, vì điểm đã cộng không bị thu hồi.

## 8. Thay bằng mã thuật toán của nhóm (TV3, TV4)

Kế hoạch (mục 1) cho phép dùng lại BFS, DFS, Euler, Greedy Coloring (TV3) và Dijkstra, Kruskal, Prim (TV4). Game gọi thuật toán qua các hàm dưới đây. Muốn thay bằng mã của nhóm thì giữ nguyên chữ ký hàm và thay phần thân:

| File | Hàm | Được dùng ở |
|---|---|---|
| `src/core/algorithms/traversal.ts` | `bfs(g, s)`, `dfs(g, s)` | engine BFS, DFS |
| `src/core/algorithms/shortestPath.ts` | `dijkstra(g, s)` | engine Dijkstra |
| `src/core/algorithms/euler.ts` | `analyzeEuler(g)` | bộ chấm và giao diện Một nét vẽ |
| `src/core/algorithms/coloring.ts` | `greedyColoring(g, order)`, `chromaticNumber(g)`, `optimalGreedyOrder(g)` | bộ chấm, gợi ý và thẻ "Vì sao?" của Greedy |
| `src/core/algorithms/spanningTree.ts` | `kruskal(g, opts)`, `prim(g, start, opts)` | chi phí tối ưu, phát lại Kruskal & Prim, thẻ "Vì sao?" của Thành phố bùn |
| `src/core/algorithms/planarity.ts` | `conflicts(g, pos)`, `judgeProof(g, proof)`, `validProofs(g)` | bộ chấm và gợi ý của Gỡ rối |
| `src/core/algorithms/bipartite.ts` | `bipartition(g)`, `judgeOddCycle(g, cycle)` | bộ chấm, gợi ý và thẻ "Vì sao?" của Chia đội |
| `src/core/algorithms/maxFlow.ts` | `edmondsKarp(g, s, t, start)`, `residualArc`, `cutCapacity` | bộ chấm, gợi ý và thẻ "Vì sao?" của Ống nước & nút thắt |

Khung "Tôi là thuật toán" dùng interface `PredictionEngine<S, A>` (`src/core/engines/types.ts`) với các hàm `init`, `isDone`, `expected`, `check`, `apply`, `progress`, `hint`, `referenceQuestionCount`. Ba engine BFS, DFS, Dijkstra nằm trong `src/core/engines/`. Thêm một thuật toán của giai đoạn 2 (ví dụ Bellman–Ford) nghĩa là viết thêm một engine theo interface này rồi dùng lại giao diện có sẵn.

Thay xong thì chạy `npm test` (so với đáp án của từng màn) và `npm run e2e` (tự giải lại cả 64 màn và 13 màn đua trên desktop và mobile).

## 9. Kiểm thử phần tích hợp

- `tests/e2e/embed-host.html`: trang chủ giả lập với header 56 px, `hashRouting: false`, `authToken` và `onEvent`. Mở trên dev server, ví dụ `/tests/e2e/embed-host.html?user=sv1&route=%23%2Fgame%2Fdijkstra`; thêm `&hostile=1` để bật CSS toàn cục, `&bundle=1` để dùng bản build trong `dist-embed/`.
- `tests/e2e/embed.spec.ts`:
  - so style của 14 màn hình giữa trang sạch và trang có CSS toàn cục;
  - chơi trọn một màn bằng cả mã nguồn lẫn bản build, rồi kiểm tra URL không đổi, sự kiện tới `onEvent`, mọi request có token, đủ ba font.
- `tests/e2e/flows.spec.ts`: đổi máy thì tải lại tiến độ (`GET /progress`); chơi lại không bị cộng trùng; xóa tiến độ vẫn giữ điểm.
- `tests/unit/services.test.ts`: gộp tiến độ, `fetchProgress`, token trên mọi client.

Chạy `npm run build:embed` trước `npm run e2e`. Thiếu bước này thì test của bản build bị bỏ qua, hoặc chạy trên bản build cũ.
