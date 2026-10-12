# Trang Bảng xếp hạng tuần (`/leaderboard`)

Quy tắc chung: [../MASTER.md](../MASTER.md). Mã: `src/routes/_app.leaderboard.tsx`,
`src/features/quiz/LeaderboardView.tsx`.

Bảng chỉ tính điểm **Luyện tập theo chương**: tổng điểm cao nhất của từng chương trong tuần (tối đa
800). Bằng điểm thì xếp theo tên (so sánh tiếng Việt). Tuần bắt đầu thứ Hai theo giờ Việt Nam.

## Bố cục

1. **Đầu trang**: "Bảng xếp hạng · Luyện tập", tiêu đề "Bảng xếp hạng tuần", nhãn tuần và luật tính điểm.
2. **Hạng của bạn** (3/5 chiều rộng trên máy tính):
   - có điểm: "#hạng", số điểm, số chương có điểm, và một câu cho biết bước tiếp theo: đang dẫn đầu,
     "Còn N điểm nữa là bằng Tên (hạng #k)", hoặc đang bằng điểm với người phía trên;
   - chưa có điểm: "Bạn chưa có điểm tuần này" và nút "Luyện tập ngay".
3. **Giải tuần** (2/5): tên giải và mô tả do giảng viên nhập (bảng `weekly_prizes`), người đang dẫn đầu.
4. **Ba hạng đầu**: bục với khối vàng, bạc, đồng (chỉ hiện khi có từ 3 người). Thứ tự DOM 1–2–3,
   hiển thị 2–1–3.
5. **Quanh vị trí của bạn**: giữ công thức cũ, chỉ hiện khi bạn ở hạng 4 trở xuống.
6. **Top tuần này**: 20 người đầu, mỗi dòng có huy hiệu hạng, chữ cái đầu tên, tên (+ chip "Bạn"),
   "Cấp L · danh hiệu · n chương", điểm màu vàng đậm. Dòng của bạn có `aria-current="true"` và nền nhạt.
7. **Ghi chú cuối**: điểm và huy hiệu của Trò chơi đồ thị tính riêng, không cộng vào bảng này.

## Trạng thái

- Đang tải: khung xương cho thẻ hạng và danh sách.
- Tuần chưa có điểm: "Chưa có điểm nào trong tuần này" và liên kết "Làm bài Luyện tập".
- Lỗi đọc dữ liệu: khối `role="alert"` nêu file migration cần chạy, nút "Thử lại".

## Kiểm tra

- Unit: `rankWeeklyAttempts`, `rankingWindow`, `gapToNextRank` trong `src/features/quiz/scoring.test.ts`.
- E2E: `e2e/leaderboard.spec.ts` (thứ tự 11 người với điểm bằng nhau, bục, "Quanh vị trí của bạn",
  giải tuần, người dẫn đầu, trạng thái trống).
