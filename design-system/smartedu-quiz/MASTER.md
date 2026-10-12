# Design system: Quiz SmartEdu

Áp dụng cho phần **Quiz** của SmartEdu: Luyện tập theo chương (`/practice`: danh sách chương, làm bài,
kết quả) và Bảng xếp hạng tuần (`/leaderboard`). Mỗi trang có ghi chú riêng trong `pages/`:

- [pages/practice.md](pages/practice.md)
- [pages/leaderboard.md](pages/leaderboard.md)

Module Trò chơi (`/games`) giữ giao diện riêng (Claymorphism, xem `games/ltdt-games/docs/ART_DIRECTION.md`).
SmartEdu chỉ ghi đè màu chủ đạo của game sang màu indigo của app (`src/styles.css`, khối `.se-games`).

## 1. Nguồn tham khảo

Bộ dữ liệu của skill **UI UX Pro Max** v2.13.0
(<https://github.com/nextlevelbuilder/ui-ux-pro-max-skill>). Script tra cứu `search.py` của skill bị chặn
trong môi trường làm việc, nên các dòng dưới được đọc trực tiếp từ file CSV trong `data/`.

| Bảng | Dòng | Nội dung dùng |
|---|---|---|
| `products.csv`, `ui-reasoning.csv` | #9 Educational App | Claymorphism + Micro-interactions; màu vui, phân cấp rõ |
| `products.csv`, `ui-reasoning.csv` | #103 Flashcard & Study Tool | Màu "đúng" xanh lá, "sai" đỏ, tiến độ xanh dương; tránh: style không đồng nhất, tương phản kém |
| `products.csv`, `ui-reasoning.csv` | #121 Trivia & Quiz Game | Vibrant & Block-based; vàng cho bảng xếp hạng; hoạt cảnh ngắn |
| `products.csv`, `ui-reasoning.csv` | #179 LMS | **Flat Design + Accessible & Ethical**; ưu tiên rõ ràng, vùng chạm lớn trên mobile; tránh: điều hướng rối, mobile kém |
| `typography.csv` | #21 Vietnamese Friendly | Be Vietnam Pro cho tiêu đề |
| `ux-guidelines.csv` | #9, #10, #22, #28, #33, #36, #37, #44, #45, #78, #80, #100 | Giảm chuyển động, trạng thái tải, vùng chạm, focus, báo lỗi, tương phản, không chỉ dựa vào màu, skip link, khôi phục lỗi, focus không bị che |

## 2. Hướng phong cách

Quiz nằm trong khung SmartEdu (shadcn/Tailwind, thẻ phẳng, bo góc lớn), nên nền là
**Flat + Accessible** (dòng #179). Từ dòng #9/#103 lấy **micro-interaction** khi chọn đáp án, khi thanh
tiến độ chạy và khi vòng điểm lấp đầy. Dòng #121 dùng có chừng mực ở màn kết quả và bảng xếp hạng:
khối màu huy chương (vàng, bạc, đồng), vòng điểm vàng khi đạt điểm tối đa.

Không dùng Claymorphism cho Quiz: bóng nhiều lớp và viền dày làm Quiz lệch khỏi các trang khác của
SmartEdu. Phong cách đó dành cho module Trò chơi.

## 3. Màu

Token khai báo ở `src/styles.css` (`:root`, ánh xạ qua `@theme inline` thành class `text-*`, `bg-*`).
Các màu nền sẵn có của app (`--primary`, `--success`, `--danger`, `--xp`) không đủ 4.5:1 khi làm màu
chữ trên nền trắng, nên Quiz có thêm các token `*-strong` cho chữ và `*-soft` cho nền nhạt.

| Token | Vai trò |
|---|---|
| `--primary` | Nút chính, vòng điểm, đoạn tiến độ "đang làm" |
| `--primary-strong` | Chữ nhấn màu indigo, mục điều hướng đang chọn |
| `--success-strong` / `--success-soft` | Đáp án đúng, chip "Tối đa", đoạn tiến độ đúng |
| `--danger-strong` / `--danger-soft` | Đáp án sai, thông báo lỗi |
| `--gold` / `--gold-strong` / `--gold-soft` | Hạng 1, điểm trên bảng xếp hạng, liên kết "Xem bảng xếp hạng" |
| `--silver` / `--silver-strong` | Hạng 2 |
| `--bronze` / `--bronze-strong` | Hạng 3 |

Tỉ lệ tương phản đã đo (WCAG 2.x):

| Chữ / nền | Tỉ lệ |
|---|---|
| chữ trắng trên `--primary` | 5.19:1 |
| `--primary-strong` trên trắng | 7.9:1 |
| `--primary-strong` (#4338ca) trên `--primary-soft` | 6.98:1 |
| chữ trắng trên `--success-strong` | 5.48:1 |
| `--success-strong` trên `--success-soft` | 5.2:1 |
| chữ trắng trên `--danger-strong` | 6.47:1 |
| `--danger-strong` trên `--danger-soft` | 5.9:1 |
| `--foreground` trên `--gold` | 8.93:1 |
| `--gold-strong` (#b45307) trên `--gold-soft` | 4.84:1 |
| `--foreground` trên `--silver` | 7.48:1 |
| chữ trắng trên `--bronze` | 5.18:1 |

Đúng/sai không chỉ dựa vào màu (UX #37): mỗi trạng thái có thêm icon (✓/✗ dạng SVG lucide), chữ
("Chính xác!", "Chưa đúng") và nhãn ẩn cho trình đọc màn hình ở thanh tiến độ.

## 4. Chữ

- **Be Vietnam Pro** (dòng #21) cho cả tiêu đề và nội dung: app đã tải sẵn font này; không thêm
  Noto Sans để tránh tải thêm một họ font.
- Tiêu đề trang `text-2xl` (mobile) / `text-3xl` (từ `md`), đậm 700; câu hỏi `text-lg`/`text-xl`, đậm 600.
- Mọi con số điểm, hạng, đếm dùng `tabular-nums` để không nhảy khi thay đổi.

## 5. Bố cục và bề mặt

- Khung nội dung `max-w-5xl` (danh sách chương, bảng xếp hạng), `max-w-2xl` (làm bài, kết quả).
- Bề mặt chính: `rounded-3xl border bg-card shadow-[var(--shadow-soft)]` (hằng `surface` trong
  `src/features/quiz/ui.tsx`). Thẻ con `rounded-2xl`.
- Lưới chương: 1 cột (mobile), 2 cột (từ `md`).
- Mobile: thanh hành động của bài làm dính phía trên thanh điều hướng dưới
  (`bottom-[calc(4rem+env(safe-area-inset-bottom))]`), không che nội dung.

## 6. Thành phần dùng chung (`src/features/quiz/ui.tsx`)

- `ScoreRing`: vòng điểm SVG, lấp đầy trong 0.8s (tắt khi người dùng bật giảm chuyển động); màu
  vàng khi đạt điểm tối đa.
- `StatusChip`: chip trạng thái `muted | primary | success | danger | gold`, luôn có chữ, icon tùy chọn.
- `focusRing`: viền focus 3px màu `--primary`, cách 2px (UX #28, #102).

## 7. Tương tác và chuyển động

- Thời lượng 150–300ms cho đổi trạng thái (chọn đáp án, hover thẻ, hiện phản hồi); 500ms cho thanh
  tiến độ; 800ms cho vòng điểm.
- `MotionConfig reducedMotion="user"` bao các trang Quiz, `useReducedMotion` cho hoạt cảnh tự viết;
  class Tailwind dùng `motion-safe:`/`motion-reduce:` (UX #9).
- Không dùng emoji làm icon: chỉ dùng icon SVG của lucide-react.
- Con trỏ `cursor-pointer` cho mọi phần tử bấm được.

## 8. Khả năng truy cập

- Vùng chạm tối thiểu 44×44px: nút `min-h-11`, đáp án `min-h-14`, mục điều hướng dưới cao 64px (UX #22).
- Đáp án là `radiogroup` với radio thật (ẩn bằng `sr-only`), chọn được bằng chuột, cảm ứng, phím
  mũi tên, và phím tắt 1–4 / A–D; Enter để kiểm tra rồi sang câu tiếp.
- Phản hồi đúng/sai nằm trong vùng `role="status" aria-live="polite"` luôn có sẵn trong DOM.
- Khi sang câu mới, tiêu điểm chuyển vào câu hỏi (`h1` có `tabIndex=-1`).
- Lỗi đọc/ghi Supabase hiện bằng `role="alert"`, nói rõ nguyên nhân và có nút "Thử lại" (UX #33, #44, #80).
- Trạng thái tải dùng khung xương (skeleton) cùng kích thước nội dung thật (UX #10, #78).
- Skip link "Bỏ qua điều hướng" ở đầu trang (UX #45); thanh dưới không che tiêu điểm (UX #100).
- Bục top 3: thứ tự DOM là hạng 1–2–3, CSS `order` mới xếp thành 2–1–3 để trình đọc màn hình đọc đúng.

## 9. Không làm

- Không dùng màu `--success`/`--danger`/`--xp` làm màu chữ trên nền trắng.
- Không đổi luật chấm điểm, cách tính điểm tuần hay thứ tự xếp hạng khi chỉnh giao diện (logic nằm
  ở `src/features/quiz/scoring.ts` và `api.ts`, có test riêng).
- Không đưa điểm hay huy hiệu của Trò chơi vào màn Quiz.
- Chưa có giao diện tối: app không bật class `.dark`. Khi bật, cần thêm giá trị `.dark` cho các token `*-strong`/`*-soft`.
