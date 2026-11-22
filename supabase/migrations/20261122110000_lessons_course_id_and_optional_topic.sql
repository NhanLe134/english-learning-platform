-- Bài giảng có thể KHÔNG thuộc chủ đề nào (topic_id nullable):
-- khóa học đơn giản không chia chủ đề vẫn thêm bài được.
-- Thêm course_id vào lessons để truy vấn/quyền không phụ thuộc topics.

ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.courses (id);

-- Backfill course_id từ topics cho dữ liệu cũ
UPDATE public.lessons l
SET course_id = t.course_id
FROM public.topics t
WHERE l.topic_id = t.id AND l.course_id IS NULL;

ALTER TABLE public.lessons ALTER COLUMN course_id SET NOT NULL;
ALTER TABLE public.lessons ALTER COLUMN topic_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lessons_course_id ON public.lessons (course_id);
