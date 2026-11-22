import { getDatabasePool } from '../src/config/database.js'

const pool = getDatabasePool()
const client = await pool.connect()

try {
  await client.query('BEGIN READ ONLY')
  const tables = await client.query(
    "select to_regclass('public.auth_identities') as identities, to_regclass('auth.users') as auth_users"
  )
  const profiles = await client.query(
    "select count(*)::int as profiles, count(*) filter (where lower(email) in (select lower(email) from public.profiles group by lower(email) having count(*) > 1))::int as profiles_in_duplicate_email_groups, count(*) filter (where status = 'active' and is_verified)::int as active_verified from public.profiles"
  )
  const orders = await client.query(
    "select count(*)::int as orders, count(*) filter(where status = 'paid')::int as paid_orders, count(*) filter(where status = 'paid' and not exists (select 1 from public.course_enrollments e where e.student_id = o.student_id and e.course_id = o.course_id and e.status in ('active', 'completed')))::int as paid_without_active_enrollment from public.course_orders o"
  )
  let identities = { rows: [{ identities: 0, orphan_identities: 0, google_profiles: 0, google_profiles_with_paid_orders: 0 }] }
  if (tables.rows[0]?.identities) {
    identities = await client.query(
      "select count(*)::int as identities, count(*) filter(where p.id is null)::int as orphan_identities, count(distinct i.profile_id)::int as google_profiles, count(distinct i.profile_id) filter(where exists (select 1 from public.course_orders o where o.student_id = i.profile_id and o.status = 'paid'))::int as google_profiles_with_paid_orders from public.auth_identities i left join public.profiles p on p.id = i.profile_id"
    )
  }
  let auth = { rows: [{ auth_users: null, profile_ids_matching_auth_users: null }] }
  if (tables.rows[0]?.auth_users) {
    auth = await client.query(
      'select (select count(*)::int from auth.users) as auth_users, (select count(*)::int from public.profiles p join auth.users u on u.id = p.id) as profile_ids_matching_auth_users'
    )
  }
  const legacy = await client.query(
    "select count(*) filter(where google_id is not null and length(btrim(google_id)) > 0)::int as legacy_google_ids, count(*) filter(where google_id like 'dev-google-%')::int as dev_google_ids from public.auth_registration_details"
  )
  const mappingConsistency = tables.rows[0]?.identities
    ? await client.query(
      "select count(*) filter(where d.google_id = i.provider_subject)::int as matching_legacy_subjects, count(*) filter(where d.google_id is not null and d.google_id <> i.provider_subject)::int as mismatching_legacy_subjects, count(*) filter(where p.status = 'active' and p.is_verified)::int as active_verified_google_profiles, count(*) filter(where p.status <> 'active' or not p.is_verified)::int as blocked_google_profiles from public.auth_identities i join public.profiles p on p.id = i.profile_id left join public.auth_registration_details d on d.user_id = p.id"
    )
    : { rows: [{ matching_legacy_subjects: 0, mismatching_legacy_subjects: 0, active_verified_google_profiles: 0, blocked_google_profiles: 0 }] }
  const linkedCourseOwnership = tables.rows[0]?.identities
    ? await client.query(
      "select count(*) filter(where paid_count > 0)::int as google_profiles_with_paid_orders, count(*) filter(where enrollment_count > 0)::int as google_profiles_with_active_enrollments from (select i.profile_id, count(o.id) filter(where o.status = 'paid') as paid_count, count(e.id) filter(where e.status in ('active','completed')) as enrollment_count from public.auth_identities i left join public.course_orders o on o.student_id = i.profile_id left join public.course_enrollments e on e.student_id = i.profile_id group by i.profile_id) ownership"
    )
    : { rows: [{ google_profiles_with_paid_orders: 0, google_profiles_with_active_enrollments: 0 }] }
  console.log(JSON.stringify({ tables: tables.rows[0], profiles: profiles.rows[0], orders: orders.rows[0], identities: identities.rows[0], auth: auth.rows[0], legacy: legacy.rows[0], mappingConsistency: mappingConsistency.rows[0], linkedCourseOwnership: linkedCourseOwnership.rows[0] }))
  await client.query('ROLLBACK')
} finally {
  client.release()
  await pool.end()
}
