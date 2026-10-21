CREATE SCHEMA private;

CREATE FUNCTION private.has_role(required_role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = (SELECT auth.uid())
      AND role = required_role
  );
$function$;

CREATE FUNCTION private.is_student()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT private.has_role('student');
$function$;

CREATE FUNCTION private.owns_course(target_course_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.courses
    WHERE id = target_course_id
      AND teacher_id = (SELECT auth.uid())
  );
$function$;

CREATE FUNCTION private.owns_topic(target_topic_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.topics
    WHERE id = target_topic_id
      AND private.owns_course(course_id)
  );
$function$;

CREATE FUNCTION private.course_is_published(target_course_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.courses
    WHERE id = target_course_id
      AND status = 'published'
  );
$function$;

CREATE FUNCTION private.is_enrolled(target_course_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.course_enrollments
    WHERE course_id = target_course_id
      AND student_id = (SELECT auth.uid())
      AND status IN ('active', 'completed')
  );
$function$;

CREATE FUNCTION private.can_manage_course(target_course_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT target_course_id IS NULL OR private.owns_course(target_course_id);
$function$;

CREATE FUNCTION private.lesson_course_id(target_lesson_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT topics.course_id
  FROM public.lessons
  JOIN public.topics ON topics.id = lessons.topic_id
  WHERE lessons.id = target_lesson_id;
$function$;

CREATE FUNCTION private.lesson_is_published(target_lesson_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.lessons
    WHERE id = target_lesson_id
      AND status = 'published'
  );
$function$;

CREATE FUNCTION private.owns_exercise(target_exercise_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.exercises
    WHERE id = target_exercise_id
      AND teacher_id = (SELECT auth.uid())
  );
$function$;

CREATE FUNCTION private.student_can_access_exercise(target_exercise_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.exercises
    AS exercises
    WHERE exercises.id = target_exercise_id
      AND exercises.status = 'published'
      AND (
        exercises.course_id IS NULL
        OR EXISTS (
          SELECT 1
          FROM public.courses
          WHERE courses.id = exercises.course_id
            AND courses.status = 'published'
        )
        OR EXISTS (
          SELECT 1
          FROM public.course_enrollments
          WHERE course_enrollments.course_id = exercises.course_id
            AND course_enrollments.student_id = (SELECT auth.uid())
            AND course_enrollments.status IN ('active', 'completed')
        )
      )
  );
$function$;

CREATE FUNCTION private.owns_question_bank(target_bank_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.question_banks
    WHERE id = target_bank_id
      AND teacher_id = (SELECT auth.uid())
  );
$function$;

CREATE FUNCTION private.owns_question(target_question_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.questions
    JOIN public.question_banks
      ON question_banks.id = questions.question_bank_id
    WHERE questions.id = target_question_id
      AND question_banks.teacher_id = (SELECT auth.uid())
  );
$function$;

CREATE FUNCTION private.question_is_in_published_exercise(target_question_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.exercise_questions
    JOIN public.exercises ON exercises.id = exercise_questions.exercise_id
    WHERE exercise_questions.question_id = target_question_id
      AND private.student_can_access_exercise(exercises.id)
  );
$function$;

CREATE FUNCTION private.owns_attempt(target_attempt_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.exercise_attempts
    WHERE id = target_attempt_id
      AND student_id = (SELECT auth.uid())
  );
$function$;

CREATE FUNCTION private.attempt_is_in_progress(target_attempt_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.exercise_attempts
    WHERE id = target_attempt_id
      AND status = 'in_progress'
  );
$function$;

CREATE FUNCTION private.question_is_in_attempt(
  target_question_id UUID,
  target_attempt_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.exercise_attempts
    JOIN public.exercise_questions
      ON exercise_questions.exercise_id = exercise_attempts.exercise_id
    WHERE exercise_attempts.id = target_attempt_id
      AND exercise_questions.question_id = target_question_id
  );
$function$;

CREATE FUNCTION private.owns_submission(target_submission_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.submissions
    JOIN public.exercise_attempts
      ON exercise_attempts.id = submissions.attempt_id
    WHERE submissions.id = target_submission_id
      AND exercise_attempts.student_id = (SELECT auth.uid())
  );
$function$;

CREATE FUNCTION private.daily_word_is_published(target_daily_word_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.daily_word_schedules
    WHERE daily_word_id = target_daily_word_id
      AND status = 'published'
      AND publish_date <= CURRENT_DATE
  );
$function$;

REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;

REVOKE ALL ON FUNCTION private.has_role(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_student() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.owns_course(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.owns_topic(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.course_is_published(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_enrolled(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.can_manage_course(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.lesson_course_id(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.lesson_is_published(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.owns_exercise(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.student_can_access_exercise(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.owns_question_bank(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.owns_question(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.question_is_in_published_exercise(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.owns_attempt(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.attempt_is_in_progress(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.question_is_in_attempt(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.owns_submission(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.daily_word_is_published(UUID) FROM PUBLIC;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA private TO authenticated;

CREATE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''),
      NULLIF(NEW.email, ''),
      'Learner'
    )
  );
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_word_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_word_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ebook_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshop_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select_own_or_admin
  ON public.profiles FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()) OR private.has_role('admin'));
CREATE POLICY profiles_update_own
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));
REVOKE UPDATE ON public.profiles FROM anon, authenticated;
GRANT UPDATE (full_name, avatar_url, phone) ON public.profiles TO authenticated;

CREATE POLICY user_roles_select_own_or_admin
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR private.has_role('admin'));

CREATE POLICY courses_select_published_or_owner
  ON public.courses FOR SELECT TO authenticated
  USING (
    status = 'published'
    OR (
      teacher_id = (SELECT auth.uid())
      AND private.has_role('teacher')
    )
    OR private.has_role('admin')
  );
CREATE POLICY courses_insert_teacher
  ON public.courses FOR INSERT TO authenticated
  WITH CHECK (
    teacher_id = (SELECT auth.uid()) AND private.has_role('teacher')
    OR private.has_role('admin')
  );
CREATE POLICY courses_update_owner
  ON public.courses FOR UPDATE TO authenticated
  USING (
    teacher_id = (SELECT auth.uid()) AND private.has_role('teacher')
    OR private.has_role('admin')
  )
  WITH CHECK (
    teacher_id = (SELECT auth.uid()) AND private.has_role('teacher')
    OR private.has_role('admin')
  );

CREATE POLICY topics_select_course_access
  ON public.topics FOR SELECT TO authenticated
  USING (
    private.course_is_published(course_id)
    OR (
      private.is_student()
      AND private.is_enrolled(course_id)
    )
    OR (
      private.owns_course(course_id)
      AND private.has_role('teacher')
    )
    OR private.has_role('admin')
  );
CREATE POLICY topics_insert_course_owner
  ON public.topics FOR INSERT TO authenticated
  WITH CHECK (
    private.owns_course(course_id) AND private.has_role('teacher')
    OR private.has_role('admin')
  );
CREATE POLICY topics_update_course_owner
  ON public.topics FOR UPDATE TO authenticated
  USING (
    private.owns_course(course_id) AND private.has_role('teacher')
    OR private.has_role('admin')
  )
  WITH CHECK (
    private.owns_course(course_id) AND private.has_role('teacher')
    OR private.has_role('admin')
  );

CREATE POLICY lessons_select_course_access
  ON public.lessons FOR SELECT TO authenticated
  USING (
    (
      status = 'published'
      AND private.is_student()
      AND (
        private.course_is_published(private.lesson_course_id(id))
        OR private.is_enrolled(private.lesson_course_id(id))
      )
    )
    OR (
      private.owns_course(private.lesson_course_id(id))
      AND private.has_role('teacher')
    )
    OR private.has_role('admin')
  );
CREATE POLICY lessons_insert_course_owner
  ON public.lessons FOR INSERT TO authenticated
  WITH CHECK (
    private.owns_topic(topic_id)
      AND private.has_role('teacher')
    OR private.has_role('admin')
  );
CREATE POLICY lessons_update_course_owner
  ON public.lessons FOR UPDATE TO authenticated
  USING (
    private.owns_course(private.lesson_course_id(id))
      AND private.has_role('teacher')
    OR private.has_role('admin')
  )
  WITH CHECK (
    private.owns_topic(topic_id)
      AND private.has_role('teacher')
    OR private.has_role('admin')
  );

CREATE POLICY lesson_materials_select_course_access
  ON public.lesson_materials FOR SELECT TO authenticated
  USING (
    (
      status = 'published'
      AND private.lesson_is_published(lesson_id)
      AND private.is_student()
      AND (
        private.course_is_published(private.lesson_course_id(lesson_id))
        OR private.is_enrolled(private.lesson_course_id(lesson_id))
      )
    )
    OR (
      private.owns_course(private.lesson_course_id(lesson_id))
      AND private.has_role('teacher')
    )
    OR private.has_role('admin')
  );
CREATE POLICY lesson_materials_insert_course_owner
  ON public.lesson_materials FOR INSERT TO authenticated
  WITH CHECK (
    private.owns_course(private.lesson_course_id(lesson_id))
      AND private.has_role('teacher')
    OR private.has_role('admin')
  );
CREATE POLICY lesson_materials_update_course_owner
  ON public.lesson_materials FOR UPDATE TO authenticated
  USING (
    private.owns_course(private.lesson_course_id(lesson_id))
      AND private.has_role('teacher')
    OR private.has_role('admin')
  )
  WITH CHECK (
    private.owns_course(private.lesson_course_id(lesson_id))
      AND private.has_role('teacher')
    OR private.has_role('admin')
  );

CREATE POLICY course_enrollments_select_parties
  ON public.course_enrollments FOR SELECT TO authenticated
  USING (
    (
      student_id = (SELECT auth.uid())
      AND private.is_student()
    )
    OR (
      private.owns_course(course_id)
      AND private.has_role('teacher')
    )
    OR private.has_role('admin')
  );

CREATE POLICY lesson_progress_select_own_or_teacher
  ON public.lesson_progress FOR SELECT TO authenticated
  USING (
    (
      student_id = (SELECT auth.uid())
      AND private.is_student()
    )
    OR (
      private.owns_course(private.lesson_course_id(lesson_id))
      AND private.has_role('teacher')
    )
    OR private.has_role('admin')
  );
CREATE POLICY lesson_progress_insert_own
  ON public.lesson_progress FOR INSERT TO authenticated
  WITH CHECK (
    student_id = (SELECT auth.uid())
    AND private.is_student()
    AND private.is_enrolled(private.lesson_course_id(lesson_id))
  );
CREATE POLICY lesson_progress_update_own
  ON public.lesson_progress FOR UPDATE TO authenticated
  USING (
    student_id = (SELECT auth.uid())
    AND private.is_student()
    AND private.is_enrolled(private.lesson_course_id(lesson_id))
  )
  WITH CHECK (
    student_id = (SELECT auth.uid())
    AND private.is_student()
    AND private.is_enrolled(private.lesson_course_id(lesson_id))
  );

CREATE POLICY daily_words_select_published
  ON public.daily_words FOR SELECT TO authenticated
  USING (
    private.daily_word_is_published(id)
    OR created_by = (SELECT auth.uid())
    OR private.has_role('admin')
  );
CREATE POLICY daily_words_insert_admin
  ON public.daily_words FOR INSERT TO authenticated
  WITH CHECK (private.has_role('admin'));
CREATE POLICY daily_words_update_admin
  ON public.daily_words FOR UPDATE TO authenticated
  USING (private.has_role('admin'))
  WITH CHECK (private.has_role('admin'));

CREATE POLICY daily_word_schedules_select_published
  ON public.daily_word_schedules FOR SELECT TO authenticated
  USING (
    status = 'published' AND publish_date <= CURRENT_DATE
    OR private.has_role('admin')
  );
CREATE POLICY daily_word_schedules_insert_admin
  ON public.daily_word_schedules FOR INSERT TO authenticated
  WITH CHECK (private.has_role('admin'));
CREATE POLICY daily_word_schedules_update_admin
  ON public.daily_word_schedules FOR UPDATE TO authenticated
  USING (private.has_role('admin'))
  WITH CHECK (private.has_role('admin'));

CREATE POLICY student_word_progress_select_own
  ON public.student_word_progress FOR SELECT TO authenticated
  USING (
    (
      student_id = (SELECT auth.uid())
      AND private.is_student()
    )
    OR private.has_role('admin')
  );
CREATE POLICY student_word_progress_insert_own
  ON public.student_word_progress FOR INSERT TO authenticated
  WITH CHECK (
    student_id = (SELECT auth.uid())
    AND private.is_student()
    AND private.daily_word_is_published(daily_word_id)
  );
CREATE POLICY student_word_progress_update_own
  ON public.student_word_progress FOR UPDATE TO authenticated
  USING (
    student_id = (SELECT auth.uid())
    AND private.is_student()
  )
  WITH CHECK (
    student_id = (SELECT auth.uid())
    AND private.is_student()
  );

CREATE POLICY ebooks_select_published
  ON public.ebooks FOR SELECT TO authenticated
  USING (status = 'published' OR private.has_role('admin'));
CREATE POLICY ebooks_insert_admin
  ON public.ebooks FOR INSERT TO authenticated
  WITH CHECK (private.has_role('admin'));
CREATE POLICY ebooks_update_admin
  ON public.ebooks FOR UPDATE TO authenticated
  USING (private.has_role('admin'))
  WITH CHECK (private.has_role('admin'));

CREATE POLICY ebook_orders_select_own_or_admin
  ON public.ebook_orders FOR SELECT TO authenticated
  USING (
    (
      student_id = (SELECT auth.uid())
      AND private.is_student()
    )
    OR private.has_role('admin')
  );

CREATE POLICY question_banks_select_owner_or_admin
  ON public.question_banks FOR SELECT TO authenticated
  USING (
    (
      teacher_id = (SELECT auth.uid())
      AND private.has_role('teacher')
    )
    OR private.has_role('admin')
  );
CREATE POLICY question_banks_insert_owner
  ON public.question_banks FOR INSERT TO authenticated
  WITH CHECK (
    teacher_id = (SELECT auth.uid()) AND private.has_role('teacher')
    OR private.has_role('admin')
  );
CREATE POLICY question_banks_update_owner
  ON public.question_banks FOR UPDATE TO authenticated
  USING (
    teacher_id = (SELECT auth.uid()) AND private.has_role('teacher')
    OR private.has_role('admin')
  )
  WITH CHECK (
    teacher_id = (SELECT auth.uid()) AND private.has_role('teacher')
    OR private.has_role('admin')
  );

CREATE POLICY exercises_select_published_or_owner
  ON public.exercises FOR SELECT TO authenticated
  USING (
    (
      private.is_student()
      AND private.student_can_access_exercise(id)
    )
    OR (
      teacher_id = (SELECT auth.uid())
      AND private.has_role('teacher')
    )
    OR private.has_role('admin')
  );
CREATE POLICY exercises_insert_owner
  ON public.exercises FOR INSERT TO authenticated
  WITH CHECK (
    teacher_id = (SELECT auth.uid())
      AND private.has_role('teacher')
      AND private.can_manage_course(course_id)
    OR private.has_role('admin')
  );
CREATE POLICY exercises_update_owner
  ON public.exercises FOR UPDATE TO authenticated
  USING (
    teacher_id = (SELECT auth.uid())
      AND private.has_role('teacher')
      AND private.can_manage_course(course_id)
    OR private.has_role('admin')
  )
  WITH CHECK (
    teacher_id = (SELECT auth.uid())
      AND private.has_role('teacher')
      AND private.can_manage_course(course_id)
    OR private.has_role('admin')
  );

CREATE POLICY questions_select_owner_only
  ON public.questions FOR SELECT TO authenticated
  USING (
    (
      private.owns_question_bank(question_bank_id)
      AND private.has_role('teacher')
    )
    OR (
      private.is_student()
      AND private.question_is_in_published_exercise(id)
    )
    OR private.has_role('admin')
  );
CREATE POLICY questions_insert_owner
  ON public.questions FOR INSERT TO authenticated
  WITH CHECK (
    private.owns_question_bank(question_bank_id)
      AND private.has_role('teacher')
    OR private.has_role('admin')
  );
CREATE POLICY questions_update_owner
  ON public.questions FOR UPDATE TO authenticated
  USING (
    private.owns_question_bank(question_bank_id)
      AND private.has_role('teacher')
    OR private.has_role('admin')
  )
  WITH CHECK (
    private.owns_question_bank(question_bank_id)
      AND private.has_role('teacher')
    OR private.has_role('admin')
  );

REVOKE SELECT ON public.questions FROM PUBLIC, anon, authenticated;
REVOKE SELECT (correct_answer) ON public.questions FROM PUBLIC, anon, authenticated;
GRANT SELECT (
  id,
  question_bank_id,
  question_type,
  content,
  media_url,
  points,
  created_at,
  updated_at
) ON public.questions TO authenticated;

CREATE VIEW public.published_questions
WITH (security_invoker = true)
AS
SELECT id, question_type, content, media_url, points
FROM public.questions
WHERE private.is_student()
  AND private.question_is_in_published_exercise(id);

REVOKE ALL ON public.published_questions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.published_questions TO authenticated;

REVOKE INSERT, UPDATE ON public.student_answers FROM PUBLIC, anon, authenticated;
GRANT INSERT (attempt_id, question_id, answer)
  ON public.student_answers TO authenticated;
GRANT UPDATE (answer) ON public.student_answers TO authenticated;

REVOKE INSERT ON public.exercise_attempts FROM PUBLIC, anon, authenticated;
GRANT INSERT (exercise_id, student_id)
  ON public.exercise_attempts TO authenticated;

REVOKE INSERT ON public.submissions FROM PUBLIC, anon, authenticated;
GRANT INSERT (attempt_id, question_id, text_content, file_url, word_count)
  ON public.submissions TO authenticated;

CREATE POLICY exercise_questions_select_owner_or_published_student
  ON public.exercise_questions FOR SELECT TO authenticated
  USING (
    (
      private.owns_exercise(exercise_id)
      AND private.has_role('teacher')
    )
    OR (
      private.is_student()
      AND private.student_can_access_exercise(exercise_id)
    )
    OR private.has_role('admin')
  );
CREATE POLICY exercise_questions_insert_owner
  ON public.exercise_questions FOR INSERT TO authenticated
  WITH CHECK (
    private.owns_exercise(exercise_id)
      AND private.has_role('teacher')
      AND private.owns_question(question_id)
    OR private.has_role('admin')
  );
CREATE POLICY exercise_questions_update_owner
  ON public.exercise_questions FOR UPDATE TO authenticated
  USING (
    private.owns_exercise(exercise_id)
      AND private.has_role('teacher')
      AND private.owns_question(question_id)
    OR private.has_role('admin')
  )
  WITH CHECK (
    private.owns_exercise(exercise_id)
      AND private.has_role('teacher')
      AND private.owns_question(question_id)
    OR private.has_role('admin')
  );

CREATE POLICY exercise_attempts_select_own_or_teacher
  ON public.exercise_attempts FOR SELECT TO authenticated
  USING (
    (
      student_id = (SELECT auth.uid())
      AND private.is_student()
    )
    OR (
      private.owns_exercise(exercise_id)
      AND private.has_role('teacher')
    )
    OR private.has_role('admin')
  );
CREATE POLICY exercise_attempts_insert_own
  ON public.exercise_attempts FOR INSERT TO authenticated
  WITH CHECK (
    student_id = (SELECT auth.uid())
    AND private.is_student()
    AND private.student_can_access_exercise(exercise_id)
  );

CREATE POLICY student_answers_select_own_or_teacher
  ON public.student_answers FOR SELECT TO authenticated
  USING (
    (
      private.owns_attempt(attempt_id)
      AND private.is_student()
    )
    OR EXISTS (
      SELECT 1
      FROM public.exercise_attempts
      WHERE id = student_answers.attempt_id
        AND private.owns_exercise(exercise_id)
        AND private.has_role('teacher')
    )
    OR private.has_role('admin')
  );
CREATE POLICY student_answers_insert_own
  ON public.student_answers FOR INSERT TO authenticated
  WITH CHECK (
    private.owns_attempt(attempt_id)
    AND private.is_student()
    AND private.attempt_is_in_progress(attempt_id)
    AND private.question_is_in_attempt(question_id, attempt_id)
  );
CREATE POLICY student_answers_update_own
  ON public.student_answers FOR UPDATE TO authenticated
  USING (
    private.owns_attempt(attempt_id)
    AND private.is_student()
    AND private.attempt_is_in_progress(attempt_id)
    AND private.question_is_in_attempt(question_id, attempt_id)
  )
  WITH CHECK (
    private.owns_attempt(attempt_id)
    AND private.is_student()
    AND private.attempt_is_in_progress(attempt_id)
    AND private.question_is_in_attempt(question_id, attempt_id)
  );

CREATE POLICY submissions_select_own_or_teacher
  ON public.submissions FOR SELECT TO authenticated
  USING (
    (
      private.owns_attempt(attempt_id)
      AND private.is_student()
    )
    OR EXISTS (
      SELECT 1
      FROM public.exercise_attempts
      WHERE id = submissions.attempt_id
        AND private.owns_exercise(exercise_id)
        AND private.has_role('teacher')
    )
    OR private.has_role('admin')
  );
CREATE POLICY submissions_insert_own
  ON public.submissions FOR INSERT TO authenticated
  WITH CHECK (
    private.owns_attempt(attempt_id)
    AND private.is_student()
    AND private.attempt_is_in_progress(attempt_id)
    AND private.question_is_in_attempt(question_id, attempt_id)
  );

CREATE POLICY teacher_reviews_select_parties
  ON public.teacher_reviews FOR SELECT TO authenticated
  USING (
    private.owns_submission(submission_id)
      AND private.is_student()
    OR (
      teacher_id = (SELECT auth.uid())
      AND private.has_role('teacher')
    )
    OR private.has_role('admin')
  );
CREATE POLICY teacher_reviews_insert_assigned_teacher
  ON public.teacher_reviews FOR INSERT TO authenticated
  WITH CHECK (
    teacher_id = (SELECT auth.uid())
    AND private.has_role('teacher')
    AND EXISTS (
      SELECT 1
      FROM public.submissions
      JOIN public.exercise_attempts
        ON exercise_attempts.id = submissions.attempt_id
      WHERE submissions.id = teacher_reviews.submission_id
        AND private.owns_exercise(exercise_attempts.exercise_id)
    )
  );

CREATE POLICY workshops_select_scheduled_or_owner
  ON public.workshops FOR SELECT TO authenticated
  USING (
    status IN ('scheduled', 'ongoing')
    OR (
      teacher_id = (SELECT auth.uid())
      AND private.has_role('teacher')
    )
    OR private.has_role('admin')
  );
CREATE POLICY workshops_insert_owner
  ON public.workshops FOR INSERT TO authenticated
  WITH CHECK (
    teacher_id = (SELECT auth.uid()) AND private.has_role('teacher')
    OR private.has_role('admin')
  );
CREATE POLICY workshops_update_owner
  ON public.workshops FOR UPDATE TO authenticated
  USING (
    teacher_id = (SELECT auth.uid()) AND private.has_role('teacher')
    OR private.has_role('admin')
  )
  WITH CHECK (
    teacher_id = (SELECT auth.uid()) AND private.has_role('teacher')
    OR private.has_role('admin')
  );

CREATE POLICY workshop_registrations_select_parties
  ON public.workshop_registrations FOR SELECT TO authenticated
  USING (
    (
      student_id = (SELECT auth.uid())
      AND private.is_student()
    )
    OR EXISTS (
      SELECT 1
      FROM public.workshops
      WHERE id = workshop_registrations.workshop_id
        AND teacher_id = (SELECT auth.uid())
        AND private.has_role('teacher')
    )
    OR private.has_role('admin')
  );

CREATE POLICY payments_select_own_or_admin
  ON public.payments FOR SELECT TO authenticated
  USING (
    (
      student_id = (SELECT auth.uid())
      AND private.is_student()
    )
    OR private.has_role('admin')
  );

CREATE POLICY email_notifications_select_own_or_admin
  ON public.email_notifications FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR private.has_role('admin'));
