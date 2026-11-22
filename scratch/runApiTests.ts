// runApiTests.ts - verifies login and my-courses endpoint

async function main() {
  const base = 'http://localhost:5000/api';
  // Use a test student (create if not exists)
  const student = {
    fullName: 'Auto Test Student',
    dateOfBirth: '2000-01-01',
    email: 'autotest.student@example.com',
    phoneNumber: '1234567890',
    password: 'Password123',
    confirmPassword: 'Password123',
  };

  // Register (ignore conflict)
  try {
    const regRes = await fetch(`${base}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(student),
    });
    console.log('Register status:', regRes.status);
    const regJson = await regRes.json();
    console.log('Register body:', regJson);
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
  const loginBody = await loginRes.json();
  console.log('Login body:', loginBody);
  const token = loginBody?.data?.accessToken;
  if (!token) {
    console.error('No access token, abort');
    return;
  }

  // Fetch my‑courses
  const myRes = await fetch(`${base}/courses/my-courses`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  console.log('My‑courses status:', myRes.status);
  const myBody = await myRes.json();
  console.log('My‑courses body:', myBody);
}

main().catch(err => console.error('Unhandled error:', err));
