
-- =========== ENUMS ===========
CREATE TYPE public.app_role AS ENUM ('student', 'teacher', 'admin');
CREATE TYPE public.math_level AS ENUM ('yeu', 'trung_binh', 'kha', 'gioi');
CREATE TYPE public.learning_goal AS ENUM ('on_tap', 'thi_thpt', 'hoc_truoc');
CREATE TYPE public.lesson_status AS ENUM ('draft', 'published');
CREATE TYPE public.page_type AS ENUM ('opening', 'vocabulary', 'prior_knowledge', 'example', 'summary_practice');
CREATE TYPE public.question_type AS ENUM ('multiple_choice', 'fill_blank', 'true_false');
CREATE TYPE public.optional_item_type AS ENUM ('remediation', 'enrichment');
CREATE TYPE public.lesson_progress_status AS ENUM ('not_started', 'in_progress', 'completed');
CREATE TYPE public.xp_reason AS ENUM ('lesson_complete','check_correct','streak_bonus','duel_win','daily_dungeon','forum_post');
CREATE TYPE public.forum_post_type AS ENUM ('tip','question','feedback_to_peer');
CREATE TYPE public.duel_status AS ENUM ('waiting','active','completed');
CREATE TYPE public.feed_event_type AS ENUM ('streak_milestone','chapter_complete','level_up','duel_win','dungeon_perfect');

-- =========== PROFILES ===========
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  school TEXT,
  grade INTEGER DEFAULT 10,
  math_nickname TEXT,
  math_level public.math_level,
  learning_goal public.learning_goal,
  daily_goal_minutes INTEGER DEFAULT 15,
  xp_total INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  streak_current INTEGER NOT NULL DEFAULT 0,
  streak_longest INTEGER NOT NULL DEFAULT 0,
  streak_freezes INTEGER NOT NULL DEFAULT 0,
  last_active_date DATE,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  show_in_feed BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========== USER ROLES ===========
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Trigger: tạo profile + role 'student' khi user mới đăng ký
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  nicknames TEXT[] := ARRAY['Ẩn số X','Vectơ Chỉ phương','Đường tròn Euler','Hàm số Bí ẩn','Tam giác Vàng','Số Phức Lạ','Đa thức Thông thái','Hằng số Pi','Đạo hàm Nhẹ nhàng','Tích phân Tinh tế','Ma trận Bất bại','Đường cong Elegant','Hệ số Lừng danh','Vô cực Mộng mơ','Logarit Sáng tạo'];
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, math_nickname)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
    NEW.raw_user_meta_data->>'avatar_url',
    nicknames[1 + floor(random() * array_length(nicknames,1))::int] || ' #' || lpad((floor(random()*1000))::int::text, 3, '0')
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========== COURSES / CHAPTERS / LESSONS ===========
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  grade_level INTEGER NOT NULL DEFAULT 10,
  thumbnail_url TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  prerequisite_chapter_id UUID REFERENCES public.chapters(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  estimated_minutes INTEGER NOT NULL DEFAULT 15,
  status public.lesson_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.lesson_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  page_type public.page_type NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  title TEXT,
  content_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_page_id UUID REFERENCES public.lesson_pages(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES public.chapters(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type public.question_type NOT NULL DEFAULT 'multiple_choice',
  options_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  difficulty SMALLINT NOT NULL DEFAULT 2 CHECK (difficulty BETWEEN 1 AND 3),
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.check_buttons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_page_id UUID NOT NULL REFERENCES public.lesson_pages(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  hint_text TEXT,
  informative_feedback_text TEXT,
  show_after_attempt BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE public.optional_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_page_id UUID NOT NULL REFERENCES public.lesson_pages(id) ON DELETE CASCADE,
  item_type public.optional_item_type NOT NULL,
  title TEXT NOT NULL,
  content_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  video_url TEXT,
  difficulty_level SMALLINT DEFAULT 2
);

-- =========== STUDENT PROGRESS / XP ===========
CREATE TABLE public.student_lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  status public.lesson_progress_status NOT NULL DEFAULT 'not_started',
  current_page_index INTEGER NOT NULL DEFAULT 0,
  score_percentage NUMERIC(5,2),
  check_attempts_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, lesson_id)
);

CREATE TABLE public.student_xp_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  xp_amount INTEGER NOT NULL,
  reason public.xp_reason NOT NULL,
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.daily_dungeon_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,
  questions_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  answers_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  score INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  streak_contribution BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(student_id, session_date)
);

CREATE TABLE public.spaced_repetition_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  next_review_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,
  interval_days INTEGER NOT NULL DEFAULT 1,
  ease_factor NUMERIC(4,2) NOT NULL DEFAULT 2.5,
  review_count INTEGER NOT NULL DEFAULT 0,
  last_reviewed_at TIMESTAMPTZ,
  UNIQUE(student_id, question_id)
);

-- =========== FORUM ===========
CREATE TABLE public.forum_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_text TEXT NOT NULL,
  post_type public.forum_post_type NOT NULL DEFAULT 'tip',
  parent_post_id UUID REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  likes_count INTEGER NOT NULL DEFAULT 0,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.forum_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL DEFAULT 'like',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, student_id, reaction_type)
);

-- =========== DUELS ===========
CREATE TABLE public.duel_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player2_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES public.chapters(id),
  status public.duel_status NOT NULL DEFAULT 'waiting',
  questions_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  player1_answers_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  player2_answers_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  player1_score INTEGER NOT NULL DEFAULT 0,
  player2_score INTEGER NOT NULL DEFAULT 0,
  winner_id UUID REFERENCES auth.users(id),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========== LEADERBOARD / FEED ===========
CREATE TABLE public.leaderboard_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  xp_total INTEGER NOT NULL DEFAULT 0,
  rank_position INTEGER,
  snapshot_date DATE NOT NULL DEFAULT current_date,
  UNIQUE(student_id, course_id, snapshot_date)
);

CREATE TABLE public.social_feed_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type public.feed_event_type NOT NULL,
  event_data_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.feed_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feed_event_id UUID NOT NULL REFERENCES public.social_feed_events(id) ON DELETE CASCADE,
  reactor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL DEFAULT 'heart',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(feed_event_id, reactor_id, reaction_type)
);

-- =========== INDEXES ===========
CREATE INDEX idx_chapters_course ON public.chapters(course_id, order_index);
CREATE INDEX idx_lessons_chapter ON public.lessons(chapter_id, order_index);
CREATE INDEX idx_lesson_pages_lesson ON public.lesson_pages(lesson_id, order_index);
CREATE INDEX idx_questions_chapter ON public.questions(chapter_id);
CREATE INDEX idx_progress_student ON public.student_lesson_progress(student_id);
CREATE INDEX idx_xp_log_student ON public.student_xp_log(student_id, created_at DESC);
CREATE INDEX idx_srq_student_due ON public.spaced_repetition_queue(student_id, next_review_date);
CREATE INDEX idx_forum_lesson ON public.forum_posts(lesson_id, created_at DESC);
CREATE INDEX idx_feed_created ON public.social_feed_events(created_at DESC);

-- =========== ENABLE RLS ===========
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_buttons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.optional_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_xp_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_dungeon_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spaced_repetition_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duel_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_feed_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_reactions ENABLE ROW LEVEL SECURITY;

-- =========== RLS POLICIES ===========

-- Profiles: ai cũng xem được (cho leaderboard nickname), tự sửa của mình
CREATE POLICY "Profiles are viewable by authenticated" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- User roles: chỉ xem được role của chính mình; admin xem tất cả
CREATE POLICY "Users view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Courses/Chapters/Lessons/Pages: published xem được, giáo viên/admin quản lý
CREATE POLICY "Published courses viewable" ON public.courses
  FOR SELECT TO authenticated USING (is_published OR public.has_role(auth.uid(),'teacher') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Teachers manage courses" ON public.courses
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'teacher') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'teacher') OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Chapters viewable" ON public.chapters FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers manage chapters" ON public.chapters FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'teacher') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'teacher') OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Lessons viewable" ON public.lessons FOR SELECT TO authenticated
  USING (status='published' OR public.has_role(auth.uid(),'teacher') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Teachers manage lessons" ON public.lessons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'teacher') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'teacher') OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Lesson pages viewable" ON public.lesson_pages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers manage lesson pages" ON public.lesson_pages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'teacher') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'teacher') OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Questions viewable" ON public.questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers manage questions" ON public.questions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'teacher') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'teacher') OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Check buttons viewable" ON public.check_buttons FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers manage checks" ON public.check_buttons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'teacher') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'teacher') OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Optional items viewable" ON public.optional_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers manage optional" ON public.optional_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'teacher') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'teacher') OR public.has_role(auth.uid(),'admin'));

-- Student progress: chỉ chủ sở hữu
CREATE POLICY "Own progress select" ON public.student_lesson_progress FOR SELECT TO authenticated USING (student_id = auth.uid() OR public.has_role(auth.uid(),'teacher'));
CREATE POLICY "Own progress upsert" ON public.student_lesson_progress FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());
CREATE POLICY "Own progress update" ON public.student_lesson_progress FOR UPDATE TO authenticated USING (student_id = auth.uid());

CREATE POLICY "Own xp log select" ON public.student_xp_log FOR SELECT TO authenticated USING (student_id = auth.uid() OR public.has_role(auth.uid(),'teacher'));
CREATE POLICY "Own xp log insert" ON public.student_xp_log FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());

CREATE POLICY "Own dungeon select" ON public.daily_dungeon_sessions FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE POLICY "Own dungeon insert" ON public.daily_dungeon_sessions FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());
CREATE POLICY "Own dungeon update" ON public.daily_dungeon_sessions FOR UPDATE TO authenticated USING (student_id = auth.uid());

CREATE POLICY "Own srq all" ON public.spaced_repetition_queue FOR ALL TO authenticated USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

-- Forum: ai cũng đọc, chỉ chủ sửa
CREATE POLICY "Forum readable" ON public.forum_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Forum own insert" ON public.forum_posts FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());
CREATE POLICY "Forum own update" ON public.forum_posts FOR UPDATE TO authenticated USING (student_id = auth.uid() OR public.has_role(auth.uid(),'teacher'));
CREATE POLICY "Forum own delete" ON public.forum_posts FOR DELETE TO authenticated USING (student_id = auth.uid() OR public.has_role(auth.uid(),'teacher'));

CREATE POLICY "Forum reactions readable" ON public.forum_reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Forum reactions own" ON public.forum_reactions FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());
CREATE POLICY "Forum reactions own delete" ON public.forum_reactions FOR DELETE TO authenticated USING (student_id = auth.uid());

-- Duels: hai bên đều xem được
CREATE POLICY "Duels viewable" ON public.duel_sessions FOR SELECT TO authenticated USING (player1_id = auth.uid() OR player2_id = auth.uid());
CREATE POLICY "Duels insert" ON public.duel_sessions FOR INSERT TO authenticated WITH CHECK (player1_id = auth.uid());
CREATE POLICY "Duels update" ON public.duel_sessions FOR UPDATE TO authenticated USING (player1_id = auth.uid() OR player2_id = auth.uid());

-- Leaderboard: ai cũng đọc
CREATE POLICY "Leaderboard readable" ON public.leaderboard_snapshots FOR SELECT TO authenticated USING (true);

-- Social feed: ai cũng đọc nếu is_public
CREATE POLICY "Feed readable" ON public.social_feed_events FOR SELECT TO authenticated USING (is_public OR student_id = auth.uid());
CREATE POLICY "Feed insert own" ON public.social_feed_events FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());

CREATE POLICY "Feed reactions readable" ON public.feed_reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Feed reactions own" ON public.feed_reactions FOR INSERT TO authenticated WITH CHECK (reactor_id = auth.uid());
CREATE POLICY "Feed reactions own delete" ON public.feed_reactions FOR DELETE TO authenticated USING (reactor_id = auth.uid());
