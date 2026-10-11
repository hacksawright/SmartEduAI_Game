ALTER PUBLICATION supabase_realtime ADD TABLE public.duel_sessions;
ALTER TABLE public.duel_sessions REPLICA IDENTITY FULL;