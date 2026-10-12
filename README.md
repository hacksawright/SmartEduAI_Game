# SmartEdu — Lý thuyết đồ thị

SmartEdu là ứng dụng học tập theo hình thức game hóa, tập trung vào **lý thuyết đồ thị**. Người học có thể làm bài luyện theo chương, theo dõi tiến độ và điểm số, thi đấu, xem bảng xếp hạng tuần và nhận huy hiệu.

## Tính năng

- **Luyện tập theo chương:** 8 chủ đề gồm nhập môn đồ thị, DFS/BFS, Euler–Hamilton, đồ thị phẳng và đồ thị hai phía, tô màu, đường đi ngắn nhất, cây khung và luồng cực đại.
- **Điểm và xếp hạng tuần:** mỗi chương có 5 câu; mỗi câu đúng được 20 điểm. Điểm tuần cộng điểm cao nhất của từng chương trong tuần (tối đa 800 điểm). Tuần bắt đầu vào thứ Hai theo giờ Việt Nam.
- **Trò chơi đồ thị:** 6 trò chơi (Dịch ma trận, Tôi là thuật toán (BFS/DFS), Một nét vẽ, Xếp thứ tự cho Greedy, Tôi là Dijkstra, Thành phố bùn) tại `/games`. Trò chơi là module độc lập: tự chấm và lưu tiến độ trong trình duyệt, không cộng vào điểm tuần hay bảng xếp hạng tuần. Xem [docs/game-quiz-integration.md](docs/game-quiz-integration.md).
- **Phó bản và đấu trường:** các hoạt động học tập/thi đấu có tính điểm và tiến độ; đấu trường hỗ trợ đối thủ bot mô phỏng.
- **Hồ sơ học tập:** theo dõi XP, cấp độ, chuỗi ngày học, thống kê và huy hiệu.
- **Thảo luận:** trao đổi trong từng bài học.
- **Khóa học:** hiện chưa có nội dung; dành cho người phụ trách khóa học bổ sung sau.
- **Đăng nhập ẩn danh:** người học có thể bắt đầu mà không cần tạo tài khoản email; hồ sơ dùng tên hiển thị.

## Công nghệ

- React 19, TypeScript và Vite
- TanStack Start/Router, Nitro
- Tailwind CSS
- Supabase (Auth và PostgreSQL)

## Yêu cầu

- Node.js tương thích với Vite 7 (Node.js `20.19+` hoặc `22.12+`)
- npm
- Một project Supabase đã cấu hình

## Chạy ứng dụng local

1. Cài dependencies:

   ```bash
   npm install
   ```

2. Tạo file môi trường từ mẫu:

   ```powershell
   Copy-Item .env.example .env
   ```

   Điền thông tin Supabase vào `.env`:

   ```env
   SUPABASE_URL=https://<project-ref>.supabase.co
   SUPABASE_PUBLISHABLE_KEY=<publishable-or-anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

   VITE_SUPABASE_URL=https://<project-ref>.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-or-anon-key>
   ```

   Thay các giá trị mẫu bằng URL và key của project Supabase. Hai biến `VITE_*` cần trùng với URL và publishable/anon key tương ứng ở phía server. **Không đưa `SUPABASE_SERVICE_ROLE_KEY` vào biến `VITE_*`, mã client hoặc repository công khai**: service role key chỉ dành cho server.

3. Trong Supabase, bật **Anonymous Sign-Ins** tại **Authentication → Sign In / Providers**.

4. Chạy các migration trong `supabase/migrations` theo thứ tự tên file để tạo/cập nhật schema:

   ```text
   supabase/migrations/
   ```

   Có thể chạy nội dung các file lần lượt trong Supabase SQL Editor. Nếu project đã có schema từ các migration trước, chỉ chạy migration mới nhất khi phù hợp với trạng thái schema của project.

5. Khởi động dev server:

   ```bash
   npm run dev
   ```

   Mở URL local được Vite in ra trong terminal.

## Các lệnh khác

```bash
npm run build       # Build production
npm run preview     # Xem thử bản build production
npm run lint        # Chạy ESLint
npm run build:dev   # Build ở development mode
npm test            # Unit test (Vitest)
npm run test:e2e    # Test e2e (Playwright) với Supabase giả, không cần project Supabase thật
npm run games:build # Build lại module Trò chơi và chép vào public/games/ltdt
npm run games:test  # Typecheck + unit test của module Trò chơi
```

Lần đầu chạy e2e cần cài trình duyệt: `npx playwright install chromium`. Module Trò chơi có dependencies riêng: chạy `npm install` trong `games/ltdt-games` trước khi dùng `games:build` hoặc `games:test`. Chi tiết: [docs/game-quiz-integration.md](docs/game-quiz-integration.md).

## Deploy

Repo có cấu hình `vercel.json` và build bằng `npm run build`. Khi deploy lên Vercel, khai báo các biến môi trường Supabase như phần chạy local trong Project Settings → Environment Variables, sau đó deploy. Giữ `SUPABASE_SERVICE_ROLE_KEY` ở môi trường server; không dùng nó trong trình duyệt.

## Cấu trúc chính

```text
src/
  components/       # Giao diện dùng chung
  features/
    quiz/           # Luyện tập theo chương và bảng xếp hạng tuần (giao diện, điểm, gọi Supabase)
    games/          # Tải và gắn module Trò chơi vào trang /games
  integrations/     # Tích hợp Supabase
  lib/              # Auth, điểm, huy hiệu và nội dung câu hỏi
  routes/           # Các trang và route của ứng dụng
games/ltdt-games/   # Mã nguồn module Trò chơi (project Vite riêng)
public/games/ltdt/  # Bản build của module Trò chơi (sinh bởi npm run games:build)
design-system/      # Design system của Quiz (màu, chữ, thành phần, quy tắc truy cập)
e2e/                # Test e2e Playwright và Supabase giả
supabase/
  migrations/       # Migration schema và dữ liệu Supabase
```
