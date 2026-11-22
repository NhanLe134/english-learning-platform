-- Keep course previews public, but require a paid enrollment to read learning
-- lessons, materials, and student progress through Supabase APIs.
CREATE OR REPLACE FUNCTION private.has_paid_course_access(target_course_id UUID)
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
  ) OR EXISTS (
    SELECT 1
    FROM public.course_orders
    WHERE course_id = target_course_id
      AND student_id = (SELECT auth.uid())
      AND status = 'paid'
      AND currency = 'VND'
      AND amount > 0
  );
$function$;
REVOKE ALL ON FUNCTION private.has_paid_course_access(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_paid_course_access(UUID) TO authenticated;

DROP POLICY IF EXISTS lessons_select_course_access ON public.lessons;
CREATE POLICY lessons_select_course_access
  ON public.lessons FOR SELECT TO authenticated
  USING (
    (
      status = 'published'
      AND private.is_student()
      AND private.has_paid_course_access(private.lesson_course_id(id))
    )
    OR (
      private.owns_course(private.lesson_course_id(id))
      AND private.has_role('teacher')
    )
    OR private.has_role('admin')
  );

DROP POLICY IF EXISTS lesson_materials_select_course_access ON public.lesson_materials;
CREATE POLICY lesson_materials_select_course_access
  ON public.lesson_materials FOR SELECT TO authenticated
  USING (
    (
      status = 'published'
      AND private.lesson_is_published(lesson_id)
      AND private.is_student()
      AND private.has_paid_course_access(private.lesson_course_id(lesson_id))
    )
    OR (
      private.owns_course(private.lesson_course_id(lesson_id))
      AND private.has_role('teacher')
    )
    OR private.has_role('admin')
  );

DROP POLICY IF EXISTS lesson_progress_select_own_or_teacher ON public.lesson_progress;
CREATE POLICY lesson_progress_select_own_or_teacher
  ON public.lesson_progress FOR SELECT TO authenticated
  USING (
    (
      student_id = (SELECT auth.uid())
      AND private.is_student()
      AND private.has_paid_course_access(private.lesson_course_id(lesson_id))
    )
    OR (
      private.owns_course(private.lesson_course_id(lesson_id))
      AND private.has_role('teacher')
    )
    OR private.has_role('admin')
  );

DROP POLICY IF EXISTS lesson_progress_insert_own ON public.lesson_progress;
CREATE POLICY lesson_progress_insert_own
  ON public.lesson_progress FOR INSERT TO authenticated
  WITH CHECK (
    student_id = (SELECT auth.uid())
    AND private.is_student()
    AND private.has_paid_course_access(private.lesson_course_id(lesson_id))
  );

DROP POLICY IF EXISTS lesson_progress_update_own ON public.lesson_progress;
CREATE POLICY lesson_progress_update_own
  ON public.lesson_progress FOR UPDATE TO authenticated
  USING (
    student_id = (SELECT auth.uid())
    AND private.is_student()
    AND private.has_paid_course_access(private.lesson_course_id(lesson_id))
  )
  WITH CHECK (
    student_id = (SELECT auth.uid())
    AND private.is_student()
    AND private.has_paid_course_access(private.lesson_course_id(lesson_id))
  );
