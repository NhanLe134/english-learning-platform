// Test admin login and fetch enrolled courses

async function main() {
  const base = 'http://localhost:5000/api';
  // admin credentials (from seed)
  const loginRes = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@example.com', password: 'admin123' }),
  });
  console.log('Login status:', loginRes.status);
  const loginJson = await loginRes.json();
  console.log('Login response:', loginJson);
  const token = loginJson?.data?.accessToken;
  if (!token) {
    console.error('No token obtained');
    return;
  }
  const coursesRes = await fetch(`${base}/courses/my-courses`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  console.log('My-courses status:', coursesRes.status);
  const coursesJson = await coursesRes.json();
  console.log('Courses response:', coursesJson);
}

main().catch(err => console.error('Error:', err));
