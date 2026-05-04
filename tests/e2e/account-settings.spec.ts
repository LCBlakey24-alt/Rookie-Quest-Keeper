import { test, expect } from '@playwright/test';
import { waitForAppReady, dismissToasts, removeBlockingBadges, generateTestUsername, generateTestEmail, loginUser, registerUser, TEST_USER } from '../fixtures/helpers';

test.describe('Account Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await removeBlockingBadges(page);
  });

  test('should display account settings page with all sections', async ({ page }) => {
    // Login first
    await loginUser(page, TEST_USER.email, TEST_USER.password);
    await expect(page).toHaveURL(/\/campaigns/, { timeout: 15000 });
    
    // Navigate to account settings
    await page.goto('/account', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    
    // Verify page loaded with correct title
    await expect(page.getByRole('heading', { name: /account settings/i })).toBeVisible();
    
    // Verify Profile Information section
    await expect(page.getByRole('heading', { name: /profile information/i })).toBeVisible();
    await expect(page.getByTestId('profile-username')).toBeVisible();
    await expect(page.getByTestId('profile-email')).toBeVisible();
    await expect(page.getByTestId('save-profile-btn')).toBeVisible();
    
    // Verify Change Password section
    await expect(page.getByRole('heading', { name: /change password/i })).toBeVisible();
    await expect(page.getByTestId('current-password')).toBeVisible();
    await expect(page.getByTestId('new-password')).toBeVisible();
    await expect(page.getByTestId('confirm-password')).toBeVisible();
    await expect(page.getByTestId('change-password-btn')).toBeVisible();
    
    // Verify Danger Zone section
    await expect(page.getByRole('heading', { name: /danger zone/i })).toBeVisible();
    await expect(page.getByTestId('delete-account-btn')).toBeVisible();
    
    // Verify back button
    await expect(page.getByTestId('back-btn')).toBeVisible();
  });

  test('should navigate back to campaigns from account settings', async ({ page }) => {
    // Login first
    await loginUser(page, TEST_USER.email, TEST_USER.password);
    await expect(page).toHaveURL(/\/campaigns/, { timeout: 15000 });
    
    // Navigate to account settings
    await page.goto('/account', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    
    // Click back button
    await page.getByTestId('back-btn').click();
    
    // Should navigate to campaigns
    await expect(page).toHaveURL(/\/campaigns/, { timeout: 10000 });
  });

  test('should pre-populate profile fields with current data', async ({ page }) => {
    // Login first
    await loginUser(page, TEST_USER.email, TEST_USER.password);
    await expect(page).toHaveURL(/\/campaigns/, { timeout: 15000 });
    
    // Navigate to account settings
    await page.goto('/account', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    
    // Verify fields are pre-populated
    const usernameInput = page.getByTestId('profile-username');
    const emailInput = page.getByTestId('profile-email');
    
    // Admin user should have their email pre-filled
    await expect(emailInput).toHaveValue(TEST_USER.email);
  });

  test('should show toast when no profile changes to save', async ({ page }) => {
    // Login first
    await loginUser(page, TEST_USER.email, TEST_USER.password);
    await expect(page).toHaveURL(/\/campaigns/, { timeout: 15000 });
    
    // Navigate to account settings
    await page.goto('/account', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    
    // Click save without making changes
    await page.getByTestId('save-profile-btn').click();
    
    // Should show info toast
    await expect(page.locator('[data-sonner-toast]').first()).toBeVisible({ timeout: 5000 });
  });

  test('should show password match indicator', async ({ page }) => {
    // Login first
    await loginUser(page, TEST_USER.email, TEST_USER.password);
    await expect(page).toHaveURL(/\/campaigns/, { timeout: 15000 });
    
    // Navigate to account settings
    await page.goto('/account', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    
    // Fill in new password and confirm with mismatch
    await page.getByTestId('new-password').fill('newpassword123');
    await page.getByTestId('confirm-password').fill('different');
    
    // Should show "Passwords do not match" indicator
    await expect(page.getByText(/passwords do not match/i)).toBeVisible();
    
    // Fill matching passwords
    await page.getByTestId('confirm-password').fill('newpassword123');
    
    // Should show "Passwords match" indicator
    await expect(page.getByText(/passwords match/i)).toBeVisible();
  });

  test('should disable change password button when passwords do not match', async ({ page }) => {
    // Login first
    await loginUser(page, TEST_USER.email, TEST_USER.password);
    await expect(page).toHaveURL(/\/campaigns/, { timeout: 15000 });
    
    // Navigate to account settings
    await page.goto('/account', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    
    // Fill in passwords with mismatch
    await page.getByTestId('current-password').fill('currentpass');
    await page.getByTestId('new-password').fill('newpassword123');
    await page.getByTestId('confirm-password').fill('different');
    
    // Change password button should be disabled
    const changePasswordBtn = page.getByTestId('change-password-btn');
    await expect(changePasswordBtn).toBeDisabled();
    
    // Fix the confirm password
    await page.getByTestId('confirm-password').fill('newpassword123');
    
    // Button should now be enabled
    await expect(changePasswordBtn).toBeEnabled();
  });

  test('should show delete confirmation dialog', async ({ page }) => {
    // Login first
    await loginUser(page, TEST_USER.email, TEST_USER.password);
    await expect(page).toHaveURL(/\/campaigns/, { timeout: 15000 });
    
    // Navigate to account settings
    await page.goto('/account', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    
    // Click delete account button
    await page.getByTestId('delete-account-btn').click();
    
    // Should show confirmation dialog with input
    await expect(page.getByTestId('delete-confirm-input')).toBeVisible();
    await expect(page.getByTestId('confirm-delete-btn')).toBeVisible();
    await expect(page.getByText(/type "delete" to confirm/i)).toBeVisible();
  });

  test('should require DELETE text to confirm deletion', async ({ page }) => {
    // Login first
    await loginUser(page, TEST_USER.email, TEST_USER.password);
    await expect(page).toHaveURL(/\/campaigns/, { timeout: 15000 });
    
    // Navigate to account settings
    await page.goto('/account', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    
    // Click delete account button
    await page.getByTestId('delete-account-btn').click();
    await expect(page.getByTestId('delete-confirm-input')).toBeVisible();
    
    // Confirm delete button should be disabled initially
    await expect(page.getByTestId('confirm-delete-btn')).toBeDisabled();
    
    // Type wrong text
    await page.getByTestId('delete-confirm-input').fill('wrong');
    await expect(page.getByTestId('confirm-delete-btn')).toBeDisabled();
    
    // Type DELETE
    await page.getByTestId('delete-confirm-input').fill('DELETE');
    await expect(page.getByTestId('confirm-delete-btn')).toBeEnabled();
  });

  test('should show subscription information section', async ({ page }) => {
    // Login first
    await loginUser(page, TEST_USER.email, TEST_USER.password);
    await expect(page).toHaveURL(/\/campaigns/, { timeout: 15000 });
    
    // Navigate to account settings
    await page.goto('/account', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    
    // Verify subscription section exists
    await expect(page.getByRole('heading', { name: /subscription/i })).toBeVisible();
    await expect(page.getByText(/current plan/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /manage subscription/i })).toBeVisible();
  });
});

test.describe('Account Settings - Profile Update', () => {
  let testEmail: string;
  let testUsername: string;
  const testPassword = 'TestPass123!';
  
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await removeBlockingBadges(page);
    
    // Create a new test user for each test
    testEmail = generateTestEmail();
    testUsername = generateTestUsername();
    
    await registerUser(page, testEmail, testUsername, testPassword);
    await expect(page).toHaveURL(/\/campaigns/, { timeout: 15000 });
  });

  test('should update username successfully', async ({ page }) => {
    // Navigate to account settings
    await page.goto('/account', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    
    // Update username
    const newUsername = generateTestUsername();
    await page.getByTestId('profile-username').fill(newUsername);
    await page.getByTestId('save-profile-btn').click();
    
    // Should show success toast
    await expect(page.locator('[data-sonner-toast]').first()).toBeVisible({ timeout: 5000 });
    
    // Refresh and verify the new username persisted
    await page.reload();
    await waitForAppReady(page);
    await expect(page.getByTestId('profile-username')).toHaveValue(newUsername);
  });

  test('should update email successfully', async ({ page }) => {
    // Navigate to account settings
    await page.goto('/account', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    
    // Update email
    const newEmail = generateTestEmail();
    await page.getByTestId('profile-email').fill(newEmail);
    await page.getByTestId('save-profile-btn').click();
    
    // Should show success toast
    await expect(page.locator('[data-sonner-toast]').first()).toBeVisible({ timeout: 5000 });
    
    // Refresh and verify the new email persisted
    await page.reload();
    await waitForAppReady(page);
    await expect(page.getByTestId('profile-email')).toHaveValue(newEmail);
  });
});

test.describe('Account Settings - Change Password', () => {
  let testEmail: string;
  let testUsername: string;
  const testPassword = 'TestPass123!';
  
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await removeBlockingBadges(page);
    
    // Create a new test user for each test
    testEmail = generateTestEmail();
    testUsername = generateTestUsername();
    
    await registerUser(page, testEmail, testUsername, testPassword);
    await expect(page).toHaveURL(/\/campaigns/, { timeout: 15000 });
  });

  test('should change password successfully', async ({ page }) => {
    // Navigate to account settings
    await page.goto('/account', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    
    const newPassword = 'NewPassword456!';
    
    // Fill change password form
    await page.getByTestId('current-password').fill(testPassword);
    await page.getByTestId('new-password').fill(newPassword);
    await page.getByTestId('confirm-password').fill(newPassword);
    await page.getByTestId('change-password-btn').click();
    
    // Should show success toast
    await expect(page.locator('[data-sonner-toast]').first()).toBeVisible({ timeout: 5000 });
    
    // Fields should be cleared after success
    await expect(page.getByTestId('current-password')).toHaveValue('');
    await expect(page.getByTestId('new-password')).toHaveValue('');
    await expect(page.getByTestId('confirm-password')).toHaveValue('');
  });

  test('should show error for wrong current password', async ({ page }) => {
    // Navigate to account settings
    await page.goto('/account', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    
    // Fill with wrong current password
    await page.getByTestId('current-password').fill('WrongPassword!');
    await page.getByTestId('new-password').fill('NewPassword456!');
    await page.getByTestId('confirm-password').fill('NewPassword456!');
    await page.getByTestId('change-password-btn').click();
    
    // Should show error toast
    await expect(page.locator('[data-sonner-toast]').first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Account Settings - Delete Account', () => {
  let testEmail: string;
  let testUsername: string;
  const testPassword = 'TestPass123!';
  
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await removeBlockingBadges(page);
    
    // Create a new test user for each test
    testEmail = generateTestEmail();
    testUsername = generateTestUsername();
    
    await registerUser(page, testEmail, testUsername, testPassword);
    await expect(page).toHaveURL(/\/campaigns/, { timeout: 15000 });
  });

  test('should delete account and redirect to auth page', async ({ page }) => {
    // Navigate to account settings
    await page.goto('/account', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    
    // Click delete account button
    await page.getByTestId('delete-account-btn').click();
    await expect(page.getByTestId('delete-confirm-input')).toBeVisible();
    
    // Type DELETE and confirm
    await page.getByTestId('delete-confirm-input').fill('DELETE');
    await page.getByTestId('confirm-delete-btn').click();
    
    // Should redirect to landing page or auth page (user is logged out)
    await expect(page).toHaveURL(/\/(auth)?$/, { timeout: 15000 });
    
    // Navigate to auth and try to login with deleted account - should fail
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await page.getByTestId('login-email').fill(testEmail);
    await page.getByTestId('login-password').fill(testPassword);
    await page.getByTestId('login-btn').click();
    
    // Should show error and stay on auth page
    await expect(page.locator('[data-sonner-toast]').first()).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL(/\/auth/);
  });
});
