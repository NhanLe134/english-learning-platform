-- Xóa bài giảng bị chặn vì khóa ngoại không có ON DELETE CASCADE:
-- - lesson_materials.lesson_id: xóa bài giảng → tự xóa tài liệu đính kèm
-- - lesson_progress.lesson_id: xóa bài giảng → tự xóa tiến độ học viên
-- (Trước đây mặc định NO ACTION → chỉ cần 1 dòng tiến độ/tài liệu là DELETE lessons lỗi)
-- Drop mọi khóa ngoại hiện có trên 2 cột (bất kể tên), rồi tạo lại với CASCADE.

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tc.table_name, tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON kcu.constraint_name = tc.constraint_name
     AND kcu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND tc.table_name IN ('lesson_materials', 'lesson_progress')
      AND kcu.column_name = 'lesson_id'
  LOOP
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', r.table_name, r.constraint_name);
  END LOOP;
END $$;

ALTER TABLE public.lesson_materials
  ADD CONSTRAINT lesson_materials_lesson_id_fkey
  FOREIGN KEY (lesson_id) REFERENCES public.lessons (id) ON DELETE CASCADE;

ALTER TABLE public.lesson_progress
  ADD CONSTRAINT lesson_progress_lesson_id_fkey
  FOREIGN KEY (lesson_id) REFERENCES public.lessons (id) ON DELETE CASCADE;
