-- Bảng trung gian cho phép phân công NHIỀU giáo viên cho 1 khóa học.
-- Cột courses.teacher_id được giữ lại làm "giáo viên chính" (giá trị đầu tiên)
-- để tương thích ngược với các hiển thị hiện có.

CREATE TABLE IF NOT EXISTS public.course_teachers (
  course_id UUID NOT NULL REFERENCES public.courses (id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (course_id, teacher_id)
);

CREATE INDEX IF NOT EXISTS idx_course_teachers_teacher ON public.course_teachers (teacher_id);
ALTER TABLE public.course_teachers ENABLE ROW LEVEL SECURITY;
