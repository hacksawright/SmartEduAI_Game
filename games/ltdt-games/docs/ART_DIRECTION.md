# Art Direction – Game hóa LTDT (SmartEduAI)

> Nguồn: mục 7 của `ke-hoach-game-hoa-LTDT.md` (bản chốt UI) và quy trình của `web_game_ai_skills_guide.md` (mục 5–6).
> Khi website SmartEduAI có design system riêng: chỉ cần ghi đè biến màu trong `src/ui/tokens.css`. Bố cục, font và quy tắc giữ nguyên.

## 1. Một câu định hướng

**"Đồ thị là nhân vật chính."** Khung giao diện phẳng, trung tính, số liệu đọc chính xác. Màu và chuyển động chỉ dành cho trạng thái của đồ thị và các khoảnh khắc nhận thưởng. Mỗi thao tác đều có phản hồi bằng chuyển động và âm thanh, cường độ tỷ lệ với tầm quan trọng của sự kiện.

Người chơi là sinh viên đại học, không phải trẻ em. Không dùng mascot, emoji hay màu kẹo ngọt. Muốn tạo cảm giác "game" thì dùng phản hồi tốt, không dùng trang trí.

## 2. Tham chiếu phong cách (học phong cách, không sao chép asset)

| Tham chiếu | Lấy gì |
|---|---|
| Mini Metro (Dinosaur Polo Club) | Đường và nút phẳng, rất kiềm chế; màu chỉ mang nghĩa; ít chữ |
| Brilliant.org (bài học tương tác) | Học bằng cách **dự đoán trước, xem kết quả sau**; giải thích ngắn ngay sau câu trả lời |
| Duolingo | Khoảnh khắc thưởng (sao, chuỗi đúng) dứt khoát, nút to dễ chạm |
| Kenney – RTS Medieval | Thế giới của *Thành phố bùn*: nhà nhìn từ trên xuống, nét viền mềm, bảng màu ấm |

## 3. Màu

### 3.1 Token giao diện (bảng Online Course/E-learning, mục 7.2)

| Token | Hex | Dùng cho | Tương phản đã đo |
|---|---|---|---|
| `--c-primary` | `#0D9488` | Thanh tiến độ, viền chọn, icon nhấn | chữ trắng 3.74 → chỉ chữ lớn |
| `--c-primary-strong` | `#0F766E` | Nút/chip teal có chữ nhỏ, cạnh kết quả | chữ trắng 5.47 (AA) |
| `--c-secondary` | `#2DD4BF` | Nền phụ, vệt sáng | chữ `#134E4A` 5.09 (AA) |
| `--c-accent` | `#EA580C` | CTA chính, sao, phần thưởng | chữ trắng 3.56 → **chỉ dùng chữ trắng cho chữ ≥ 18.66px đậm**; chữ nhỏ dùng `#1C1917` (4.91) |
| `--c-bg` | `#F0FDFA` | Nền trang | |
| `--c-card` | `#FFFFFF` | Thẻ, bảng, canvas đồ thị | |
| `--c-text` | `#134E4A` | Chữ chính | 9.48 trên trắng (AAA) |
| `--c-text-muted` | `#3D6A66` | Chữ phụ | 6.08 trên trắng (AA) |
| `--c-border` | `#5EEAD4` | Viền trang trí của thẻ (không dùng cho ô nhập) | |
| `--c-border-strong` | `#3D6A66` | Viền ô nhập, viền nút phụ | ≥ 3:1 (đồ họa) |
| `--c-error` | `#DC2626` | Lỗi, mất mạng | 4.83 trên trắng (AA) |

Quy tắc nút: CTA chính là nút cam, chữ Baloo 2 đậm 19–20px màu trắng (đạt AA cho chữ lớn). Nút phụ: nền trắng, viền `--c-border-strong`, chữ `--c-text`. Không đặt chữ `#134E4A` lên nền teal hay cam (chỉ đạt 2.5:1).

### 3.2 Trạng thái đỉnh (mục 7.2, đã chỉnh để đạt tương phản)

| Trạng thái | Nền | Viền | Dấu hiệu ngoài màu |
|---|---|---|---|
| Chưa thăm | `#E2E8F0` | `#64748B` 2px | viền mảnh *(kế hoạch ghi `#94A3B8`; đổi sang `#64748B` vì `#94A3B8` chỉ đạt 2.56:1 trên nền trắng)* |
| Trong queue/stack | `#FDE68A` | `#D97706` 3px **nét đứt** | nhãn số thứ tự trong hàng (huy hiệu nhỏ góc trên phải) |
| Đang xét | giữ nền hiện tại | `#EA580C` 4px | vòng sáng tỏa ra (tắt khi giảm chuyển động) |
| Đã xong / nhãn cố định | `#0D9488` | `#0F766E` | chữ `#001F1C` (4.62:1) + **icon dấu tích** |
| Cạnh kết quả | | `#0F766E` 6px | nét đậm |
| Cạnh thường | | `#7C8DA3` 3px | *(đổi từ `#94A3B8` để đạt 3:1)* |

### 3.3 Game tô màu (Ch.5): Okabe–Ito

`#E69F00` `#56B4E9` `#009E73` `#F0E442` `#0072B2` `#D55E00` `#CC79A7`. **Luôn ghi số màu bên trong đỉnh.**

### 3.4 Thế giới *Thành phố bùn*

Lấy toàn bộ bảng màu của gói Kenney RTS Medieval: cỏ xanh, đất vàng nâu, đá xám. Đường đất vẽ bằng SVG và tô bằng texture đất của chính gói đó; đường đã lát tô bằng texture đá. Thẻ chi phí là nhãn trắng, số JetBrains Mono, để luôn đọc chính xác trên mọi nền.

## 4. Chữ

| Vai trò | Font | Cỡ / độ đậm |
|---|---|---|
| Tiêu đề màn, tên game, nút | **Baloo 2** | 20 / 24 / 32 / 40px, đậm 600–800 |
| Nội dung, câu hỏi, giải thích | **Be Vietnam Pro** | 14 / 15 / 16px, 400–600, line-height 1.55 |
| Số: d[v], trọng số, ma trận, bộ đếm | **JetBrains Mono** | 13–18px, `font-variant-numeric: tabular-nums` |

- Cả ba font tự host qua `@fontsource` (license OFL), chỉ nạp subset `latin` + `vietnamese`.
- Không dùng Fredoka hay DM Sans: dữ liệu font của skill xác nhận hai font này không có subset `vietnamese`.
- Mỗi dòng giải thích tối đa khoảng 70 ký tự. Viết hoa kiểu câu, không viết hoa toàn bộ nhãn.

## 5. Hình khối, nét, khoảng cách

- Lưới 8px. Khoảng cách giữa các vùng chạm ≥ 8px.
- Bo góc theo cấp: thẻ lớn 20px · nút 14px · chip 999px · ô nhập 10px. Không dùng một bán kính cho mọi thứ.
- Đỉnh: bán kính 22px trên màn hình, vùng chạm ≥ 44px. Khi canvas thu nhỏ, bán kính được bù để không xuống dưới 22px thật.
- Bóng: giao diện phẳng **không đổ bóng**, chỉ có viền 1px. Bóng chỉ thuộc về Claymorphism (mục 8).

## 6. Bố cục

```
┌──────────────────────────────────────────────────┐
│ Ch.6 · Màn 3    mạng ♥♥♥   sao ★★☆   [Gợi ý] [X] │  thanh trên (56px)
├────────────────────────────────┬─────────────────┤
│                                │ Câu hỏi dự đoán │
│        Canvas đồ thị (SVG)     │ ─────────────── │  panel 360–400px
│                                │ queue / stack / │
│                                │ bảng nhãn       │
├────────────────────────────────┴─────────────────┤
│ [Hoàn tác]          Bước 4/9          [Xác nhận] │  thanh điều khiển (72px)
└──────────────────────────────────────────────────┘
```

- ≥ 1024px: panel bên phải. 768–1023px: panel hẹp lại (320px). < 768px: panel thành **bottom sheet**: trạng thái thu gọn hiện câu hỏi và nút xác nhận, kéo hoặc chạm để mở rộng; canvas chiếm toàn bộ chiều rộng.
- Kiểm tra ở 375, 768, 1024 và 1440px.
- Trang chọn chương: Bento grid, ô lớn cho chương có game P0, ô nhỏ "Giai đoạn 2" cho chương chưa có game.

## 7. Icon

Chỉ dùng **Lucide** (SVG, nét 2px, cỡ 20 hoặc 24px). Không dùng emoji ở bất kỳ đâu. Mạng = `Heart`, sao = `Star`, gợi ý = `Lightbulb`, đua với máy = `Bot`, bất khả = `Ban`, làm lại = `RotateCcw`.

## 8. Claymorphism (chỉ cho khoảnh khắc thưởng)

Chỉ dùng ở: thẻ màn trên trang chọn màn, thẻ kết quả (sao), huy hiệu, thẻ "Vì sao?".

```css
background: #FFFFFF;
border-radius: 28px;
box-shadow:
  0 18px 36px -12px rgb(13 148 136 / .35),   /* bóng ngoài màu teal, không dùng xám */
  inset 0 -6px 0 rgb(13 148 136 / .12),       /* mép dưới dày như đất sét */
  inset 0 2px 0 rgb(255 255 255 / .9);        /* gờ sáng phía trên */
```

## 9. Chuyển động

| Token | Giá trị | Dùng cho |
|---|---|---|
| `--t-fast` | 120ms | hover, nhấn nút |
| `--t-base` | 220ms | chọn đỉnh, chip vào hàng đợi |
| `--t-slow` | 420ms | vẽ cạnh, lát đường, mở bottom sheet |
| `--ease-out` | `cubic-bezier(.2,.8,.2,1)` | dừng lại (settle) |
| `--ease-pop` | `cubic-bezier(.34,1.56,.64,1)` | bật nảy khi xuất hiện (overshoot) |

**Cấp phản hồi** (theo skill `game-feel`: phản hồi nhiều lớp, cường độ tỷ lệ tầm quan trọng):

| Cấp | Sự kiện | Phản hồi |
|---|---|---|
| Nhỏ | chạm đỉnh, chọn chip | đỉnh nảy 1.12×, tiếng tick |
| Vừa | dự đoán đúng / sai, vẽ xong một cạnh, lát một đường | đúng: vòng sáng teal + tiếng xác nhận + bộ đếm chuỗi đúng; sai: canvas rung nhẹ (≤ 6px, 280ms), tim vỡ, tiếng lỗi |
| Lớn | thắng màn, nhận huy hiệu | pháo giấy (≤ 80 hạt), sao bật lần lượt với cao độ tăng dần, jingle |

**Giảm chuyển động:** khi `prefers-reduced-motion: reduce` hoặc người dùng bật trong Cài đặt, mọi hiệu ứng nảy, rung và pháo giấy chuyển sang đổi trạng thái tức thì hoặc mờ dần 150ms. Không có hiệu ứng nhấp nháy ở bất kỳ chế độ nào.

## 10. VFX

- **Vẽ cạnh** (Một nét vẽ): nét mực chạy dọc cạnh bằng `stroke-dashoffset`, đầu bút màu cam.
- **Lát đường** (Thành phố bùn): lớp đá phủ dần từ nhà này sang nhà kia. Khi cả thành phố liên thông, vài người dân (sprite Kenney) đi dọc các đường đã lát.
- **Đỉnh đang xét:** vòng sáng cam tỏa ra theo chu kỳ 1.6s.
- **Pháo giấy:** canvas phủ trên cùng, màu lấy từ token (teal, cam, vàng `#FDE68A`), tự dọn sau 1.8s.

## 11. Âm thanh

Kenney Interface Sounds và Music Jingles (CC0), chi tiết trong `ASSET_MANIFEST.md`. Âm lượng mặc định 70%; có nút tắt tiếng trên thanh trên và lưu lựa chọn. Chỉ phát sau tương tác đầu tiên của người dùng, theo chính sách autoplay của trình duyệt.

## 12. Nên / Không nên

| Nên | Không nên |
|---|---|
| Màu mang nghĩa (trạng thái, đáp án) | Màu trang trí, gradient làm nền |
| Số luôn dùng JetBrains Mono, căn cột | Số chạy hiệu ứng đếm làm khó đọc giá trị |
| Sai thì nói rõ sai ở đâu và vì sao | Thông báo lỗi chung chung kiểu "Sai rồi!" |
| Asset thật (Kenney) cho thế giới Thành phố bùn | Nhà/cây vẽ bằng hình khối SVG tự chế |
| Một khoảnh khắc thưởng thật đã | Rắc hiệu ứng ở mọi nơi |
