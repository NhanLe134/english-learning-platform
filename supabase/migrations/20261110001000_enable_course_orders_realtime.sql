-- Required for the backend's per-order Postgres Changes subscription.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'course_orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.course_orders;
  END IF;
END;
$$;
