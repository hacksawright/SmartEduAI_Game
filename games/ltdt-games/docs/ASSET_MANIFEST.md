# Asset Manifest

> Quy tắc (theo `web_game_ai_skills_guide.md` mục 5.2): mọi asset đều ghi rõ nguồn và license. Không dùng asset chưa rõ license. Placeholder phải được liệt kê ở mục 4.
> Bản gốc license nằm trong `public/assets/licenses/`.

## 1. Font và icon (gói npm, tự host)

| Asset | Gói | License | Dùng cho |
|---|---|---|---|
| Baloo 2 (subset latin + vietnamese) | `@fontsource/baloo-2` | SIL OFL 1.1 | tiêu đề, nút |
| Be Vietnam Pro (subset latin + vietnamese) | `@fontsource/be-vietnam-pro` | SIL OFL 1.1 | nội dung |
| JetBrains Mono (subset latin + vietnamese) | `@fontsource/jetbrains-mono` | SIL OFL 1.1 | số, nhãn d[v], trọng số |
| Lucide icons | `lucide-react` | ISC | toàn bộ icon giao diện (SVG, không dùng emoji) |

Font được nạp qua `src/ui/fonts.css` (chỉ các subset và độ đậm thật sự dùng), đóng gói cùng bản build nên không gọi Google Fonts lúc chạy. Hai dấu ✓/✗ trong dòng giải thích phép giảm nhãn của Dijkstra là ký tự chữ của font, không phải icon.

## 2. Hình ảnh – Kenney "RTS Medieval" (CC0)

Nguồn: https://kenney.nl/assets/medieval-rts · License: Creative Commons CC0 1.0 (`licenses/kenney-rts-medieval.txt`). Dùng bản Retina (128×128). Credit "Kenney.nl" không bắt buộc nhưng có ghi ở **Cài đặt → Ghi công**.

| File trong dự án | File gốc (PNG/Retina) | Dùng cho | Trạng thái |
|---|---|---|---|
| `town/house-1.png` … `house-10.png` | `Structure/medievalStructure_17, 18, 20, 21, 23, 11, 09, 03, 16, 19` | nhà (đỉnh) trong Thành phố bùn | dùng 7 kiểu: `house-1, 2, 3, 4, 7, 9, 10` (`HOUSES` trong `TownBoard.tsx`); `house-5, 6, 8` chưa dùng (dự phòng) |
| `town/tree-cypress.png`, `tree-cypress-small.png` | `Environment/medievalEnvironment_01, 21` | trang trí | dùng |
| `town/tree-pine.png`, `tree-pine-small.png` | `Environment/medievalEnvironment_03, 02` | trang trí | dùng |
| `town/rock-1..3.png`, `rock-brown-1..2.png` | `Environment/medievalEnvironment_06, 07, 08, 13, 14` | trang trí | dùng `rock-1, 2`; `rock-3`, `rock-brown-1..2` chưa dùng (dự phòng) |
| `town/bush-1.png`, `bush-2.png`, `log.png`, `stump.png` | `Environment/medievalEnvironment_12, 19, 05, 04` | trang trí | dùng |
| `town/statue.png`, `market.png` | `Structure/medievalStructure_12, 22` | trang trí màn lớn | chưa dùng (dự phòng) |
| `town/tile-grass.png` | `Tile/medievalTile_57` | nền cỏ (lặp) | dùng |
| `town/tile-dirt.png` | `Tile/medievalTile_13` | texture đường đất (bùn) | dùng |
| `town/tile-stone.png` | `Tile/medievalTile_15` | texture đường đã lát | dùng |
| `town/villager-1..4.png` | `Unit/medievalUnit_01, 06, 13, 24` | người dân đi dạo khi thắng | dùng |

Các file "chưa dùng" vẫn được chép vào bản build (tổng khoảng 15 KB). Xóa khỏi `public/assets/town/` nếu muốn bản build gọn hơn; không có mã nào tham chiếu tới chúng.

Mọi hình khác (đồ thị, đỉnh, cạnh, sao, pháo giấy, minh họa trên sảnh) là SVG/CSS/canvas vẽ bằng mã theo `ART_DIRECTION.md`: đây là phong cách chủ đích của một game sơ đồ, không phải placeholder.

## 3. Âm thanh – Kenney (CC0)

| File trong dự án | Gói / file gốc | Sự kiện | Trạng thái |
|---|---|---|---|
| `audio/tap.ogg` | Interface Sounds / `select_001` | chạm đỉnh, chọn | dùng |
| `audio/tick.ogg` | Interface Sounds / `tick_002` | chip vào hàng đợi | dùng |
| `audio/undo.ogg` | Interface Sounds / `back_002` | hoàn tác, bỏ chọn | dùng |
| `audio/correct.ogg` | Interface Sounds / `confirmation_001` | dự đoán đúng | dùng |
| `audio/invalid.ogg` | Interface Sounds / `error_008` | thao tác không hợp lệ (không tính lỗi) | dùng |
| `audio/wrong.ogg` | Interface Sounds / `error_005` | dự đoán sai, mất mạng | dùng |
| `audio/draw.ogg` | Interface Sounds / `scratch_001` | vẽ một cạnh | dùng |
| `audio/pave.ogg`, `unpave.ogg` | Interface Sounds / `drop_002`, `drop_001` | lát / bỏ lát đường | dùng |
| `audio/stuck.ogg` | Interface Sounds / `bong_001` | bị kẹt | dùng |
| `audio/open.ogg`, `close.ogg` | Interface Sounds / `open_001`, `close_001` | mở/đóng bảng | dùng |
| `audio/hint.ogg` | Interface Sounds / `question_002` | hiện gợi ý | dùng |
| `audio/star.ogg` | Interface Sounds / `pluck_002` | từng ngôi sao bật lên (cao độ tăng dần) | dùng |
| `audio/toggle.ogg` | Interface Sounds / `toggle_001` | bật/tắt chế độ | dùng |
| `audio/win.ogg` | Music Jingles / `jingles_PIZZI10` (0,8 s, đi lên kiểu trưởng) | thắng màn | dùng |
| `audio/badge.ogg` | Music Jingles / `jingles_PIZZI02` (0,96 s, chạy gam đi lên) | nhận huy hiệu | dùng |
| `audio/fail.ogg` | Music Jingles / `jingles_PIZZI11` (0,8 s, đi xuống nhẹ) | hết mạng, thua máy | dùng |

Nguồn: https://kenney.nl/assets/interface-sounds · https://kenney.nl/assets/music-jingles · License CC0 1.0.

## 4. Placeholder và việc còn mở

| Hạng mục | Tình trạng | Ghi chú |
|---|---|---|
| Jingle thắng/thua/huy hiệu | đã chọn | giải mã bằng Web Audio trong Chromium, ước lượng cao độ theo từng khung 40 ms: chọn đoạn đi lên cho thắng/huy hiệu, đoạn đi xuống ngắn và nhẹ cho thua |
| Định dạng âm thanh cho Safari cũ | rủi ro | file OGG Vorbis; nếu trình duyệt không giải mã được thì tự chuyển sang âm tổng hợp bằng Web Audio, không báo lỗi. Muốn có đúng tiếng gốc trên Safari đời cũ thì thêm bản MP3/M4A và sửa `src/services/audio.ts` |
| Placeholder | không có | mọi asset trong game đều là asset thật đã ghi nguồn ở trên |
