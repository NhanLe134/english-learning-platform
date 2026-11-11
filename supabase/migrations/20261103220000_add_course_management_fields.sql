ALTER TABLE public.courses
  ADD COLUMN slug TEXT,
  ADD COLUMN category TEXT NOT NULL DEFAULT 'General',
  ADD COLUMN level TEXT NOT NULL DEFAULT 'beginner'
    CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  ADD COLUMN target_audience TEXT NOT NULL DEFAULT 'All learners',
  ADD COLUMN price NUMERIC(10, 2) NOT NULL DEFAULT 0
    CHECK (price >= 0),
  ADD COLUMN discounted_price NUMERIC(10, 2)
    CHECK (discounted_price IS NULL OR discounted_price >= 0),
  ADD COLUMN total_lessons INTEGER NOT NULL DEFAULT 0
    CHECK (total_lessons >= 0);

UPDATE public.courses
SET slug = 'course-' || replace(id::TEXT, '-', '')
WHERE slug IS NULL;

ALTER TABLE public.courses
  ALTER COLUMN slug SET NOT NULL,
  ADD CONSTRAINT courses_slug_unique UNIQUE (slug),
  ADD CONSTRAINT courses_discounted_price_not_above_price
    CHECK (discounted_price IS NULL OR discounted_price <= price);

CREATE INDEX courses_admin_listing_idx
  ON public.courses (status, category, created_at DESC);
