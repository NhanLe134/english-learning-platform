import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { describe, it } from 'node:test'
import pg from 'pg'

const testDatabaseUrl = process.env.PAYMENT_TEST_DATABASE_URL
const migrationUrl = new URL('../../../../supabase/migrations/20261111000000_atomic_course_payment_confirmation.sql', import.meta.url)

describe('atomic payment migration on PostgreSQL', { skip: !testDatabaseUrl }, () => {
  it('locks and transitions orders with enrollment atomically, idempotently, and with restricted execute access', async () => {
    const databaseUrl = new URL(testDatabaseUrl!)
    const databaseName = databaseUrl.pathname.replace(/^\//, '')
    assert.ok(['localhost', '127.0.0.1', '::1'].includes(databaseUrl.hostname), 'PAYMENT_TEST_DATABASE_URL must use loopback')
    assert.equal(databaseName, 'payment_integrity_test', 'Use a disposable payment_integrity_test database')

    const migration = await readFile(migrationUrl, 'utf8')
    const client = new pg.Client({ connectionString: testDatabaseUrl, connectionTimeoutMillis: 5000 })
    await client.connect()
    let transactionOpen = false
    try {
      const roles = await client.query(
        "SELECT rolname FROM pg_roles WHERE rolname = ANY($1)",
        [['anon', 'authenticated', 'service_role']],
      )
      assert.deepEqual(new Set(roles.rows.map((row: { rolname: string }) => row.rolname)), new Set(['anon', 'authenticated', 'service_role']))

      const existingAppTables = await client.query(
        "SELECT to_regclass('public.course_orders') AS course_orders, to_regclass('public.course_enrollments') AS course_enrollments, to_regclass('public.profiles') AS profiles",
      )
      assert.ok(Object.values(existingAppTables.rows[0]).every((value) => value === null), 'Disposable database must not contain application tables')

      await client.query('BEGIN')
      transactionOpen = true
      await client.query(`
        CREATE TABLE public.profiles (id uuid PRIMARY KEY, status text NOT NULL);
        CREATE TABLE public.courses (id uuid PRIMARY KEY);
        CREATE TABLE public.course_orders (
          id uuid PRIMARY KEY,
          student_id uuid NOT NULL REFERENCES public.profiles(id),
          course_id uuid NOT NULL REFERENCES public.courses(id),
          amount numeric(12,2) NOT NULL,
          currency text NOT NULL,
          status text NOT NULL,
          provider_order_id text,
          provider_transaction_id text,
          paid_at timestamptz,
          updated_at timestamptz NOT NULL
        );
        CREATE TABLE public.course_enrollments (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          student_id uuid NOT NULL REFERENCES public.profiles(id),
          course_id uuid NOT NULL REFERENCES public.courses(id),
          status text NOT NULL,
          enrolled_at timestamptz NOT NULL DEFAULT now(),
          UNIQUE (course_id, student_id)
        );
      `)
      await client.query(migration)

      const privileges = await client.query(`
        SELECT
          has_function_privilege('anon', 'public.confirm_course_order_payment(uuid,text,text,numeric)', 'EXECUTE') AS anon_can_execute,
          has_function_privilege('authenticated', 'public.confirm_course_order_payment(uuid,text,text,numeric)', 'EXECUTE') AS authenticated_can_execute,
          has_function_privilege('service_role', 'public.confirm_course_order_payment(uuid,text,text,numeric)', 'EXECUTE') AS service_role_can_execute
      `)
      assert.deepEqual(privileges.rows[0], {
        anon_can_execute: false,
        authenticated_can_execute: false,
        service_role_can_execute: true,
      })

      const studentId = '00000000-0000-4000-8000-000000000001'
      const courseId = '00000000-0000-4000-8000-000000000002'
      const orderId = '00000000-0000-4000-8000-000000000003'
      const delayedOrderId = '00000000-0000-4000-8000-000000000004'
      const failedOrderId = '00000000-0000-4000-8000-000000000005'
      const failureStudentId = '00000000-0000-4000-8000-000000000006'
      await client.query("INSERT INTO public.profiles (id, status) VALUES ($1, 'pending')", [studentId])
      await client.query("INSERT INTO public.profiles (id, status) VALUES ($1, 'pending')", [failureStudentId])
      await client.query('INSERT INTO public.courses (id) VALUES ($1)', [courseId])
      await client.query(`
        INSERT INTO public.course_orders (id, student_id, course_id, amount, currency, status, updated_at)
        VALUES ($1, $2, $3, 50000, 'VND', 'pending', now()),
               ($4, $2, $3, 50000, 'VND', 'expired', now()),
               ($5, $6, $3, 50000, 'VND', 'pending', now())
      `, [orderId, studentId, courseId, delayedOrderId, failedOrderId, failureStudentId])

      const paid = await client.query('SELECT public.confirm_course_order_payment($1, $2, $3, $4) AS result', [orderId, 'gateway-order-1', 'gateway-transaction-1', 50000])
      assert.equal(paid.rows[0].result.order.status, 'paid')
      assert.equal(paid.rows[0].result.isNewlyPaid, true)
      const duplicate = await client.query('SELECT public.confirm_course_order_payment($1, $2, $3, $4) AS result', [orderId, 'gateway-order-1', 'gateway-transaction-1', 50000])
      assert.equal(duplicate.rows[0].result.isNewlyPaid, false)
      await client.query("UPDATE public.course_enrollments SET status = 'completed' WHERE student_id = $1 AND course_id = $2", [studentId, courseId])
      await client.query('SELECT public.confirm_course_order_payment($1, $2, $3, $4)', [orderId, 'gateway-order-1', 'gateway-transaction-1', 50000])

      const delayed = await client.query('SELECT public.confirm_course_order_payment($1, $2, $3, $4) AS result', [delayedOrderId, 'gateway-order-2', 'gateway-transaction-2', 50000])
      assert.equal(delayed.rows[0].result.order.status, 'paid')
      const state = await client.query(`
        SELECT o.status AS order_status, e.status AS enrollment_status, count(e.id) OVER () AS enrollment_count, p.status AS profile_status
        FROM public.course_orders o
        JOIN public.profiles p ON p.id = o.student_id
        LEFT JOIN public.course_enrollments e ON e.student_id = o.student_id AND e.course_id = o.course_id
        WHERE o.id = $1
      `, [delayedOrderId])
      assert.deepEqual(state.rows[0], {
        order_status: 'paid',
        enrollment_status: 'completed',
        enrollment_count: '1',
        profile_status: 'active',
      })

      await client.query(`
        CREATE FUNCTION public.reject_enrollment_for_test() RETURNS trigger
        LANGUAGE plpgsql AS $test$ BEGIN RAISE EXCEPTION 'simulated enrollment write failure'; END $test$;
        CREATE TRIGGER reject_enrollment_for_test BEFORE INSERT ON public.course_enrollments
        FOR EACH ROW EXECUTE FUNCTION public.reject_enrollment_for_test();
        SAVEPOINT enrollment_failure;
      `)
      await assert.rejects(
        client.query('SELECT public.confirm_course_order_payment($1, $2, $3, $4)', [failedOrderId, 'gateway-order-3', 'gateway-transaction-3', 50000]),
        /simulated enrollment write failure/,
      )
      await client.query('ROLLBACK TO SAVEPOINT enrollment_failure')
      const rolledBack = await client.query(`
        SELECT o.status AS order_status, p.status AS profile_status, count(e.id)::integer AS enrollment_count
        FROM public.course_orders o
        JOIN public.profiles p ON p.id = o.student_id
        LEFT JOIN public.course_enrollments e ON e.student_id = o.student_id AND e.course_id = o.course_id
        WHERE o.id = $1
        GROUP BY o.status, p.status
      `, [failedOrderId])
      assert.deepEqual(rolledBack.rows[0], {
        order_status: 'pending',
        profile_status: 'pending',
        enrollment_count: 0,
      })
      await client.query('ROLLBACK')
      transactionOpen = false
    } finally {
      if (transactionOpen) await client.query('ROLLBACK').catch(() => undefined)
      await client.end()
    }
  })
})
