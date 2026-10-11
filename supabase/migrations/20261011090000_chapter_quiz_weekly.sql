-- Điểm luyện tập theo chương và giải thưởng tuần.
-- Chạy file này trên project Supabase đang dùng (SQL Editor), sau các migration cũ.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student');
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.chapter_quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chapter_key TEXT NOT NULL,
  correct_count INTEGER NOT NULL CHECK (correct_count >= 0),
  question_count INTEGER NOT NULL CHECK (question_count > 0),
  points INTEGER NOT NULL CHECK (points >= 0),
  week_start DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chapter_quiz_attempts_week_idx
  ON public.chapter_quiz_attempts (week_start, student_id);

ALTER TABLE public.chapter_quiz_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Quiz attempts readable" ON public.chapter_quiz_attempts;
CREATE POLICY "Quiz attempts readable"
  ON public.chapter_quiz_attempts FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Quiz attempts insert own" ON public.chapter_quiz_attempts;
CREATE POLICY "Quiz attempts insert own"
  ON public.chapter_quiz_attempts FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.weekly_prizes (
  week_start DATE PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.weekly_prizes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Weekly prizes readable" ON public.weekly_prizes;
CREATE POLICY "Weekly prizes readable"
  ON public.weekly_prizes FOR SELECT TO authenticated USING (true);

-- Ví dụ khai báo giải cho tuần hiện tại (sửa ngày và nội dung cho đúng tuần của lớp):
-- INSERT INTO public.weekly_prizes (week_start, title, description)
-- VALUES ('2026-10-05', 'Giải tuần', 'Một phần quà nhỏ từ lớp cho bạn đứng hạng 1.')
-- ON CONFLICT (week_start) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, updated_at = now();
