import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: 'backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL ?? '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase env vars missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const email = 'Truongthihonghoa2@gmail.com';
  // 1. Find user
  const { data: users, error: userErr } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('email', email)
    .single();
  if (userErr || !users) {
    console.error('User not found:', userErr);
    return;
  }
  const userId = users.id;
  console.log('User ID:', userId);

  // 2. Check enrollments
  const { data: enrollments, error: enrollErr } = await supabase
    .from('enrollments')
    .select('*')
    .eq('student_id', userId);
  if (enrollErr) {
    console.error('Enroll query error:', enrollErr);
    return;
  }
  if (enrollments && enrollments.length > 0) {
    console.log(`User already has ${enrollments.length} enrollment(s).`);
    console.log(enrollments);
    return;
  }
  console.log('No enrollments found – will try to confirm a payment order.');

  // 3. Find a pending payment order for this user (status = pending)
  const { data: orders, error: orderErr } = await supabase
    .from('payment_orders')
    .select('id, course_id, status')
    .eq('student_id', userId)
    .eq('status', 'pending');
  if (orderErr) {
    console.error('Payment order query error:', orderErr);
    return;
  }
  if (!orders || orders.length === 0) {
    console.log('No pending payment orders found for this user.');
    return;
  }
  const order = orders[0];
  console.log('Found pending order:', order);

  // 4. Call RPC to confirm payment (this will also create enrollment)
  const { data: rpcResult, error: rpcErr } = await supabase.rpc('confirm_course_order_payment', {
    student_id: userId,
    course_id: order.course_id,
  });
  if (rpcErr) {
    console.error('RPC confirm_course_order_payment error:', rpcErr);
    return;
  }
  console.log('RPC result:', rpcResult);

  // 5. Verify enrollment now exists
  const { data: postEnroll, error: postEnrollErr } = await supabase
    .from('enrollments')
    .select('*')
    .eq('student_id', userId);
  if (postEnrollErr) {
    console.error('Post‑enrollment query error:', postEnrollErr);
    return;
  }
  console.log('Enrollments after RPC:', postEnroll);
}

main().catch(err => console.error('Unexpected error:', err));
