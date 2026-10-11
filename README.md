# Kiến Thức Bay — bản deploy Vercel

Thư mục này là bản ứng dụng đã tách khỏi Lovable: cùng giao diện và các màn hình cũ (trang chủ, phó bản, đấu trường, diễn đàn, hồ sơ), nội dung game hóa chuyển sang **lý thuyết đồ thị**, và thêm phần luyện tập theo chương.

Phần **Khóa học** cố ý để trống. Người phụ trách khóa học sẽ thêm nội dung sau.

## Cách tính điểm tuần

- 8 chương, bám mục lục giáo trình: giới thiệu đồ thị, DFS/BFS, Euler–Hamilton, đồ thị phẳng và hai phía, tô màu, đường đi ngắn nhất, cây khung, luồng cực đại.
- Mỗi chương có 5 câu. Mỗi câu đúng được **20 điểm** (tối đa 100 điểm/chương, 800 điểm/tuần).
- Trong một tuần, mỗi chương chỉ lấy **lần điểm cao nhất**. Tổng tuần là cộng các điểm cao nhất đó.
- Bảng xếp hạng hiện **họ tên** người dùng. Hạng 1 của tuần là người nhận giải.
- Tuần tính theo giờ Việt Nam, bắt đầu thứ Hai.
- Câu hỏi là bài luyện mới, viết theo chủ đề từng chương, không chép nguyên bài tập trong giáo trình. Sửa câu hỏi tại `src/lib/graph-chapters.ts`.

## 1. Database

Ứng dụng dùng Supabase (PostgreSQL). Nếu project hiện tại đang nằm trên Lovable Cloud, hãy tạo project Supabase riêng rồi trỏ biến môi trường sang project đó.

### Project mới

1. Tạo project tại [supabase.com](https://supabase.com).
2. Vào **Authentication → Sign In / Providers** và bật **Anonymous sign-ins**. Học sinh vào app bằng tên, không cần email.
3. Vào **SQL Editor**, chạy lần lượt các file trong `supabase/migrations` theo tên file (thứ tự thời gian). File cuối cùng là `20261011090000_chapter_quiz_weekly.sql`.
4. Lấy **Project URL** và **anon public key** trong **Project Settings → API**.

### Project Supabase đã có schema cũ

Chỉ cần chạy thêm file:

`supabase/migrations/20261011090000_chapter_quiz_weekly.sql`

File này tạo bảng `chapter_quiz_attempts`, bảng `weekly_prizes`, và bỏ biệt danh tự sinh cho tài khoản mới.

### Khai báo giải thưởng của tuần

Trong SQL Editor:

```sql
insert into public.weekly_prizes (week_start, title, description)
values ('2026-10-05', 'Giải tuần', 'Một phần quà của lớp cho bạn hạng 1.')
on conflict (week_start) do update
set title = excluded.title,
    description = excluded.description,
    updated_at = now();
```

`week_start` là thứ Hai của tuần đó, dạng `YYYY-MM-DD`. Nếu chưa có dòng nào, app vẫn hiện dòng giải mặc định.

Điểm đang được ghi từ trình duyệt, cùng cách với phó bản và đấu trường hiện tại. Với lớp học nhỏ thì đủ dùng. Nếu sau này cần chặn sửa điểm, hãy chuyển phần chấm sang server function.

## 2. Chạy local

```powershell
cd vercel-app
Copy-Item .env.example .env
```

Điền URL và anon key vào `.env`, rồi:

```bash
npm install
npm run dev
```

## 3. Deploy Vercel

1. Đẩy repo lên Git (GitHub hoặc tương đương).
2. Trên Vercel, **Import** repo.
3. **Root Directory** chọn `vercel-app`.
4. Framework Preset để trống (repo đã có `vercel.json`). Build command: `npm run build`.
5. Thêm biến môi trường:

```env
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

`VITE_*` phải trùng URL và anon key, vì trình duyệt chỉ đọc biến có tiền tố `VITE_`. Service role chỉ để trên server, không đưa vào code client.

6. Deploy. Nitro nhận biết môi trường Vercel lúc build và xuất bản serverless.
