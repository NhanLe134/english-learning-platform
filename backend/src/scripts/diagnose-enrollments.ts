/**
 * Enrollment Diagnostic Script
 *
 * Usage: npx tsx src/scripts/diagnose-enrollments.ts [email]
 *
 * Checks:
 * 1. Finds the student profile by email
 * 2. Lists all paid orders for that student
 * 3. Lists all enrollments for that student
 * 4. Identifies paid orders with MISSING enrollment records
 * 5. Reports the reconcile endpoint URL for each orphaned order
 *
 * This script is READ-ONLY. It does NOT modify any data.
 */

import { createSupabaseClient } from '../config/supabase.js'

const targetEmail = process.argv[2]?.toLowerCase().trim()
const client = createSupabaseClient()

async function main() {
  console.log('=== Enrollment Diagnostic Report ===\n')

  // 1. Find profiles
  const profileQuery = client
    .from('profiles')
    .select('id, email, full_name, status, is_verified, role')
    .order('created_at', { ascending: false })
    .limit(50)

  const { data: profiles, error: profileError } = targetEmail
    ? await profileQuery.ilike('email', `%${targetEmail}%`)
    : await profileQuery

  if (profileError) {
    console.error('ERROR fetching profiles:', profileError.message)
    process.exit(1)
  }

  if (!profiles || profiles.length === 0) {
    console.log('No profiles found.')
    return
  }

  console.log(`Found ${profiles.length} profile(s):`)
  for (const p of profiles) {
    console.log(`  id=${p.id}  email=${p.email}  status=${p.status}  verified=${p.is_verified}  role=${p.role}`)
  }
  console.log()

  for (const profile of profiles) {
    console.log(`\n--- Student: ${profile.email} (${profile.id}) ---`)

    // 2. Paid orders
    const { data: orders, error: ordersErr } = await client
      .from('course_orders')
      .select('id, course_id, status, paid_at, created_at, provider_transaction_id')
      .eq('student_id', profile.id)
      .eq('status', 'paid')

    if (ordersErr) {
      console.error('  ERROR fetching orders:', ordersErr.message)
      continue
    }

    console.log(`  Paid orders: ${orders?.length ?? 0}`)
    for (const o of orders ?? []) {
      console.log(`    orderId=${o.id}  courseId=${o.course_id}  paidAt=${o.paid_at}  txnId=${o.provider_transaction_id}`)
    }

    // 3. Active enrollments
    const { data: enrollments, error: enrollErr } = await client
      .from('course_enrollments')
      .select('id, course_id, status, enrolled_at')
      .eq('student_id', profile.id)
      .in('status', ['active', 'completed'])

    if (enrollErr) {
      console.error('  ERROR fetching enrollments:', enrollErr.message)
      continue
    }

    console.log(`  Active enrollments: ${enrollments?.length ?? 0}`)
    for (const e of enrollments ?? []) {
      console.log(`    enrollmentId=${e.id}  courseId=${e.course_id}  status=${e.status}`)
    }

    // 4. Identify orphaned paid orders (paid but no enrollment)
    const enrolledCourseIds = new Set((enrollments ?? []).map(e => String(e.course_id)))
    const orphanedOrders = (orders ?? []).filter(o => !enrolledCourseIds.has(String(o.course_id)))

    if (orphanedOrders.length === 0) {
      console.log('  ✅ All paid orders have matching enrollments.')
    } else {
      console.log(`\n  ⚠️  ${orphanedOrders.length} paid order(s) MISSING enrollment:`)
      for (const o of orphanedOrders) {
        console.log(`    orderId=${o.id}  courseId=${o.course_id}`)
        console.log(`    → Reconcile via admin API: POST /api/payment/admin/orders/${o.id}/reconcile`)
        console.log(`      (Requires admin JWT in Authorization header)`)
      }
    }
  }

  console.log('\n=== End of Report ===')
}

main().catch((err: unknown) => {
  console.error('Script failed:', err instanceof Error ? err.message : String(err))
  process.exit(1)
})
