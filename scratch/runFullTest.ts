import { spawn } from 'child_process';

async function delay(ms: number) {
  return new Promise(res => setTimeout(res, ms));
}

async function main() {
  // Start backend server in the same process (child)
  const server = spawn('node', ['backend/dist/server.js'], { stdio: 'inherit' });
  // Give it a moment to start listening
  await delay(2000);

  const base = 'http://localhost:5000/api';
  const student = {
    fullName: 'Test Student',
    dateOfBirth: '2000-01-01',
    email: 'test.student@example.com',
    phoneNumber: '123456789',
    password: 'Password123',
    confirmPassword: 'Password123',
  };

  // Register (ignore if already exists)
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

  // Login
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
    console.error('No token obtained, abort');
    server.kill();
    process.exit(1);
  }

  // Fetch my‑courses
  const coursesRes = await fetch(`${base}/courses/my-courses`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  console.log('My‑courses status:', coursesRes.status);
  const coursesJson = await coursesRes.json();
  console.log('My‑courses data:', JSON.stringify(coursesJson, null, 2));

  // Clean up server
  server.kill();
}

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
