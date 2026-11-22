-- Bổ sung bảng user_roles bị thiếu trên một số môi trường chia sẻ:
-- luồng tạo tài khoản TEACHER/ADMIN (users.repository.createAuthAccount) ghi vào bảng này,
-- thiếu bảng sẽ làm POST /api/users luôn thất bại với "Unable to assign user role".
-- Định nghĩa khớp với 20261021235100_initial_schema.sql, dùng IF NOT EXISTS để an toàn khi chạy lại.

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id),
  role TEXT NOT NULL CHECK (role IN ('student', 'teacher', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE INDEX IF NOT EXISTS user_roles_user_id_idx ON public.user_roles (user_id);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
