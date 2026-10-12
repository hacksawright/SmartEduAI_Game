# Tích hợp Trò chơi và Quiz

SmartEdu có hai phần học tập dùng chung khung app (menu, đăng nhập, giao diện) nhưng chạy độc lập:

| | Quiz | Trò chơi |
|---|---|---|
| Trang | `/practice`, `/leaderboard` | `/games` (`?game=<id>`, `?level=<id>`) |
| Mã | `src/features/quiz/`, `src/routes/_app.practice.tsx`, `_app.leaderboard.tsx` | `games/ltdt-games/` (project riêng), `src/features/games/`, `src/routes/_app.games.tsx` |
| Dữ liệu | Supabase: `chapter_quiz_attempts`, `student_xp_log`, `profiles`, `social_feed_events`, `weekly_prizes` | `localStorage` của trình duyệt: `smartedu-ltdt:ledger`, `outbox`, `progress`, `settings` (theo id người dùng) |
| Điểm | Điểm tuần, XP, chuỗi ngày, bảng xếp hạng tuần | Sao, điểm và huy hiệu riêng của game |
| Giao diện | Tailwind + token của SmartEdu (`design-system/smartedu-quiz/`) | CSS riêng, mọi selector bắt đầu bằng `.lg-` |

## Cách nhúng Trò chơi

1. `games/ltdt-games` là project Vite riêng (6 trò chơi lý thuyết đồ thị). `npm run games:build` build
   bản nhúng của nó và chép vào `public/games/ltdt/` (`ltdt-games.js`, `ltdt-games.css`, `assets/`),
   đồng thời ghi mã phiên bản vào `src/features/games/ltdt-build.ts` để trình duyệt không dùng bản cũ.
2. Khi người học mở `/games`, `LtdtGamesHost` tải `ltdt-games.js` bằng `import()` lúc chạy, gắn
   `ltdt-games.css` vào `<head>`, rồi gọi `mountLtdtGames(div, config)`. Game có cây React riêng.
3. Rời trang: gọi `unmount()` và gỡ thẻ CSS. Các trang khác không tải gì của game.
4. `config` chỉ gồm `userId`, `courseId: "LTDT"`, `hashRouting: false` (route của game nằm trong bộ
   nhớ, không đụng URL của TanStack Router) và `initialRoute`. Không truyền `apiBase`, nên game tự
   chấm và lưu tiến độ trong trình duyệt.
5. Không tải được bản build (mất mạng, file thiếu): trang báo "Chưa mở được Trò chơi" và có nút
   "Thử lại"; Quiz vẫn dùng bình thường.

`src/styles.css` (khối `.se-games`) chỉ chỉnh chiều cao vùng chơi theo thanh điều hướng của app, đổi
màu chủ đạo của game sang indigo SmartEdu, và cho hộp thoại của game phủ lên thanh điều hướng.

## Những gì giữ hai phần tách biệt

`src/features/module-boundaries.test.ts` kiểm tra:

- mã Quiz không import gì từ module Trò chơi;
- mã nhúng Trò chơi không import Quiz, Supabase, nội dung chương, tuần hay react-query;
- mã nguồn game không import mã của SmartEdu (`@/…`);
- bản build của game không chứa Supabase, `rest/v1` hay tên bảng của Quiz, và chỉ dùng 4 khóa
  `localStorage` `smartedu-ltdt:*`;
- mọi selector trong CSS của game đều bắt đầu bằng `.lg-`.

`e2e/games.spec.ts` kiểm tra trên trình duyệt: chơi trọn một màn không gửi request ghi nào tới
Supabase và không thêm dòng nào vào bảng Quiz; rời trang game thì CSS của game được gỡ và giao diện
Quiz không đổi; bản build lỗi thì Quiz vẫn chạy.

## Lệnh

```bash
npm run games:build   # build lại game và chép vào public/games/ltdt (cần npm install trong games/ltdt-games)
npm run games:test    # typecheck + unit test của game
npm test              # unit test của SmartEdu (Vitest)
npm run test:e2e      # e2e (Playwright) với Supabase giả, desktop 1366px và mobile 375px
```

E2E tự chạy `e2e/support/fake-supabase.mjs` (Supabase giả trong bộ nhớ, cổng 54329) và `vite dev`
(cổng 4173), nên không cần project Supabase thật. Lần đầu cần cài trình duyệt:
`npx playwright install chromium`. Muốn chạy trên bản build production:

```bash
VITE_SUPABASE_URL=http://127.0.0.1:54329 VITE_SUPABASE_PUBLISHABLE_KEY=fake-anon-key npm run build
SUPABASE_URL=http://127.0.0.1:54329 SUPABASE_PUBLISHABLE_KEY=fake-anon-key npx vite preview --port 4174
E2E_BASE_URL=http://127.0.0.1:4174 npm run test:e2e
```

Sau đó build lại với biến môi trường thật trước khi deploy.
