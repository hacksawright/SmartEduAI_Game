# GDD – Game hóa môn Lý thuyết đồ thị (SmartEduAI)

> Phiên bản v1.3 · 12/10/2026 · Phạm vi: các game **P0**, **P0+** và ba game **giai đoạn 2** (Ch.4, Ch.8) trong `ke-hoach-game-hoa-LTDT.md`, mục 3–4.
> v1.1 ghi lại bản đã làm: tên màn thật, số đỉnh/cạnh, và các quyết định phát sinh khi chơi thử (mục 16).
> v1.2 thêm đồng bộ tiến độ giữa các máy, token xác thực, bản nhúng vào trang chủ và kết quả đo hiệu năng (mục 2.4, 15, 16).
> v1.3 thêm ba game giai đoạn 2: Gỡ rối, Chia đội (Ch.4) và Ống nước & nút thắt (Ch.8), mục 9–11. Các mục sau đó lùi số.
> Dữ liệu màn chơi chính xác (đỉnh, cạnh, tọa độ) nằm trong `src/core/levels/`. Tài liệu này mô tả luật chơi, cách chấm và mục tiêu học của từng màn.

## 0. Tóm tắt

Một "sảnh game" nhúng vào SmartEduAI. Mỗi chương của giáo trình có một trò chơi, trong đó **sinh viên làm thay thuật toán hoặc giải một câu đố đồ thị**, và bộ chấm luôn là chính thuật toán của chương đó. Chơi xong mỗi màn, sinh viên nhận sao và xem thẻ "Vì sao?" nối kết quả với định lý trong giáo trình.

## 1. Vòng lặp chơi

| Khung thời gian | Người chơi làm gì |
|---|---|
| 10–30 giây | Đọc trạng thái → dự đoán bước tiếp theo / chọn cạnh → nhận phản hồi ngay (đúng: hiệu ứng + chạy bước; sai: mất mạng + lời giải thích) |
| 3–5 phút | Hoàn thành một màn → sao → thẻ "Vì sao?" → màn tiếp |
| Một buổi học | Qua 3–6 màn của chương đang học; quay lại màn cũ để lấy 3 sao hoặc chơi chế độ đua với máy |
| Cả học kỳ | Mở khóa huy hiệu theo game/chương; điểm cộng vào hệ thống điểm của SmartEduAI |

## 2. Hệ thống dùng chung

### 2.1 Mở khóa

- Mọi chương và mọi game mở ngay từ đầu, vì sinh viên có thể học lệch nhau.
- Trong một game, màn n+1 mở khi màn n đạt ít nhất 1 sao.
- Chế độ **Đua với máy** của một màn mở sau khi đã qua màn đó ở chế độ thường.
- Giảng viên hoặc kiểm thử dùng `?unlock=all` để mở hết.

### 2.2 Sao (luôn ≥ 1 khi hoàn thành)

| Game | Sao gốc | Trừ gợi ý |
|---|---|---|
| Tôi là thuật toán (BFS/DFS, Dijkstra) | 0 lỗi → 3 · 1 lỗi → 2 · 2 lỗi → 1 (lỗi thứ 3 = hết mạng) | −1 sao mỗi lần dùng |
| Một nét vẽ | 0 lỗi → 3 · 1–2 lỗi → 2 · ≥ 3 lỗi → 1. Lỗi = bị kẹt, kết luận "Bất khả" sai, bằng chứng sai | −1 sao mỗi lần dùng |
| Thành phố bùn | bằng tối ưu → 3 · chênh ≤ 10% → 2 · cây khung hợp lệ → 1 *(đúng mục 4.3)* | −1 sao mỗi lần dùng *(3 sao đòi hỏi không dùng gợi ý)* |
| Xếp thứ tự cho Greedy | đạt χ(G) ở lần chạy đầu → 3 · trong ≤ 3 lần → 2 · đạt χ → 1 | −1 sao mỗi lần dùng |
| Dịch ma trận | đúng ở lần kiểm tra đầu và trong thời gian chuẩn → 3 · đúng trong ≤ 2 lần → 2 · đúng → 1 | −1 sao mỗi lần dùng |
| Gỡ rối, Chia đội, Ống nước & nút thắt | như Một nét vẽ: 0 lỗi → 3 · 1–2 lỗi → 2 · ≥ 3 lỗi → 1. Lỗi = một kết luận sai: số miền sai, bằng chứng không phẳng sai, "Kiểm tra" còn cặp cùng đội, vòng lẻ sai, báo cực đại khi còn đường tăng luồng, lát cắt sai. Thao tác bị từ chối (đặt đỉnh quá sát, ống đã đầy, chưa xếp hết) không tính lỗi | −1 sao mỗi lần dùng |

"Mỗi lần dùng giảm tối đa 1 sao" (mục 6 kế hoạch): một lần gợi ý trừ đúng 1 sao, và sao không xuống dưới 1.

### 2.3 Điểm của màn (`score`, 100–1000)

Chỉ phản ánh độ đúng, không phản ánh số lần bấm (nguyên tắc 2). Ở **mọi game**, điểm được làm tròn rồi kẹp trong khoảng 100–1000: đã hoàn thành màn thì luôn có ít nhất 100 điểm (`src/core/scoring.ts`).

- Tôi là thuật toán: `1000 × (số câu trả lời đúng / tổng số câu) − 100 × gợi ý`
- Một nét vẽ: `1000 − 150 × lỗi − 100 × gợi ý`
- Thành phố bùn: `1000 × (chi phí tối ưu / chi phí của SV) − 100 × gợi ý`
- Greedy: `1000 − 150 × (số lần chạy − 1) − 100 × gợi ý`
- Dịch ma trận: `1000 − 150 × lần kiểm tra sai − 100 × gợi ý − 5 × số giây vượt thời gian chuẩn`
- Gỡ rối, Chia đội, Ống nước & nút thắt: `1000 − 150 × lỗi − 100 × gợi ý` (cùng công thức với Một nét vẽ)

### 2.4 Điểm thưởng, sự kiện, chống cộng trùng (mục 6 kế hoạch)

- Mỗi lần hoàn thành màn, client gửi `game_level_completed` đúng schema mục 6, **kèm `submission`** (nhật ký bài làm).
- Server chấm lại bằng `verifySubmission()` trong `src/core/verify.ts` (cùng mã với client), rồi mới cộng điểm.
- `idempotency_key = user_id:game_id:level_id:stars`. Chỉ cộng khi số sao cao hơn kỷ lục cũ của màn. Điểm cộng = phần chênh lệch (mock: 10 điểm/sao).
- Chưa có API của TV1 thì `LocalPointsClient` chạy cùng logic đó ngay trong trình duyệt và lưu vào `localStorage`. Lúc chạy `npm run dev` còn có mock API ở `/api/v1/*`.
- Khi có API: lúc mở game, client gửi lại các event còn xếp hàng, rồi đọc `GET /progress` và gộp vào tiến độ trên máy. Mỗi màn lấy số sao và điểm cao hơn; tổng điểm lấy theo server. Nhờ vậy sinh viên đổi máy hoặc xóa dữ liệu trình duyệt vẫn giữ sao và các màn đã mở. Huy hiệu được tính lại trên tiến độ đã gộp.
- Trang chủ cấp `authToken` thì mọi request tới API điểm và chatbot gợi ý đều kèm `Authorization: Bearer <token>`. Hợp đồng API đầy đủ nằm trong `INTEGRATION.md`.

### 2.5 Gợi ý (Socratic)

- Gợi ý luôn là **câu hỏi dẫn dắt** theo trạng thái hiện tại, không đưa đáp án. Mỗi màn có 2 mức; mức cuối được chỉ ra một manh mối trên đồ thị (ví dụ tô sáng một đỉnh xuất phát hợp lệ).
- Lần đầu bấm gợi ý trong một lượt chơi sẽ có hộp xác nhận "Dùng gợi ý?". Nút được chọn sẵn là "Để tôi tự nghĩ"; Esc đóng hộp và trả focus về nút Gợi ý. Mức 2 mở bằng nút "Gợi ý cụ thể hơn (−1 sao)", không hỏi lại.
- `HintProvider` có hai bản: tĩnh (mặc định) và gọi chatbot Socratic của TV5 (cấu hình `hintEndpoint`).

### 2.6 Huy hiệu (mục 6 kế hoạch)

| Huy hiệu | Điều kiện |
|---|---|
| Hoàn thành mọi màn – *tên game* | mọi màn thường của game đạt ≥ 1 sao |
| 3 sao toàn bộ – *Chương n* | mọi màn thường của chương đạt 3 sao |
| Không cần gợi ý | 10 màn hoàn thành liên tiếp không dùng gợi ý |

### 2.7 Thẻ "Vì sao?"

Bắt buộc hiện sau mỗi màn (mục 10 kế hoạch). Thẻ gồm một câu kết luận, phần giải thích 3–5 dòng, hình minh họa dùng **chính đồ thị của màn vừa chơi** (ví dụ tô đỉnh bậc lẻ, cây BFS, cây khung), và trích dẫn chương/mục giáo trình. Nút "Màn tiếp" nằm trong thẻ.

### 2.8 Đua với máy (Tôi là thuật toán, Tôi là Dijkstra)

Máy trả lời một câu sau mỗi T giây (BFS/DFS: 6 giây/câu; Dijkstra: 9 giây/câu, vì phải gõ số), hiện bằng thanh tiến độ có icon `Bot`. Sinh viên phải xong trước máy và còn mạng. Sao tính như chế độ thường. Kết quả ghi vào `level_id` có hậu tố `-race`.

### 2.9 Đo lường cho thí điểm (mục 9 kế hoạch)

Các sự kiện phụ: `game_level_started`, `game_level_failed` (hết mạng hoặc thua máy), `game_level_abandoned` (rời màn giữa chừng), `game_hint_used`. Trường `is_voluntary_replay = true` khi chơi lại màn đã đạt 3 sao, tức là không còn được cộng điểm. Đủ để tính tỷ lệ hoàn thành, sao trung bình, tỷ lệ gợi ý, màn bị bỏ nhiều nhất, số lần chơi lại tự nguyện và mức tham gia theo tuần.

## 3. Tôi là thuật toán – BFS/DFS (Ch.2) · P0

**Mục tiêu học:** phân biệt hàng đợi (FIFO) với ngăn xếp (LIFO); dự đoán đúng thứ tự thăm theo quy ước đỉnh kề tăng dần.

**Cơ chế:**

| Thuật toán | Câu hỏi mỗi bước | Đầu vào | Kiểm tra |
|---|---|---|---|
| BFS | (a) Đỉnh nào được lấy ra khỏi hàng đợi? | chạm 1 đỉnh | ngay khi chạm |
| BFS | (b) Những đỉnh nào được đưa vào hàng đợi, theo thứ tự? | chạm lần lượt các đỉnh (chạm lại để bỏ), hoặc "Không có đỉnh nào" | khi bấm Xác nhận; đúng cả tập lẫn thứ tự |
| DFS | Bước tiếp theo: đẩy đỉnh nào vào ngăn xếp, hay lấy đỉnh trên cùng ra? | chạm 1 đỉnh, hoặc nút "Lấy ra" | ngay khi chạm |

- BFS đánh dấu đã thăm **khi đưa vào hàng đợi**. DFS dùng ngăn xếp đẩy từng đỉnh: xét đỉnh trên cùng, đẩy đỉnh kề chưa thăm có chỉ số nhỏ nhất, hết thì lấy ra. Thứ tự này trùng với DFS đệ quy.
- Đúng: engine chạy bước đó kèm animation; tăng chuỗi đúng. Sai: mất 1 mạng, panel hiện bước đúng kèm giải thích một câu, bấm "Tiếp tục" để engine chạy bước đúng. Hết 3 mạng thì hiện màn "Hết mạng" và chơi lại.
- Panel hiển thị: câu hỏi, hàng đợi/ngăn xếp, thứ tự thăm, pseudocode có tô dòng hiện tại.
- **Bộ chấm:** so với trace do engine sinh từ trạng thái hiện tại (`src/core/engines/`).

**Tiến trình màn:**

| Màn | Tên (id) | Đồ thị | Mục tiêu |
|---|---|---|---|
| BFS 1 | Hàng đợi đầu tiên (`ch2-bfs-01`) | 6 đỉnh, 7 cạnh, vô hướng | làm quen thao tác; gặp đỉnh "đã thăm" |
| BFS 2 | Cả nhóm vào hàng (`ch2-bfs-02`) | 8 đỉnh, 11 cạnh | nhiều đỉnh vào hàng đợi cùng lúc |
| BFS 3 | Nhãn bị xáo trộn (`ch2-bfs-03`) | 10 đỉnh, 14 cạnh, xuất phát từ đỉnh 4 | quy ước chỉ số khi nhãn đỉnh bị xáo trộn trên hình |
| BFS 4 | Đường một chiều (`ch2-bfs-04`) | 12 đỉnh, 19 cung, **có hướng** | chỉ xét cung đi ra |
| DFS 1 | Ngăn xếp đầu tiên (`ch2-dfs-01`) | 6 đỉnh, 7 cạnh | làm quen đẩy/lấy ra |
| DFS 2 | Quay lui nhiều tầng (`ch2-dfs-02`) | 8 đỉnh, 11 cạnh, nhiều chu trình | quay lui nhiều tầng |
| DFS 3 | Đi thật sâu (`ch2-dfs-03`) | 10 đỉnh, 12 cạnh | nhánh sâu, quay lui xa |
| DFS 4 | Có hướng và có đỉnh lạc (`ch2-dfs-04`) | 12 đỉnh, 16 cung, có hướng | có đỉnh không tới được (không xuất hiện trong thứ tự thăm) |

Mỗi màn có thêm biến thể **Đua với máy** (id thêm hậu tố `-race`), mở sau khi qua màn thường.

**Gợi ý:** (1) "Hàng đợi lấy ra theo nguyên tắc nào? Đỉnh nào đang đứng đầu hàng?" / "Liệt kê đỉnh kề của u; đỉnh nào chưa từng vào hàng đợi?" (2) tô sáng các đỉnh kề của u.

**Thẻ Vì sao?:** BFS thăm theo từng lớp khoảng cách nên cây BFS cho đường đi ít cạnh nhất (vẽ các lớp). DFS đi sâu theo đỉnh vừa thăm gần nhất và chỉ quay lui khi hết đỉnh kề (vẽ cây DFS).

**Tham số chỉnh:** số đỉnh, độ dày cạnh, đỉnh xuất phát, T của chế độ đua.

## 4. Tôi là Dijkstra (Ch.6) · P0

**Mục tiêu học:** chọn đúng đỉnh có nhãn nhỏ nhất để cố định; thực hiện phép giảm nhãn `d[u] + w(u,v) < d[v]`.

**Cơ chế mỗi bước:**

1. *Chọn:* "Đỉnh nào được cố định nhãn tiếp theo?" Chạm đỉnh trên đồ thị hoặc chạm dòng trong bảng nhãn. Nếu nhiều đỉnh cùng nhãn nhỏ nhất, **chấp nhận mọi lựa chọn hợp lệ** và trace tiếp theo lựa chọn của sinh viên.
2. *Cập nhật:* các dòng của đỉnh kề chưa cố định trở thành ô nhập. Sinh viên sửa `d` ở những đỉnh có nhãn giảm; `pred` tự hiện "→ u" khi `d` giảm. Bỏ trống nghĩa là giữ nguyên. Nếu u không còn đỉnh kề chưa cố định thì bỏ qua bước này.
3. Sai: mất mạng; từng dòng hiện phép tính đúng, ví dụ "5 + 3 = 8 < 10 → d[C] = 8, pred = B".

**Tiến trình màn** (nhãn đỉnh là chữ cái để không lẫn với giá trị `d`; nguồn luôn là A):

| Màn | Tên (id) | Đồ thị | Mục tiêu |
|---|---|---|---|
| D1 | Nhãn đầu tiên (`ch6-l01`) | 5 đỉnh, 7 cạnh, vô hướng | làm quen chọn đỉnh và giảm nhãn |
| D2 | Hòa nhãn (`ch6-l02`) | 7 đỉnh, 10 cạnh | nhiều đỉnh cùng nhãn nhỏ nhất: chọn đỉnh nào cũng đúng |
| D3 | Đường một chiều (`ch6-l03`) | 8 đỉnh, 13 cung, có hướng | cung đi vào u không dùng để giảm nhãn khi xét u |
| D4 | Chuỗi giảm nhãn (`ch6-l04`) | 10 đỉnh, 19 cung, có hướng | một đỉnh bị giảm nhãn nhiều lần |
| D5 | Bản đồ thành phố (`ch6-l05`) | 12 đỉnh, 23 cạnh, vô hướng | màn tổng hợp |

Mỗi ô nhập nhãn có tên đọc được cho trình đọc màn hình ("Nhãn mới của C, …"). Nút "Giữ nguyên tất cả" dùng khi không đỉnh kề nào giảm nhãn. Mỗi màn cũng có biến thể Đua với máy.

**Thẻ Vì sao?:** trọng số không âm nên mọi đường khác tới u phải rời tập đã cố định qua một đỉnh có nhãn ≥ d[u]; vẽ cây đường đi ngắn nhất từ `pred`.

## 5. Một nét vẽ (Ch.3 – Euler) · P0

**Mục tiêu học:** tự phát hiện, rồi vận dụng, định lý về đường đi/chu trình Euler (Định lý 3.3–3.5).

**Cơ chế:**

- Chạm một đỉnh để đặt bút, sau đó chạm đỉnh kề để vẽ cạnh (cạnh sáng lên và bị khóa). Có thể kéo bút qua các đỉnh. Có nút Hoàn tác và Làm lại.
- Chạm đỉnh không có cạnh chưa đi: rung nhẹ, **không tính lỗi**.
- **Bị kẹt** (bút không còn cạnh nào để đi mà vẫn còn cạnh chưa vẽ): +1 lỗi, hiện "Bị kẹt", gợi ý Hoàn tác/Làm lại.
- **Bất khả:** bấm nút → chọn bằng chứng → Xác nhận. Vô hướng: chọn **mọi đỉnh bậc lẻ**. Có hướng: chọn mọi đỉnh có bán bậc vào ≠ bán bậc ra. Hoặc chọn "Đồ thị không liên thông". Kết luận sai hoặc bằng chứng sai: +1 lỗi và nói rõ sai ở đâu.
- **Bộ chấm:** chuỗi đỉnh hợp lệ khi mỗi cặp liên tiếp là một cạnh chưa đi và số cạnh đã đi = |E|. "Bất khả" đúng khi đồ thị không liên thông, hoặc số đỉnh bậc lẻ ∉ {0, 2} (có hướng: điều kiện cân bằng bán bậc không thỏa).

**Tiến trình (mục 4.2 kế hoạch):** màn 1–4 khám phá, không hiện bậc · màn 5–9 hiện bậc đỉnh · màn 10–12 ẩn bậc · màn 13–15 đồ thị có hướng (màn 13 hiện bán bậc vào/ra, màn 14–15 ẩn).

| Màn | Tên (id `ch3-lNN`) | Đỉnh / cạnh | Loại | Hiện trên hình | Ý đồ |
|---|---|---|---|---|---|
| 1 | Tam giác có đuôi | 4 / 4 | đường đi (2 đỉnh lẻ) | – | xuất phát sai chỗ là kẹt |
| 2 | Phong bì | 5 / 8 | đường đi | – | hình cổ điển "vẽ ngôi nhà một nét" |
| 3 | Cái nơ | 5 / 6 | chu trình | – | mọi đỉnh chẵn: bắt đầu đâu cũng được |
| 4 | Ngôi sao trong ngũ giác (K5) | 5 / 10 | chu trình | – | nhiều cạnh nhưng vẫn dễ khi hiểu luật |
| 5 | Hình vuông hai đường chéo (K4) | 4 / 6 | **bất khả** (4 đỉnh lẻ) | bậc | giới thiệu nút Bất khả |
| 6 | Con cá | 6 / 8 | đường đi | bậc | bắt đầu ở đỉnh lẻ |
| 7 | Bảy cây cầu (đa đồ thị, vẽ trên dòng sông) | 4 / 7 | **bất khả** (4 đỉnh lẻ) | bậc | gợi lại bài toán Königsberg |
| 8 | Viên kim cương | 6 / 11 | đường đi | bậc | đồ thị dày hơn |
| 9 | Hai ngôi nhà | 10 / 17 | **bất khả** (6 đỉnh lẻ) | bậc | |
| 10 | Mạng 10 đỉnh | 10 / 14 | đường đi | – | ẩn bậc: tự đếm |
| 11 | Ngôi sao sáu cánh (hai tam giác rời nhau) | 6 / 6 | **bất khả** (không liên thông, mọi đỉnh chẵn) | – | bẫy: hình trông liền một khối, chỉ đếm bậc là sai |
| 12 | Lưới có chéo | 9 / 14 | chu trình | – | |
| 13 | Vòng một chiều | 6 / 7 | đường đi có hướng | bán bậc vào/ra | giới thiệu bán bậc |
| 14 | Nơ một chiều | 5 / 6 | **bất khả** (đỉnh 3 có cung ra nhiều hơn cung vào 2, đỉnh 5 ngược lại) | – | cùng dáng màn 3 nhưng có hướng |
| 15 | Mê cung một chiều | 9 / 12 | đường đi có hướng | – | |

**Gợi ý:** (1) "Đếm số cạnh tại mỗi đỉnh. Có bao nhiêu đỉnh có số cạnh lẻ?" (2) "Nếu có đúng 2 đỉnh bậc lẻ, hành trình phải bắt đầu và kết thúc ở đâu?" và tô sáng một đỉnh xuất phát hợp lệ.

**Thẻ Vì sao?:** phát biểu định lý; tô các đỉnh bậc lẻ trên chính hình vừa chơi; chỉ ra điểm đầu và điểm cuối của nét vẽ.

## 6. Thành phố bùn (Ch.7 – Cây khung nhỏ nhất) · P0

**Mục tiêu học:** cây khung có đúng n−1 cạnh và liên thông; chọn cạnh rẻ mà không tạo chu trình (tư tưởng Kruskal), từ đó so với Prim.

**Cơ chế:**

- Bản đồ gồm nhà (đỉnh) và đường đất (cạnh), mỗi đường có thẻ chi phí lát. Chạm một đường **hoặc thẻ giá của nó** để lát (đá phủ dần từ nhà này sang nhà kia) hoặc bỏ lát. Bàn phím: Tab tới từng đường, Space/Enter để lát.
- Nhà chặn chạm (chạm vào nhà không lát nhầm đường đi sau nó). Thẻ giá luôn vẽ trên nhà, đặt ở phần đường nhìn thấy được, tránh đè lên nhau, lên chữ tên nhà và lên chỗ hai đường cắt nhau, nên đường ngắn trên màn 375 px vẫn chạm được.
- Panel hiển thị số đường đã lát / n−1, tổng chi phí, số nhóm nhà đã nối. Đường vừa lát mà tạo chu trình thì hiện cảnh báo "Thừa: tạo vòng A–B–C" (nói về tính chất cây, không tiết lộ lời giải tối ưu).
- Nút "Kiểm tra" chỉ bật khi tập đường đã lát là một cây khung (đúng n−1 cạnh và liên thông). Sao tính theo chi phí so với Kruskal (mục 2.2).
- **Sau khi thắng:** người dân đi dạo trên đường lát; nút "Xem Kruskal & Prim" phát lại từng bước của hai thuật toán trên cùng bản đồ, đặt cạnh lựa chọn của sinh viên để so sánh.

**Tiến trình:**

| Màn | Tên (id) | Nhà / đường | Chi phí tối ưu | Ý đồ |
|---|---|---|---|---|
| M1 | Làng năm nhà (`ch7-l01`) | 5 / 7 | 14 | làm quen |
| M2 | Bên kia đồi (`ch7-l02`) | 6 / 11 | 20 | có đường cắt nhau |
| M3 | Đường cùng giá (`ch7-l03`) | 7 / 12 | 20 | có đường cùng giá: nhiều lời giải tối ưu |
| M4 | Thị trấn tám nhà (`ch7-l04`) | 8 / 15 | 28 | |
| M5 | Hai xóm (`ch7-l05`) | 9 / 17 | 34 | hai cụm nhà |
| M6 | Thành phố mười nhà (`ch7-l06`) | 10 / 19 | 36 | màn tổng hợp |
| M7 · P0+ | Đường bắt buộc (`ch7-l07`) | 7 / 12 | 23 | đường B–E khóa sẵn: cây khung nhỏ nhất chứa một cạnh cho trước (Bài 24c) |
| M8 · P0+ | Đường hỏng (`ch7-l08`) | 8 / 15 | 24 | cây tối ưu có sẵn (6 đường khóa), B–E bị lũ cuốn: chọn đường thay thế rẻ nhất (Bài 21) |

**Gợi ý:** (1) "Đường rẻ nhất trên cả bản đồ có nên lát không? Còn đường rẻ thứ hai, thứ ba thì sao?" (2) tùy trạng thái, theo thứ tự ưu tiên:

- đang có vòng: tô đường đắt nhất trong vòng (trừ đường khóa) và nói vòng đó có một đường thừa;
- còn nhóm nhà rời nhau: tô đường rẻ nhất nối hai nhóm khác nhau;
- đã là cây khung nhưng chưa rẻ nhất: tô một đường nên lát thử, vì nó tạo vòng mà bỏ đường đắt nhất trong vòng thì tổng giảm;
- đã rẻ nhất: "Bấm Kiểm tra!".

Gợi ý mức 2 dựa trên tính chất cây (vòng, nhóm nhà) chứ không đọc thẳng lời giải Kruskal, nên khớp với cách sinh viên đang lát.

**Thẻ Vì sao?:** tính chất lát cắt và tính chất chu trình; vẽ cây tối ưu đè lên cây của sinh viên.

## 7. Xếp thứ tự cho Greedy (Ch.5) · P0+

**Mục tiêu học:** số màu của Greedy phụ thuộc thứ tự đỉnh; luôn có thứ tự giúp Greedy đạt χ(G) (Hình 5.8, Tính chất 5.15).

- Thứ tự ban đầu là 1, 2, …, n. Chạm các đỉnh trên đồ thị để xếp chúng lên đầu danh sách theo thứ tự chạm. Nút "Đặt lại" khôi phục thứ tự ban đầu. Thao tác chỉ cần chạm, không cần kéo thả (mục 10 kế hoạch).
- "Chạy Greedy": các đỉnh được tô lần lượt bằng màu nhỏ nhất chưa bị đỉnh kề dùng, theo bảng Okabe–Ito. Vì nhãn đỉnh đã là số, **số màu ghi trong một huy hiệu nhỏ cùng màu** cạnh đỉnh (không đè lên nhãn), nên không phân biệt được màu vẫn đọc được. Nút "Tô nhanh" bỏ qua hoạt cảnh.
- Mục tiêu χ(G) hiện ngay trên bảng. Thắng khi số màu = χ(G). χ(G) được tính chính xác bằng quay lui trong code (đồ thị ≤ 12 đỉnh).
- Lần chạy dùng thừa màu: bảng chỉ ra **bước đầu tiên** phải mở màu vượt mục tiêu và lý do, ví dụ "Đỉnh 5 phải mở màu 3 vì các đỉnh kề 2 (màu 1), 4 (màu 2) đã chiếm hết màu 1 và 2".
- "Chạy Greedy" bị khóa khi thứ tự chưa đổi so với lần chạy trước, để mỗi lần chạy (tính vào sao) là một thử nghiệm mới.
- **Gợi ý:** (1) "Những đỉnh nào có thể dùng chung một màu? Thử xếp chúng liền nhau ở đầu thứ tự." (2) tô sáng một nhóm cùng màu của cách tô tối ưu và chỉ chỗ đặt nó; phần đầu thứ tự đã đúng theo từng nhóm được giữ nguyên.

| Màn | Tên (id) | Đồ thị | Thứ tự mặc định | χ(G) |
|---|---|---|---|---|
| G1 | Hai phía (`ch5-l01`) | 8 đỉnh, 12 cạnh, hai phía kiểu Hình 5.8 | 4 màu | 2 |
| G2 | Hai tam giác (`ch5-l02`) | 7 đỉnh, 9 cạnh | 4 màu | 3 |
| G3 | Bánh xe (`ch5-l03`) | 7 đỉnh, 12 cạnh (W6) | 4 màu | 3 |
| G4 | Mười đỉnh (`ch5-l04`) | 10 đỉnh, 14 cạnh | 5 màu | 3 |

G2 thay cho chu trình lẻ C7 của bản v1: với C7, thứ tự mặc định 1, 2, …, 7 đã cho 3 màu = χ nên không còn gì để giải.

## 8. Dịch ma trận (Ch.1) · P0+

**Mục tiêu học:** đọc và viết các cách biểu diễn đồ thị (Bài tập 5–14 Ch.1).

- *Ma trận / danh sách → đồ thị:* các đỉnh đặt sẵn trên vòng tròn; chạm đỉnh A rồi đỉnh B để thêm hoặc bỏ cạnh A–B (có hướng: cung A→B). Trong lúc chờ chạm đỉnh thứ hai, **hàng của A** trong ma trận/danh sách được tô sáng để đối chiếu; chạm lại A hoặc bấm Esc để hủy.
- *Đồ thị → ma trận:* chạm ô để đổi 0/1; đồ thị vô hướng thì ô đối xứng đổi theo. Chạm một đỉnh để tô sáng hàng của nó (Esc để bỏ). Mỗi ô là một nút có tên "Hàng u, cột v: 0/1", chơi được bằng bàn phím.
- Có đồng hồ; thời gian chuẩn để đạt 3 sao ghi ở đầu màn. "Kiểm tra" sai thì báo số cạnh thiếu/thừa (không chỉ ra ô nào). Nút "Kiểm tra" bị khóa khi bài làm chưa đổi so với lần kiểm tra trước, để không mất lượt vì bấm lặp.
- **Gợi ý:** (1) câu hỏi về cách đọc biểu diễn của màn (ví dụ "Mỗi cột là một cạnh. Hai số 1 trong cột nằm ở hai hàng nào?") (2) chỉ ra **một** chỗ sai cụ thể và tô sáng hai đầu mút của nó.
- **Bộ chấm:** chuẩn hóa cạnh vô hướng về (min, max), sắp xếp rồi so sánh tập cạnh (mục 4.4).

| Màn | Tên (id) | Đồ thị | Thời gian chuẩn |
|---|---|---|---|
| X1 | Ma trận kề → đồ thị (`ch1-l01`) | 5 đỉnh, 6 cạnh | 60 giây |
| X2 | Đồ thị → ma trận kề (`ch1-l02`) | 5 đỉnh, 6 cạnh | 60 giây |
| X3 | Danh sách kề → đồ thị (`ch1-l03`) | 6 đỉnh, 7 cạnh | 75 giây |
| X4 | Ma trận liên thuộc → đồ thị (`ch1-l04`) | 5 đỉnh, 6 cạnh | 75 giây |
| X5 | Ma trận kề có hướng (`ch1-l05`) | 5 đỉnh, 6 cung | 75 giây |

## 9. Gỡ rối (Ch.4 – Đồ thị phẳng) · Giai đoạn 2

**Mục tiêu học:** nhận ra đồ thị phẳng bằng cách tự vẽ lại nó; công thức Euler n − m + f = 2; chứng minh một đồ thị không phẳng bằng hệ quả m ≤ 3n − 6, chặn m ≤ 2n − 4 khi không có tam giác, và định lý Kuratowski (K₅, K₃,₃).

- Lúc vào màn, các cạnh cắt nhau. Mỗi chỗ cắt có **dấu ×**, cạnh đang vướng tô đỏ. Đỉnh nằm sát lên một cạnh khác (gần hơn 24 đơn vị) cũng tính là vướng. Ô "Giao cắt" cập nhật sau mỗi lần dời đỉnh.
- Có ba cách dời đỉnh: kéo-thả; **chạm đỉnh rồi chạm chỗ trống** (thay cho kéo, theo mục 10 kế hoạch); hoặc phím mũi tên (giữ Shift để bước dài hơn), focus vẫn ở lại trên đỉnh. "Hoàn tác" đưa đỉnh vừa dời về chỗ cũ.
- Hai đỉnh không được đặt cách nhau dưới 84 đơn vị (`MIN_GAP`), để không "gỡ" được bằng cách chồng đỉnh lên nhau. Thả sai chỗ thì đỉnh bị trả về, có báo lý do, không tính lỗi.
- Khi hết giao cắt, game hỏi: "Hình vừa vẽ chia mặt phẳng thành bao nhiêu miền, kể cả miền bên ngoài?" Đáp án là f = m − n + 1 + c, với c là số thành phần liên thông. Trả lời sai tính 1 lỗi. Nếu trả lời f − 1, game nhắc "có thể bạn quên miền bên ngoài".
- Nút "Không phẳng" mở bảng bằng chứng. Sinh viên chọn một lý do:
  - *Đếm cạnh:* m > 3n − 6.
  - *Không có tam giác:* m > 2n − 4. Máy kiểm tra cả việc đồ thị thật sự không có tam giác.
  - *Chứa K₅:* chạm chọn 5 đỉnh.
  - *Chứa K₃,₃:* chạm một lần để xếp đỉnh vào nhóm 1, lần nữa để sang nhóm 2, lần thứ ba để bỏ. Nhóm ghi bằng số trong huy hiệu, không chỉ bằng màu.
- Lý do sai, hoặc chọn sai đồ thị con, tính 1 lỗi và có câu giải thích, ví dụ "m = 9, 3n − 6 = 12. Vì 9 ≤ 12 nên…". Đồ thị phẳng không có bằng chứng nào đúng, nên bấm "Không phẳng" ở màn phẳng luôn bị tính lỗi.
- **Gợi ý:**
  - Màn phẳng: (1) "Chọn một chu trình làm vòng ngoài…"; (2) tô sáng vòng ngoài của một cách vẽ mẫu. Câu hỏi số miền có gợi ý riêng: (1) nhắc miền vô hạn; (2) công thức Euler, kèm n và m.
  - Màn không phẳng: (1) "Đếm n, m rồi so với các chặn…"; (2) chỉ hướng bằng chứng đúng đầu tiên, có tô sáng đỉnh nếu là K₅ hoặc K₃,₃.
- **Bộ chấm:**
  - `conflicts()` kiểm tra giao nhau giữa mọi cặp cạnh không chung đỉnh, và khoảng cách từ mỗi đỉnh tới các cạnh không chứa nó.
  - `judgeProof()` kiểm tra bằng chứng.
  - Server phát lại nhật ký thao tác (`replayUntangle`).

| Màn | Tên (id) | Đồ thị | Đáp án |
|---|---|---|---|
| U1 | Lăng trụ (`ch4-l01`) | 6 đỉnh, 9 cạnh | phẳng, 5 miền |
| U2 | Bánh xe (`ch4-l02`) | 7 đỉnh, 12 cạnh | phẳng, 7 miền |
| U3 | Lập phương (`ch4-l03`) | 8 đỉnh, 12 cạnh | phẳng, 6 miền |
| U4 | Năm đỉnh, mười cạnh (`ch4-l04`) | 5 đỉnh, 10 cạnh (K₅) | không phẳng: đếm cạnh hoặc K₅ |
| U5 | Ba nhà, ba giếng (`ch4-l05`) | 6 đỉnh, 9 cạnh (K₃,₃) | không phẳng: chặn 2n − 4 hoặc K₃,₃ (đếm cạnh 3n − 6 không đủ) |
| U6 | Bát diện (`ch4-l06`) | 6 đỉnh, 12 cạnh | phẳng, 8 miền. m = 3n − 6 đúng bằng giới hạn: bẫy "nhiều cạnh nên không phẳng" |
| U7 | Kẻ giấu mặt (`ch4-l07`) | 8 đỉnh, 16 cạnh | không phẳng: chỉ K₃,₃ (cả hai chặn đếm cạnh đều không đủ) |
| U8 | Lưới chéo (`ch4-l08`) | 9 đỉnh, 16 cạnh | phẳng, 9 miền |

Màn phẳng và màn không phẳng xen kẽ nhau, để sinh viên không đoán theo vị trí màn (giống màn "bất khả" của *Một nét vẽ*).

## 10. Chia đội (Ch.4 – Đồ thị hai phía) · Giai đoạn 2

**Mục tiêu học:** đồ thị là hai phía khi và chỉ khi không có chu trình lẻ; kiểm tra bằng BFS.

- Chọn "cọ" Đội X (màu cam, huy hiệu chữ X) hoặc Đội Y (màu xanh dương, huy hiệu chữ Y), rồi chạm từng bạn để xếp. Chạm lại thì bỏ. Đội luôn ghi bằng chữ, không chỉ bằng màu. Bàn phím: X, Y, Delete trên đỉnh đang focus.
- Nút "Kiểm tra":
  - còn bạn chưa xếp: khoanh các bạn còn thiếu, không tính lỗi;
  - còn cạnh nối hai bạn cùng đội: tính 1 lỗi, các cạnh đó tô đỏ kèm dấu "!";
  - không còn xung đột: thắng.
- Nút "Không chia được": chạm lần lượt các đỉnh của một vòng. Đỉnh sau phải kề đỉnh trước; chạm đỉnh cuối để lùi một bước, chạm đỉnh đầu để khép vòng. Sau đó bấm "Xác nhận vòng lẻ". `judgeOddCycle()` kiểm tra đó là chu trình thật, không lặp đỉnh và có số cạnh lẻ. Sai thì tính 1 lỗi, kèm lý do.
- "Xếp lại" bỏ hết đội đã xếp. Phần "Cách máy kiểm tra" có mã giả BFS 6 dòng.
- **Gợi ý:** (1) câu hỏi dẫn dắt, ví dụ "Xếp một bạn bất kỳ vào đội X. Những bạn nối với bạn ấy buộc phải vào đội nào?"; (2) đồ thị hai phía thì tô sáng đỉnh gốc BFS và các đỉnh kề; không hai phía thì tô sáng một vòng lẻ và hỏi "Vòng này có mấy cạnh?".
- **Thẻ "Vì sao?":**
  - chia được: nêu định lý và số cách chia, 2^(c−1) với c thành phần liên thông;
  - không chia được: gán thử X, Y xen kẽ dọc vòng lẻ; cạnh khép vòng có dấu "!".

| Màn | Tên (id) | Đồ thị | Đáp án |
|---|---|---|---|
| T1 | Sáu bạn (`ch4-l09`) | 6 đỉnh, 5 cạnh (cây) | chia được |
| T2 | Vòng tròn (`ch4-l10`) | 6 đỉnh, 8 cạnh | chia được |
| T3 | Ngũ giác (`ch4-l11`) | 7 đỉnh, 7 cạnh | không chia được: vòng lẻ ngắn nhất có 5 cạnh |
| T4 | Lập phương (`ch4-l12`) | 8 đỉnh, 12 cạnh | chia được |
| T5 | Hai nhóm bạn (`ch4-l13`) | 10 đỉnh, 11 cạnh, 2 thành phần | chia được, 2 cách |
| T6 | Hai đường chéo (`ch4-l14`) | 10 đỉnh, 15 cạnh | không chia được: vòng lẻ ngắn nhất có 5 cạnh, không có tam giác |

## 11. Ống nước & nút thắt (Ch.8 – Luồng cực đại) · Giai đoạn 2

**Mục tiêu học:**
- ràng buộc dung lượng và bảo toàn luồng;
- đường tăng luồng trên đồ thị thặng dư, kể cả đi ngược cung để bớt luồng;
- Ford–Fulkerson và Edmonds–Karp;
- định lý luồng cực đại – lát cắt nhỏ nhất.

- Mỗi ống ghi "f/c" (lượng đang chảy / dung lượng). Dòng nước trong ống dày theo tỉ lệ f/c. Nhãn của ống đầy được tô nổi bật, và con số f/c luôn hiện nên không phụ thuộc màu.
- **Bước 1 – Bơm nước:**
  - Đường bắt đầu sẵn ở s. Chạm lần lượt các trạm cho tới t.
  - Đi xuôi mũi tên khi ống còn chỗ. Đi ngược mũi tên khi ống đó đang có nước: đây là cung ngược của đồ thị thặng dư, nghĩa là bớt nước ở ống đó. Đi ngược thì có ghi chú.
  - Ống đã đầy, hoặc không có ống nối: báo lý do, không tính lỗi.
  - Chạm trạm cuối để lùi một bước; chạm một trạm giữa đường để cắt đường về trạm đó.
  - Chỉnh "Lượng bơm" (mặc định bằng lượng trống nhỏ nhất trên đường) rồi bấm "Bơm". Vì chỉ bơm theo đường, luồng luôn thỏa cả ràng buộc dung lượng lẫn bảo toàn.
  - "Đặt lại" đưa về luồng lúc vào màn.
- "Đã cực đại": nếu vẫn còn đường tăng luồng thì tính 1 lỗi và không chỉ ra đường nào (gợi ý mức 2 mới chỉ). Báo đúng thì sang bước 2.
- **Bước 2 – Tìm nút thắt:**
  - Chạm các trạm để đưa vào phía S. s luôn ở phía S, t luôn ở phía T.
  - Ống từ S sang T được tô sáng và cộng dung lượng; ống từ T sang S mờ đi vì không tính.
  - "Xác nhận nút thắt": dung lượng lát cắt bằng giá trị luồng thì thắng, khác thì tính 1 lỗi. Mọi lát cắt có dung lượng bằng giá trị luồng đều được chấp nhận, không chỉ lát cắt máy tìm ra.
- **Gợi ý:**
  - Bước 1: (1) "Tìm một đường từ s tới t mà ống nào cũng còn chỗ…"; (2) tô sáng một đường tăng luồng ngắn nhất, như Edmonds–Karp chọn.
  - Bước 2: (1) "Từ s, nước còn tới được những trạm nào?"; (2) tô sáng tập đỉnh tới được từ s trên đồ thị thặng dư.
- **Thẻ "Vì sao?":** giá trị luồng bằng tổng dung lượng các ống của lát cắt; Edmonds–Karp cần bao nhiêu đường tăng luồng; ở màn có luồng sẵn, giải thích thêm vai trò của cung ngược.

| Màn | Tên (id) | Đồ thị | Luồng cực đại | Ghi chú |
|---|---|---|---|---|
| F1 | Hai đường ống (`ch8-l01`) | 4 đỉnh, 4 cung | 4 | màn làm quen |
| F2 | Ống nối (`ch8-l02`) | 4 đỉnh, 5 cung | 6 | thêm ống a → b |
| F3 | Trả nước (`ch8-l03`) | 4 đỉnh, 5 cung | 5 | có sẵn 3 đơn vị trên s → a → b → t; phải đi ngược ống a → b |
| F4 | Sáu trạm bơm (`ch8-l04`) | 6 đỉnh, 9 cung | 23 | Edmonds–Karp cần 3 đường |
| F5 | Đường vòng (`ch8-l05`) | 6 đỉnh, 8 cung | 9 | có sẵn 7 đơn vị |

## 12. Nhịp độ

Mỗi game theo nhịp răng cưa **dạy → luyện → thử thách**: màn đầu là màn làm quen, màn giữa thêm đúng một yếu tố mới, màn cuối kết hợp các yếu tố. Màn "bất khả" của *Một nét vẽ* xen giữa các màn vẽ được, để sinh viên không đoán mò theo vị trí màn.

## 13. Nội dung cần có

| Hạng mục | Số lượng | Quy mô |
|---|---|---|
| Màn BFS/DFS | 8 (+ 8 biến thể đua) | vừa |
| Màn Dijkstra | 5 (+ 5 biến thể đua) | vừa |
| Màn Một nét vẽ | 15 | vừa |
| Màn Thành phố bùn | 6 + 2 (P0+) | vừa |
| Màn Greedy, Dịch ma trận | 4 + 5 | nhỏ |
| Màn Gỡ rối, Chia đội (giai đoạn 2) | 8 + 6 | vừa |
| Màn Ống nước & nút thắt (giai đoạn 2) | 5 | vừa |
| **Tổng** | **64 màn thường + 13 màn đua** | đã làm đủ |
| Sprite thế giới, âm thanh | xem `ASSET_MANIFEST.md` | nhỏ (CC0) |

## 14. Game tương tự

- *Dijkstra's Algorithm game* (Goldsmiths): người chơi tự chạy Dijkstra, chính là ý tưởng của khung dự đoán.
- *Muddy City* và *Poor Cartographer* (CS Unplugged): hoạt động gốc của Thành phố bùn và game tô màu.
- Các game "one-stroke" trên di động: cơ chế vẽ một nét; ở đây thêm màn "bất khả" để buộc phải dùng định lý.
- *Mini Metro*: phong cách hình ảnh, và là màn boss của giai đoạn 2.
- *Planarity* (John Tantalo) và *Untangle* (Simon Tatham's Portable Puzzle Collection): cơ chế kéo đỉnh cho hết giao cắt của Gỡ rối. Ở đây thêm câu hỏi số miền và màn không phẳng phải chứng minh.

## 15. Câu hỏi còn mở

Năm câu ở mục 11 kế hoạch vẫn còn nguyên. Mã nguồn đã chừa sẵn chỗ cho từng phương án:

1. Chương 8 có trong môn không? Đã có game Ống nước & nút thắt (mục 11). Nếu môn không dạy Chương 8, chỉ cần bỏ `ch8` khỏi `CHAPTERS` trong `src/core/registry.ts`.
2. Điểm game có tính vào học phần không? Không ảnh hưởng đến code.
3. Gợi ý dùng chatbot Socratic hay tĩnh? Cả hai đều có sẵn (`HintProvider`).
4. Chấm ở client hay server? Chấm ở cả hai bằng cùng một hàm `verifySubmission()`. Khuyến nghị dùng server làm nguồn tin cậy.
5. Website đã có design system chưa? Nếu có, chỉ cần ghi đè biến trong `tokens.css`.

Câu hỏi mới phát sinh khi làm:

6. Số mục trích trong thẻ "Vì sao?" cần đối chiếu với giáo trình. Hiện chỉ dùng các số có sẵn trong kế hoạch (Định lý 3.3–3.5, Hình 5.8, Tính chất 5.15, Bài 21, Bài 24c); các chỗ khác chỉ ghi tên chương và chủ đề.
7. Đồ thị các màn là đồ thị tự thiết kế. Nếu muốn dùng đúng ví dụ và bài tập cuối chương (mục 4.1), chỉ cần thay dữ liệu trong `src/core/levels/`. Kiểm thử đơn vị tự đối chiếu loại đáp án (`expect`, `chi`) với thuật toán, và e2e tự giải lại mọi màn, nên dữ liệu nhập sai sẽ bị phát hiện.
8. Server chấm lại được bài làm (`submission`) nhưng không kiểm được thời gian của chế độ đua và số lần dùng gợi ý: hai số này do client báo. Nếu điểm game tính vào học phần (câu 2), nên để chatbot gợi ý (TV5) đếm số lần gọi ở phía server.
9. Số điểm mỗi sao (mock: 10) do TV1 hoặc giảng viên quyết.
10. API của TV1 có endpoint đọc tiến độ (`GET /progress?user_id=`, `INTEGRATION.md` mục 4.2) không? Nếu không có, game vẫn chạy và điểm vẫn cộng đúng, nhưng sinh viên đổi máy sẽ thấy các màn đã qua bị khóa lại.
11. Sự kiện `game_level_abandoned` gửi bằng `sendBeacon` lúc đóng trang, nên không gắn được header `Authorization`. Server analytics cần nhận cookie phiên cùng origin, hoặc chấp nhận bỏ qua sự kiện này khi không xác thực được.
12. Gỡ rối chỉ nhận K₅ và K₃,₃ là **đồ thị con thật**, không nhận phép chia nhỏ (subdivision) dù định lý Kuratowski có nói tới. Mọi màn không phẳng hiện tại đều chứa K₅ hoặc K₃,₃ thật. Có cần thêm màn buộc phải tìm phép chia nhỏ không? Khi đó bảng bằng chứng phải cho chọn cả đường đi thay cho cạnh.
13. Thẻ "Vì sao?" của ba game giai đoạn 2 chỉ ghi tên chương và chủ đề (Chương 4 – Đồ thị phẳng, Đồ thị hai phía; Chương 8 – Luồng cực đại), chưa có số định lý hay số mục: cần giảng viên bổ sung (giống câu 6).

## 16. Nhật ký quyết định khi làm

| # | Quyết định | Lý do |
|---|---|---|
| 1 | Bàn chơi bằng DOM/SVG + React, không dùng Phaser/canvas | Đồ thị ≤ 12 đỉnh, không cần vật lý hay cảnh lớn. Mỗi đỉnh/cạnh là một phần tử thật nên Tab, Enter/Space, tên cho trình đọc màn hình và viền focus có sẵn; chữ sắc ở mọi mức zoom; nhúng vào website chỉ cần một hàm `mountLtdtGames`. Hiệu ứng làm bằng CSS/SVG và Web Audio. |
| 2 | Điểm màn kẹp 100–1000 ở mọi game | Hoàn thành màn luôn có điểm; tránh 0 điểm khi dùng nhiều gợi ý (mục 2.3). |
| 3 | Đua với máy: 6 giây/câu (BFS/DFS), 9 giây/câu (Dijkstra) | Chơi thử: câu Dijkstra phải gõ nhiều nhãn nên cần lâu hơn. |
| 4 | Một nét vẽ màn 11 là "Ngôi sao sáu cánh" (hai tam giác rời) | Trông như một hình liền, nên bẫy "chỉ đếm bậc" mạnh hơn hai hình tách rời rõ ràng. |
| 5 | Greedy G2 "Hai tam giác" thay C7 | Thứ tự mặc định trên C7 đã đạt χ (mục 7). |
| 6 | Greedy: số màu trong huy hiệu cùng màu, nút "Tô nhanh", khóa "Chạy Greedy" khi thứ tự chưa đổi, giải thích bước thừa màu đầu tiên | Nhãn đỉnh là số; không phụ thuộc màu; mỗi lần chạy là thử nghiệm có chủ đích; phản hồi nói được *vì sao* thừa màu. |
| 7 | Thành phố bùn: nhà chặn chạm, thẻ giá chạm được và tự tránh đè | e2e trên màn 375 px phát hiện nhà che mất đường ngắn (G–I, màn 6) và thẻ giá đè nhau ở chỗ đường cắt (màn 2); xem `PLAYTEST_LOG.md`. |
| 8 | Thành phố bùn: mỗi đường là một nút bấm thật (Tab, Space) | Chơi được chỉ bằng bàn phím. |
| 9 | Dịch ma trận: tô sáng hàng của đỉnh đang chờ, Esc để hủy, khóa "Kiểm tra" khi bài làm chưa đổi | Giảm tải trí nhớ khi đối chiếu ma trận với hình; không mất lượt vì bấm lặp. |
| 10 | Hộp xác nhận gợi ý chỉ hiện lần đầu mỗi lượt chơi | Đủ để sinh viên biết gợi ý trừ sao mà không làm phiền khi đã quyết dùng. |
| 11 | `npm run dev` có mock API `/api/v1`; bản build tĩnh dùng `LocalPointsClient` (localStorage) | Chạy thử được khi chưa có API của TV1; cả hai dùng chung `verifySubmission()` và `creditFor()`. |
| 12 | Đọc tiến độ từ server (`GET /progress`) khi mở game, gộp theo giá trị lớn nhất | Trước đây tiến độ chỉ nằm trong localStorage: đổi máy thì màn đã qua bị khóa lại dù server đã ghi sao. Gộp theo giá trị lớn nhất không làm mất tiến độ ở bên nào. Tổng điểm lấy của server, trừ khi sinh viên vừa nộp bài trong lúc đang tải (khi đó số của server đã cũ). |
| 13 | `authToken` gắn vào mọi request (điểm, tiến độ, analytics, gợi ý), trừ `sendBeacon` | API thật của SmartEduAI cần xác thực; `sendBeacon` không đặt được header (câu hỏi 11). |
| 14 | Bản nhúng build ở chế độ ứng dụng, không dùng `build.lib` | Chế độ thư viện nhúng mọi font vào CSS dạng base64 (CSS 472 kB). Chế độ ứng dụng giữ font thành file riêng và trình duyệt chỉ tải subset cần dùng: CSS còn 58 kB (gzip 11 kB). |
| 15 | `base.css` trả lại mặc định cho các thẻ hay bị CSS toàn cục của trang chủ đè, bằng `:where()` trong `.lg-root` | Thử với CSS kiểu Bootstrap reboot + Tailwind preflight: tiêu đề đổi màu và cỡ, `svg` thành `display: block`, `label` thành `inline-block`… Sau khi sửa, 14 màn hình ở 1440 và 375 px không lệch thuộc tính nào (`tests/e2e/embed.spec.ts`). |
| 16 | Thẻ "Vì sao?" vẽ hình minh họa trễ 2 khung hình | Ở CPU chậm 4×, hộp kết quả và hình minh họa dựng cùng một khung gây khựng 333–383 ms; tách ra còn 150–200 ms. Khung hình có chiều cao cố định nên bố cục không bị xô lệch. |
| 17 | Thành phố bùn: sau khi bấm "Kiểm tra", thẻ phản hồi thay cho dòng trạng thái | Trên mobile, hai khối cùng hiện làm bản đồ co từ 405 xuống 300 px đúng lúc người dân đi dạo; giờ chỉ co 34 px. |
| 18 | `npm run e2e` chỉ chạy hai dự án desktop và mobile; chụp ảnh tách riêng thành `npm run shots` | Chạy kiểm thử không ghi đè ảnh trong `docs/screens/`. |
| 19 | Gỡ rối: kéo-thả, hoặc chạm đỉnh rồi chạm chỗ trống, hoặc phím mũi tên; hai đỉnh cách nhau ít nhất 84 đơn vị | Chơi được trên điện thoại mà không cần kéo chính xác, và chơi được chỉ bằng bàn phím. Khoảng cách tối thiểu chặn cách "gỡ" bằng chồng đỉnh lên nhau. Trên màn dọc, bảng xoay 90° như các game khác và phím mũi tên đổi theo để khớp hướng trên màn hình. |
| 20 | Gỡ rối: hết giao cắt chưa thắng ngay, phải trả lời số miền | Gỡ được bằng thử-sai; câu hỏi số miền nối hình vừa vẽ với công thức Euler (nguyên tắc "thưởng hiểu biết, không thưởng bấm"). |
| 21 | Gỡ rối: bằng chứng Kuratowski chỉ nhận đồ thị con K₅ / K₃,₃ thật | Chạm chọn 5 hoặc 6 đỉnh là đủ, chấm rõ ràng. Màn 7 không chứng minh được bằng đếm cạnh, nên buộc phải tìm K₃,₃ (câu hỏi 12). |
| 22 | Chia đội: "Kiểm tra" khi chưa xếp hết không tính lỗi | Chưa xếp hết chưa phải là một kết luận sai; game chỉ khoanh các bạn còn thiếu. |
| 23 | Ống nước: luồng chỉ thay đổi bằng cách bơm theo một đường từ s tới t, không cho gõ số cho từng ống | Luồng luôn hợp lệ (dung lượng, bảo toàn), nên phản hồi tập trung vào điều cần học: ống nào đầy, khi nào được đi ngược, khi nào hết đường tăng luồng. Màn 3 và 5 có luồng sẵn để buộc phải dùng cung ngược. |
| 24 | Thanh nút dưới màn chơi: hai cột bên là `minmax(max-content, 1fr)`; dưới 480 px, nút phụ chỉ còn biểu tượng (vẫn có `aria-label`) | Ảnh chụp 375 px cho thấy nút "Kiểm tra" của Chia đội đè lên "Không chia được". Màn rộng vẫn giữ nút giữa nằm chính giữa. |
| 25 | Giao diện của từng game là một chunk riêng (`React.lazy` trong `PlayScreen`), chỉ tải khi mở màn | Thêm ba game làm bản nhúng tăng từ 439 lên 511 kB, vượt ngưỡng cảnh báo 500 kB của Vite. Sau khi tách, sảnh chỉ tải 236 kB (gzip 73 kB); khung màn chơi dùng chung và game được mở tải sau. |
