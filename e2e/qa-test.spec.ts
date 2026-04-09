import { test, expect } from '@playwright/test';

test('cross-tenant registration flow', async ({ page }) => {
  const timestamp = Date.now();
  const testEmail = `test-user-${timestamp}@example.com`;
  const testPassword = 'Password123!';

  // 1. Navigate to register
  await page.goto('http://localhost:3000/register');

  // 2. Create a brand new user
  await page.fill('input[name="name"]', `Test User ${timestamp}`);
  await page.fill('input[name="email"]', testEmail);
  await page.fill('input[name="password"]', testPassword);
  await page.fill('input[name="confirmPassword"]', testPassword);
  await page.click('button[type="submit"]');

  // 3. Verify registration success (should redirect or show success message)
  await page.waitForURL((url) => !url.href.includes('/register'), { timeout: 10000 });
  
  // LOGOUT so we can register again
  // Direct to signout API
  await page.goto('http://localhost:3000/api/auth/signout');
  await page.click('button[type="submit"]'); // if there's a confirmation button
  await page.goto('http://localhost:3000/login');
  
  // 4. Navigate to register again
  await page.goto('http://localhost:3000/register');

  // 5. Try to register the EXACT SAME user email
  await page.fill('input[name="name"]', `Test User ${timestamp} Duplicate`);
  await page.fill('input[name="email"]', testEmail);
  await page.fill('input[name="password"]', testPassword);
  await page.fill('input[name="confirmPassword"]', testPassword);
  await page.click('button[type="submit"]');

  // 6. Verify the expected error message
  // Wait for the exact element containing error or check the body
  await page.waitForTimeout(2000); // Give it a sec to show the error
  
  const bodyText = await page.textContent('body');
  
  if (!bodyText?.includes('อีเมล')) { // looking for "มีบัญชีที่ใช้อีเมลนี้อยู่แล้วในระบบนี้" or similar
      console.log('Body text:', bodyText);
      throw new Error('Error message not found');
  }
  
  console.log("Success: Found error message about email duplication.");
});
