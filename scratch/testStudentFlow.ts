// Test student flow: register, login, fetch my-courses

async function registerStudent() {
  const base = 'http://localhost:5000/api';
  const res = await fetch(`${base}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Test Student',
      dateOfBirth: '2000-01-01',
      email: 'student1@example.com',
      phoneNumber: '123456789',
      password: 'Password123',
      confirmPassword: 'Password123',
    }),
  });
  console.log('Register status:', res.status);
  const data = await res.json();
  console.log('Register response:', data);
}

async function loginAndFetch() {
  const base = 'http://localhost:5000/api';
  const loginRes = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'student1@example.com', password: 'Password123' }),
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

async function main() {
  await registerStudent();
  await loginAndFetch();
}

main().catch(err => console.error('Error:', err));
