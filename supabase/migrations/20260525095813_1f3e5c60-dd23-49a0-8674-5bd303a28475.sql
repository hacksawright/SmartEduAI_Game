
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='lessons_chapter_id_fkey') THEN
    ALTER TABLE public.lessons ADD CONSTRAINT lessons_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='lesson_pages_lesson_id_fkey') THEN
    ALTER TABLE public.lesson_pages ADD CONSTRAINT lesson_pages_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='questions_lesson_page_id_fkey') THEN
    ALTER TABLE public.questions ADD CONSTRAINT questions_lesson_page_id_fkey FOREIGN KEY (lesson_page_id) REFERENCES public.lesson_pages(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='questions_chapter_id_fkey') THEN
    ALTER TABLE public.questions ADD CONSTRAINT questions_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='check_buttons_lesson_page_id_fkey') THEN
    ALTER TABLE public.check_buttons ADD CONSTRAINT check_buttons_lesson_page_id_fkey FOREIGN KEY (lesson_page_id) REFERENCES public.lesson_pages(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='check_buttons_question_id_fkey') THEN
    ALTER TABLE public.check_buttons ADD CONSTRAINT check_buttons_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='optional_items_lesson_page_id_fkey') THEN
    ALTER TABLE public.optional_items ADD CONSTRAINT optional_items_lesson_page_id_fkey FOREIGN KEY (lesson_page_id) REFERENCES public.lesson_pages(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='student_lesson_progress_lesson_id_fkey') THEN
    ALTER TABLE public.student_lesson_progress ADD CONSTRAINT student_lesson_progress_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='forum_posts_lesson_id_fkey') THEN
    ALTER TABLE public.forum_posts ADD CONSTRAINT forum_posts_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='forum_posts_parent_post_id_fkey') THEN
    ALTER TABLE public.forum_posts ADD CONSTRAINT forum_posts_parent_post_id_fkey FOREIGN KEY (parent_post_id) REFERENCES public.forum_posts(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='forum_reactions_post_id_fkey') THEN
    ALTER TABLE public.forum_reactions ADD CONSTRAINT forum_reactions_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.forum_posts(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='feed_reactions_feed_event_id_fkey') THEN
    ALTER TABLE public.feed_reactions ADD CONSTRAINT feed_reactions_feed_event_id_fkey FOREIGN KEY (feed_event_id) REFERENCES public.social_feed_events(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='spaced_repetition_queue_question_id_fkey') THEN
    ALTER TABLE public.spaced_repetition_queue ADD CONSTRAINT spaced_repetition_queue_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='duel_sessions_chapter_id_fkey') THEN
    ALTER TABLE public.duel_sessions ADD CONSTRAINT duel_sessions_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='leaderboard_snapshots_course_id_fkey') THEN
    ALTER TABLE public.leaderboard_snapshots ADD CONSTRAINT leaderboard_snapshots_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chapters_prerequisite_chapter_id_fkey') THEN
    ALTER TABLE public.chapters ADD CONSTRAINT chapters_prerequisite_chapter_id_fkey FOREIGN KEY (prerequisite_chapter_id) REFERENCES public.chapters(id) ON DELETE SET NULL;
  END IF;
END $$;
