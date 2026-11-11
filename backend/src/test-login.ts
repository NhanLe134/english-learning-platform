import { authService } from './modules/auth/auth.service.js';

(async () => {
  const email = 'admin@example.com';
  const password = 'admin123';
  try {
    const result = await authService.login(email, password);
    console.log('Login successful:', result);
  } catch (err) {
    console.error('Login failed:', err);
  }
})();
