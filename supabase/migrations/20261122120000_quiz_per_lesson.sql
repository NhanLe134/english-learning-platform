-- Quiz trắc nghiệm gắn theo bài giảng:
-- - questions cho phép không thuộc question bank (đứng độc lập)
-- - exercises.lesson_id: mỗi bài giảng có 1 quiz (xóa bài giảng → quiz tự xóa)

ALTER TABLE public.questions ALTER COLUMN question_bank_id DROP NOT NULL;

ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS lesson_id UUID REFERENCES public.lessons (id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_exercises_lesson_id ON public.exercises (lesson_id) WHERE lesson_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_exercises_lesson_id ON public.exercises (lesson_id);
