CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'locked', 'pending')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id),
  role TEXT NOT NULL CHECK (role IN ('student', 'teacher', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  teacher_id UUID NOT NULL REFERENCES public.profiles (id),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses (id),
  title TEXT NOT NULL,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES public.topics (id),
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT,
  duration_seconds INT,
  sort_order INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.lesson_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons (id),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses (id),
  student_id UUID NOT NULL REFERENCES public.profiles (id),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'cancelled')),
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (course_id, student_id)
);

CREATE TABLE public.lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons (id),
  student_id UUID NOT NULL REFERENCES public.profiles (id),
  last_position_seconds INT NOT NULL DEFAULT 0,
  progress_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (lesson_id, student_id)
);

CREATE TABLE public.daily_words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word TEXT NOT NULL,
  phonetic TEXT,
  meaning TEXT NOT NULL,
  example TEXT,
  audio_url TEXT,
  image_url TEXT,
  created_by UUID REFERENCES public.profiles (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.daily_word_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_word_id UUID NOT NULL REFERENCES public.daily_words (id),
  publish_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'published', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.student_word_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles (id),
  daily_word_id UUID NOT NULL REFERENCES public.daily_words (id),
  is_learned BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, daily_word_id)
);

CREATE TABLE public.ebooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  file_url TEXT,
  price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'hidden')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.ebook_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles (id),
  ebook_id UUID NOT NULL REFERENCES public.ebooks (id),
  amount NUMERIC(12, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'cancelled', 'refunded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.question_banks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles (id),
  title TEXT NOT NULL,
  description TEXT,
  topic TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles (id),
  course_id UUID REFERENCES public.courses (id),
  title TEXT NOT NULL,
  description TEXT,
  time_limit_minutes INT,
  max_score NUMERIC(6, 2) NOT NULL DEFAULT 100,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_bank_id UUID NOT NULL REFERENCES public.question_banks (id),
  question_type TEXT NOT NULL
    CHECK (question_type IN (
      'multiple_choice', 'fill_blank', 'matching', 'listening',
      'writing', 'speaking', 'reorder'
    )),
  content TEXT NOT NULL,
  media_url TEXT,
  correct_answer JSONB,
  points NUMERIC(6, 2) NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.exercise_questions (
  exercise_id UUID NOT NULL REFERENCES public.exercises (id),
  question_id UUID NOT NULL REFERENCES public.questions (id),
  sort_order INT NOT NULL DEFAULT 0,
  points NUMERIC(6, 2) NOT NULL DEFAULT 1,
  PRIMARY KEY (exercise_id, question_id)
);

CREATE TABLE public.exercise_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID NOT NULL REFERENCES public.exercises (id),
  student_id UUID NOT NULL REFERENCES public.profiles (id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  score NUMERIC(6, 2),
  status TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'submitted', 'graded'))
);

CREATE TABLE public.student_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.exercise_attempts (id),
  question_id UUID NOT NULL REFERENCES public.questions (id),
  answer JSONB NOT NULL,
  is_correct BOOLEAN,
  score NUMERIC(6, 2),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (attempt_id, question_id)
);

CREATE TABLE public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.exercise_attempts (id),
  question_id UUID NOT NULL REFERENCES public.questions (id),
  text_content TEXT,
  file_url TEXT,
  word_count INT,
  status TEXT NOT NULL DEFAULT 'draft',
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.teacher_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.submissions (id),
  teacher_id UUID NOT NULL REFERENCES public.profiles (id),
  score NUMERIC(6, 2) NOT NULL,
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.workshops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  teacher_id UUID NOT NULL REFERENCES public.profiles (id),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  max_participants INT NOT NULL,
  zoom_meeting_id TEXT,
  zoom_url TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'ongoing', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.workshop_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id UUID NOT NULL REFERENCES public.workshops (id),
  student_id UUID NOT NULL REFERENCES public.profiles (id),
  amount NUMERIC(12, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'cancelled', 'attended')),
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workshop_id, student_id)
);

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles (id),
  ebook_order_id UUID REFERENCES public.ebook_orders (id),
  workshop_registration_id UUID REFERENCES public.workshop_registrations (id),
  amount NUMERIC(12, 2) NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('vnpay', 'momo', 'qr')),
  provider_transaction_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'success', 'failed', 'refunded')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((ebook_order_id IS NOT NULL) <> (workshop_registration_id IS NOT NULL))
);

CREATE TABLE public.email_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id),
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX user_roles_user_id_idx ON public.user_roles (user_id);
CREATE INDEX courses_teacher_id_idx ON public.courses (teacher_id);
CREATE INDEX topics_course_id_idx ON public.topics (course_id);
CREATE INDEX lessons_topic_id_idx ON public.lessons (topic_id);
CREATE INDEX lesson_materials_lesson_id_idx ON public.lesson_materials (lesson_id);
CREATE INDEX course_enrollments_student_id_idx ON public.course_enrollments (student_id);
CREATE INDEX lesson_progress_student_id_idx ON public.lesson_progress (student_id);
CREATE INDEX daily_words_created_by_idx ON public.daily_words (created_by);
CREATE INDEX daily_word_schedules_daily_word_id_idx
  ON public.daily_word_schedules (daily_word_id);
CREATE INDEX student_word_progress_daily_word_id_idx
  ON public.student_word_progress (daily_word_id);
CREATE INDEX ebook_orders_student_id_idx ON public.ebook_orders (student_id);
CREATE INDEX ebook_orders_ebook_id_idx ON public.ebook_orders (ebook_id);
CREATE INDEX question_banks_teacher_id_idx ON public.question_banks (teacher_id);
CREATE INDEX exercises_teacher_id_idx ON public.exercises (teacher_id);
CREATE INDEX exercises_course_id_idx ON public.exercises (course_id);
CREATE INDEX questions_question_bank_id_idx ON public.questions (question_bank_id);
CREATE INDEX exercise_questions_question_id_idx
  ON public.exercise_questions (question_id);
CREATE INDEX exercise_attempts_exercise_id_idx
  ON public.exercise_attempts (exercise_id);
CREATE INDEX exercise_attempts_student_id_idx
  ON public.exercise_attempts (student_id);
CREATE INDEX student_answers_question_id_idx ON public.student_answers (question_id);
CREATE INDEX submissions_attempt_id_idx ON public.submissions (attempt_id);
CREATE INDEX submissions_question_id_idx ON public.submissions (question_id);
CREATE INDEX teacher_reviews_submission_id_idx
  ON public.teacher_reviews (submission_id);
CREATE INDEX teacher_reviews_teacher_id_idx ON public.teacher_reviews (teacher_id);
CREATE INDEX workshops_teacher_id_idx ON public.workshops (teacher_id);
CREATE INDEX workshop_registrations_student_id_idx
  ON public.workshop_registrations (student_id);
CREATE INDEX payments_student_id_idx ON public.payments (student_id);
CREATE INDEX payments_ebook_order_id_idx ON public.payments (ebook_order_id);
CREATE INDEX payments_workshop_registration_id_idx
  ON public.payments (workshop_registration_id);
CREATE INDEX email_notifications_user_id_idx
  ON public.email_notifications (user_id);

CREATE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER courses_set_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER lessons_set_updated_at
  BEFORE UPDATE ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER lesson_progress_set_updated_at
  BEFORE UPDATE ON public.lesson_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER student_word_progress_set_updated_at
  BEFORE UPDATE ON public.student_word_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER ebooks_set_updated_at
  BEFORE UPDATE ON public.ebooks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER exercises_set_updated_at
  BEFORE UPDATE ON public.exercises
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER questions_set_updated_at
  BEFORE UPDATE ON public.questions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER student_answers_set_updated_at
  BEFORE UPDATE ON public.student_answers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER submissions_set_updated_at
  BEFORE UPDATE ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER teacher_reviews_set_updated_at
  BEFORE UPDATE ON public.teacher_reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER workshops_set_updated_at
  BEFORE UPDATE ON public.workshops
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER payments_set_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
