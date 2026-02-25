import { test, expect } from '@playwright/test';


test('register page flow', async ({ page }) => {
  // Generate random data for registration
  const randomSuffix = Math.floor(Math.random() * 100000);
  const salonName = `Test Salon ${randomSuffix}`;
  const email = `test.salon.${randomSuffix}@example.com`;
  const phone = '123456789';
  const password = 'password123';

  await page.goto('/register');

  // Fill in the form with random data
  await page.getByLabel('Nazwa gabinetu').fill(salonName);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel(/Telefon/).fill(phone);
  await page.getByLabel('Hasło').fill(password);

  // Click submit
  await page.getByRole('button', { name: 'Zarejestruj gabinet' }).click();

  // Expect redirection to dashboard on success
  // Note: This will fail if Supabase is not configured correctly in .env.local
  // In that case, it might redirect to /register?error=...
  await expect(page).toHaveURL(/dashboard/);
});

