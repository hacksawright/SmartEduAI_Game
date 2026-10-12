# Trang Luyện tập theo chương (`/practice`)

Quy tắc chung: [../MASTER.md](../MASTER.md). Mã: `src/routes/_app.practice.tsx`, `src/features/quiz/`.

Trang có ba màn, đổi trong cùng route (không đổi URL): danh sách chương → làm bài → kết quả.

## 1. Danh sách chương (`ChapterHub.tsx`)

Thứ tự từ trên xuống:

1. **Đầu trang**: dòng nhỏ "Luyện tập · Lý thuyết đồ thị", tiêu đề "Luyện theo chương", một câu giải
   thích luật điểm (5 câu, 20 điểm/câu, mỗi chương chỉ tính điểm cao nhất trong tuần).
2. **Điểm tuần**: số điểm lớn `/ 800 điểm`, nhãn tuần, liên kết vàng "Xem bảng xếp hạng"; thanh 8 đoạn
   (mỗi đoạn một chương, đậm theo tỉ lệ điểm); ba số: Đã làm, Đạt tối đa, Mỗi câu đúng.
3. **Lưới 8 chương**: mỗi thẻ là một nút, gồm số chương, tên, "Chương n · 5 câu", chip trạng thái
   (Chưa làm / Đã làm / Tối đa), thanh điểm cao nhất tuần, chữ "Bắt đầu" hoặc "Làm lại".
4. **Gợi ý Trò chơi**: một khối nhỏ dẫn sang `/games`, ghi rõ điểm trò chơi không cộng vào điểm tuần.

Trạng thái:

- Đang tải điểm: chip và thanh điểm hiện khung xương; vẫn bấm vào chương được.
- Lỗi đọc điểm (ví dụ chưa chạy migration): khối `role="alert"` "Chưa đọc được điểm tuần" kèm hướng
  dẫn chạy migration và nút "Thử lại". Vẫn làm bài được.

## 2. Làm bài (`ChapterQuiz.tsx`)

- **Thanh trên**: nút "Thoát" (hỏi xác nhận nếu đã chọn đáp án hoặc đã qua câu 1), thanh tiến độ 5 đoạn
  (đúng / sai / đang làm / chưa làm, mỗi đoạn có nhãn ẩn cho trình đọc màn hình), "n/5".
- **Câu hỏi**: "Câu i / 5" rồi câu hỏi là `h1`; tiêu điểm chuyển vào đây mỗi khi sang câu mới.
- **Đáp án**: 4 dòng có chữ cái A–D, cao tối thiểu 56px. Sau khi kiểm tra: đáp án đúng viền và nền
  xanh kèm dấu ✓; đáp án đã chọn nếu sai viền và nền đỏ kèm dấu ✗; các dòng khác mờ đi.
- **Phản hồi**: "Chính xác! +20 điểm" hoặc "Chưa đúng" + "Đáp án đúng: …", luôn kèm lời giải thích.
- **Thanh hành động**: nút "Kiểm tra" → "Câu tiếp" → "Xem điểm". Trên máy tính có dòng gợi ý phím tắt
  (1–4 chọn, Enter kiểm tra/tiếp). Trên mobile thanh này dính phía trên thanh điều hướng dưới.
- **Hộp thoại thoát**: "Thoát bài làm?" — "Làm tiếp" / "Thoát, không lưu".

Bài làm chỉ được lưu một lần, khi bấm "Xem điểm" ở câu cuối (giữ nguyên thứ tự ghi của bản cũ:
lần làm → nhật ký XP → hồ sơ → bảng tin nếu đạt tối đa).

## 3. Kết quả (`QuizResult.tsx`)

- Lời nhận xét theo điểm: tối đa "Xuất sắc! Trọn điểm chương này"; từ 60% "Làm tốt lắm!"; trên 0
  "Có tiến bộ, thử thêm lần nữa nhé"; 0 điểm có lời động viên riêng.
- Vòng điểm (vàng khi tối đa) và ba số: Câu đúng, Cao nhất cũ, XP nhận.
- Dòng trạng thái lưu (`role="status"`): đang lưu / chưa lưu được (kèm cách sửa) / được tính vào bảng
  xếp hạng tuần (+XP) / điểm cao nhất tuần của chương vẫn là X.
- Nút: "Làm lại chương" (chỉ bật khi đã lưu xong hoặc lỗi), "Chọn chương khác", "Xem bảng xếp hạng".
- "Xem lại bài làm": từng câu với đáp án đã chọn, đáp án đúng và giải thích.

## Kiểm tra

- Unit: `src/features/quiz/scoring.test.ts`, `src/features/quiz/api.test.ts`.
- E2E: `e2e/quiz.spec.ts` (lưu điểm, làm lại thấp hơn, đạt tối đa, thoát giữa chừng, lỗi migration, chỉ
  dùng bàn phím) và `e2e/shell.spec.ts` (vùng chạm, không tràn ngang).
