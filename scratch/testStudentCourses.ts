// testStudentCourses.ts
// Simple script to exercise the my‑courses endpoint.

async function main() {
  const base = 'http://localhost:5000/api';
  const student = {
    fullName: 'Demo Student',
    dateOfBirth: '2000-01-01',
    email: 'demo.student@example.com',
    phoneNumber: '1234567890',
    password: 'Password123',
    confirmPassword: 'Password123',
  };

  // 1. Register (ignore if already exists)
  try {
    const regRes = await fetch(`${base}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(student),
    });
    console.log('Register status:', regRes.status);
    const regJson = await regRes.json();
    console.log('Register response:', regJson);
  } catch (e) {
    console.error('Register error:', e);
  }

  // 2. Login
  const loginRes = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: student.email, password: student.password }),
  });
  console.log('Login status:', loginRes.status);
  const loginJson = await loginRes.json();
  console.log('Login response:', loginJson);
  const token = loginJson?.data?.accessToken;
  if (!token) {
    console.error('No access token obtained, abort');
    return;
  }

  // 3. Fetch my‑courses
  const coursesRes = await fetch(`${base}/courses/my-courses`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  console.log('My‑courses status:', coursesRes.status);
  const coursesJson = await coursesRes.json();
  console.log('My‑courses response:', coursesJson);
}

main().catch(err => console.error('Unexpected error:', err));
