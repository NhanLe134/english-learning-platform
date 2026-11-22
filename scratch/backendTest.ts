import './dist/server.js';

async function main() {
  // wait for server to start
  await new Promise(r => setTimeout(r, 2000));
  // Login as admin
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@example.com', password: 'admin123' }),
  });
  console.log('Login status:', loginRes.status);
  const loginJson = await loginRes.json();
  console.log('Login response:', loginJson);
  const token = loginJson?.data?.accessToken;
  if (!token) {
    console.error('No token, abort');
    process.exit(1);
  }
  // Fetch my-courses
  const coursesRes = await fetch('http://localhost:5000/api/courses/my-courses', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  console.log('My-courses status:', coursesRes.status);
  const coursesJson = await coursesRes.json();
  console.log('Courses response:', coursesJson);
  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
