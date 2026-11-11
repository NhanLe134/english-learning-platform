import { createSupabaseClient } from './config/supabase.js';
(async () => {
  const client = createSupabaseClient();
  const { data, error } = await client.from('profiles').select('*');
  if (error) {
    console.error('Error fetching users:', error);
    process.exit(1);
  }
  console.log('Users:', JSON.stringify(data, null, 2));
})();
