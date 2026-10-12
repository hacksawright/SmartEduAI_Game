import type { Level } from "../../core/levels/types";

/** Hướng dẫn ngắn hiện ở thẻ giới thiệu (màn đầu mỗi nhóm, hoặc lần đầu chơi game). */
export function howTo(level: Level): string[] {
  switch (level.game) {
    case "traversal":
      return level.algo === "bfs"
        ? [
            "Câu hỏi (a): chạm đỉnh được lấy ra khỏi hàng đợi.",
            "Câu hỏi (b): chạm lần lượt các đỉnh được đưa vào hàng đợi (chạm lại để bỏ), rồi bấm Xác nhận.",
            "Sai thì mất 1 mạng và xem lời giải thích. Bạn có 3 mạng.",
          ]
        : [
            "Mỗi bước: chạm đỉnh được đẩy vào ngăn xếp, hoặc bấm Lấy ra khi đỉnh trên cùng không còn đỉnh kề chưa thăm.",
            "Đỉnh kề được xét theo chỉ số tăng dần.",
            "Sai thì mất 1 mạng và xem lời giải thích. Bạn có 3 mạng.",
          ];
    case "dijkstra":
      return [
        "Chọn: chạm đỉnh được cố định nhãn tiếp theo, trên đồ thị hoặc trong bảng nhãn.",
        "Cập nhật: sửa d ở những đỉnh có nhãn giảm rồi bấm Xác nhận. Ô bỏ trống nghĩa là giữ nguyên.",
        "Sai thì mất 1 mạng và xem từng phép tính đúng. Bạn có 3 mạng.",
      ];
    case "one_stroke":
      return [
        "Chạm một đỉnh để đặt bút, rồi chạm hoặc kéo qua đỉnh kề để vẽ cạnh. Mỗi cạnh chỉ vẽ một lần.",
        "Bị kẹt khi còn cạnh chưa vẽ tính là 1 lỗi. Dùng Hoàn tác hoặc Làm lại.",
        "Hình không thể vẽ bằng một nét? Bấm Bất khả và chọn bằng chứng.",
      ];
    case "muddy_city":
      return [
        "Chạm một con đường để lát, chạm lại để bỏ. Số trên thẻ là chi phí lát.",
        "Lát sao cho mọi ngôi nhà đi tới nhau được bằng đường đã lát.",
        "Tổng chi phí càng gần mức nhỏ nhất càng nhiều sao. Bấm Kiểm tra khi đã nối đủ.",
      ];
    case "greedy_order":
      return [
        "Greedy tô lần lượt từng đỉnh theo danh sách, bằng màu có số nhỏ nhất chưa bị đỉnh kề dùng.",
        "Chạm các đỉnh để đưa chúng lên đầu danh sách theo thứ tự chạm. Đặt lại để về 1, 2, …, n.",
        "Bấm Chạy Greedy. Thắng khi số màu bằng χ(G).",
      ];
    case "untangle":
      return [
        "Kéo một đỉnh tới chỗ mới, hoặc chạm đỉnh rồi chạm chỗ trống. Bàn phím: Tab tới đỉnh, phím mũi tên để dời.",
        "Hết giao cắt thì trả lời: hình vừa vẽ có bao nhiêu miền? Trả lời sai tính 1 lỗi.",
        "Tin là không gỡ được? Bấm Không phẳng và đưa bằng chứng: đếm cạnh, K₅ hoặc K₃,₃.",
      ];
    case "two_teams":
      return [
        "Chọn Đội X hoặc Đội Y rồi chạm từng bạn để xếp; chạm lại để bỏ. Bàn phím: phím X, Y, Delete.",
        "Bấm Kiểm tra khi đã xếp hết. Còn cặp hay cãi nhau cùng đội thì tính 1 lỗi.",
        "Không thể chia? Bấm Không chia được và chạm lần lượt các bạn tạo thành một vòng có số cạnh lẻ.",
      ];
    case "max_flow":
      return [
        "Chạm các trạm từ s tới t để chọn đường, rồi bấm Bơm. Được đi ngược ống đang có nước để trả bớt.",
        "Hết đường bơm thêm thì bấm Đã cực đại. Báo sớm khi vẫn còn đường thì tính 1 lỗi.",
        "Bước 2: chọn các trạm phía S sao cho tổng dung lượng ống từ S sang T bằng luồng cực đại.",
      ];
    case "matrix_translate":
      return level.mode === "graph-to-adj"
        ? [
            "Đọc đồ thị rồi điền ma trận kề: chạm ô để đổi 0 ↔ 1.",
            "Đồ thị vô hướng nên ma trận đối xứng: ô đối xứng tự đổi theo.",
            "Đúng ngay lần kiểm tra đầu và kịp thời gian chuẩn thì được 3 sao.",
          ]
        : [
            "Đọc biểu diễn ở panel. Chạm đỉnh A rồi đỉnh B để thêm hoặc bỏ cạnh A–B.",
            "Bấm Kiểm tra khi xong; sai sẽ được báo số cạnh thiếu và thừa.",
            "Đúng ngay lần kiểm tra đầu và kịp thời gian chuẩn thì được 3 sao.",
          ];
  }
}
