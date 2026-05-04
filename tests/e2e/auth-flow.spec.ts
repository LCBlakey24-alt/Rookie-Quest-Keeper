import { test, expect } from '@playwright/test';
import { waitForAppReady, dismissToasts, removeBlockingBadges, generateTestUsername, generateTestEmail, loginUser, registerUser, TEST_USER } from '../fixtures/helpers';

test.describe('Auth Flow - Email Based Login', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await removeBlockingBadges(page);
  });

  test('should display login page with email input', async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    
    // Verify login form elements with email
    await expect(page.getByTestId('login-email')).toBeVisible();
    await expect(page.getByTestId('login-password')).toBeVisible();
    await expect(page.getByTestId('login-btn')).toBeVisible();
    
    // Verify design elements
    const loginBtn = page.getByTestId('login-btn');
    await expect(loginBtn).toHaveText(/LOG IN/i);
    
    // Verify "Forgot password?" link exists
    await expect(page.getByText(/forgot password/i)).toBeVisible();
  });

  test('should switch between login and register forms', async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    
    // Initially should show login form
    await expect(page.getByTestId('login-email')).toBeVisible();
    
    // Click to switch to register
    await page.getByRole('button', { name: /create account/i }).click();
    
    // Verify register form is visible with email, username, and password
    await expect(page.getByTestId('register-email')).toBeVisible();
    await expect(page.getByTestId('register-username')).toBeVisible();
    await expect(page.getByTestId('register-password')).toBeVisible();
    await expect(page.getByTestId('register-btn')).toBeVisible();
    
    // Switch back to login
    await page.getByRole('button', { name: /back to login/i }).click();
    await expect(page.getByTestId('login-email')).toBeVisible();
  });

  test('should register a new user and redirect to unified dashboard', async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    
    const testEmail = generateTestEmail();
    const testUsername = generateTestUsername();
    
    // Register user
    await registerUser(page, testEmail, testUsername, 'testpass123');
    
    // Should redirect to /home (UnifiedDashboard) - no longer /campaigns
    await expect(page).toHaveURL(/\/home/, { timeout: 15000 });
    
    // Verify we see the UnifiedDashboard with "MY CHARACTERS" and "MY CAMPAIGNS" sections
    await expect(page.getByText('MY CHARACTERS')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('MY CAMPAIGNS')).toBeVisible();
  });

  test('should login with email and redirect to unified dashboard', async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    
    // Login with test credentials
    await loginUser(page, TEST_USER.email, TEST_USER.password);
    
    // Should redirect to /home (UnifiedDashboard) - no longer /campaigns
    await expect(page).toHaveURL(/\/home/, { timeout: 15000 });
    
    // Verify we see the UnifiedDashboard
    await expect(page.getByText('MY CHARACTERS')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('MY CAMPAIGNS')).toBeVisible();
  });

  test('should show error for invalid login credentials', async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    
    // Try login with invalid credentials
    await page.getByTestId('login-email').fill('invalid@test.com');
    await page.getByTestId('login-password').fill('wrongpassword');
    await page.getByTestId('login-btn').click();
    
    // Should stay on auth page and show error toast
    await expect(page).toHaveURL(/\/auth/);
    // Error toast should appear (sonner toast)
    await expect(page.locator('[data-sonner-toast]').first()).toBeVisible({ timeout: 5000 });
  });

  test('should show validation error for short password in registration', async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    
    // Switch to register
    await page.getByRole('button', { name: /create account/i }).click();
    
    // Fill with short password
    await page.getByTestId('register-email').fill('test@example.com');
    await page.getByTestId('register-username').fill('testuser');
    await page.getByTestId('register-password').fill('short');
    await page.getByTestId('register-btn').click();
    
    // Should stay on auth page
    await expect(page).toHaveURL(/\/auth/);
  });
});

test.describe('Forgot Password Flow', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await removeBlockingBadges(page);
  });

  test('should navigate to forgot password form', async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    
    // Click forgot password link
    await page.getByText(/forgot password/i).click();
    
    // Should show forgot password form
    await expect(page.getByTestId('forgot-email')).toBeVisible();
    await expect(page.getByTestId('forgot-btn')).toBeVisible();
    await expect(page.getByRole('heading', { name: /forgot password/i })).toBeVisible();
  });

  test('should submit forgot password request', async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    
    // Navigate to forgot password
    await page.getByText(/forgot password/i).click();
    await expect(page.getByTestId('forgot-email')).toBeVisible();
    
    // Fill email and submit
    await page.getByTestId('forgot-email').fill('test@example.com');
    await page.getByTestId('forgot-btn').click();
    
    // Should show success toast and return to login
    await expect(page.locator('[data-sonner-toast]').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('login-email')).toBeVisible({ timeout: 10000 });
  });

  test('should navigate back to login from forgot password', async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    
    // Navigate to forgot password
    await page.getByText(/forgot password/i).click();
    await expect(page.getByTestId('forgot-email')).toBeVisible();
    
    // Click back to login
    await page.getByRole('button', { name: /back to login/i }).click();
    
    // Should show login form
    await expect(page.getByTestId('login-email')).toBeVisible();
  });
});

test.describe('Reset Password Flow', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await removeBlockingBadges(page);
  });

  test('should display reset password form when token present', async ({ page }) => {
    // Navigate to reset password page with a token
    await page.goto('/reset-password?token=test_token_123', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    
    // Should show reset password form
    await expect(page.getByTestId('reset-password')).toBeVisible();
    await expect(page.getByTestId('reset-confirm')).toBeVisible();
    await expect(page.getByTestId('reset-btn')).toBeVisible();
    await expect(page.getByRole('heading', { name: /reset password/i })).toBeVisible();
  });

  test('should show error for password mismatch in reset form', async ({ page }) => {
    await page.goto('/reset-password?token=test_token_123', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    
    // Fill mismatched passwords
    await page.getByTestId('reset-password').fill('newpassword123');
    await page.getByTestId('reset-confirm').fill('differentpassword');
    await page.getByTestId('reset-btn').click();
    
    // Should show error toast
    await expect(page.locator('[data-sonner-toast]').first()).toBeVisible({ timeout: 5000 });
    // Should stay on reset page
    await expect(page.getByTestId('reset-password')).toBeVisible();
  });

  test('should navigate back to login from reset password', async ({ page }) => {
    await page.goto('/reset-password?token=test_token_123', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    
    // Click back to login
    await page.getByRole('button', { name: /back to login/i }).click();
    
    // Should show login form
    await expect(page.getByTestId('login-email')).toBeVisible();
  });
});
