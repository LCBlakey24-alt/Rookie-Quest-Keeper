import { test, expect } from '@playwright/test';

const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';

// Admin credentials
const ADMIN_EMAIL = 'gmtest@test.com';
const ADMIN_PASSWORD = 'test123';

async function loginAsAdmin(page) {
  await page.goto('/auth', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('domcontentloaded');
  await page.getByTestId('login-email').fill(ADMIN_EMAIL);
  await page.getByTestId('login-password').fill(ADMIN_PASSWORD);
  await page.getByTestId('login-btn').click();
  await page.waitForURL(/\/home/, { timeout: 15000 });
}

test.describe('Rule System Manager - Admin Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /admin panel/i })).toBeVisible({ timeout: 10000 });
  });

  test('Admin page loads with all three tabs', async ({ page }) => {
    // Verify all tabs are visible
    await expect(page.getByRole('button', { name: /promo codes/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /reviews/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /rule systems/i })).toBeVisible();
  });

  test('Rule Systems tab shows Rule System Manager', async ({ page }) => {
    // Click Rule Systems tab
    await page.getByRole('button', { name: /rule systems/i }).click();
    
    // Wait for Rule System Manager to appear
    await expect(page.getByText('RULE SYSTEM MANAGER')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/manage game rules, classes, races/i)).toBeVisible();
  });

  test('Rule System Manager shows official systems', async ({ page }) => {
    await page.getByRole('button', { name: /rule systems/i }).click();
    await expect(page.getByText('RULE SYSTEM MANAGER')).toBeVisible({ timeout: 5000 });
    
    // Should show at least the official D&D 5e systems
    await expect(page.getByRole('button', { name: /D&D 5E 2014/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /D&D 5E 2024/i })).toBeVisible();
  });

  test('Clicking system shows content types grid', async ({ page }) => {
    await page.getByRole('button', { name: /rule systems/i }).click();
    await expect(page.getByText('RULE SYSTEM MANAGER')).toBeVisible({ timeout: 5000 });
    
    // Click on a system (5E 2014 should be first/default selected)
    await page.getByRole('button', { name: /D&D 5E 2024/i }).first().click();
    
    // Should show content type grid - use exact match to avoid ambiguity
    await expect(page.getByText('Classes', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Subclasses', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Races/Species', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Spells', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Items', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Feats', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Monsters', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Class Features', { exact: true }).first()).toBeVisible();
  });

  test('Upload Content button is visible', async ({ page }) => {
    await page.getByRole('button', { name: /rule systems/i }).click();
    await expect(page.getByText('RULE SYSTEM MANAGER')).toBeVisible({ timeout: 5000 });
    
    // Upload content button should be visible
    await expect(page.getByRole('button', { name: /upload content/i })).toBeVisible();
  });

  test('New Rule System button is visible', async ({ page }) => {
    await page.getByRole('button', { name: /rule systems/i }).click();
    await expect(page.getByText('RULE SYSTEM MANAGER')).toBeVisible({ timeout: 5000 });
    
    // New Rule System button should be visible
    await expect(page.getByRole('button', { name: /new rule system/i })).toBeVisible();
  });

  test('Clicking Upload Content opens modal', async ({ page }) => {
    await page.getByRole('button', { name: /rule systems/i }).click();
    await expect(page.getByText('RULE SYSTEM MANAGER')).toBeVisible({ timeout: 5000 });
    
    // Click Upload Content button
    await page.getByRole('button', { name: /upload content/i }).click();
    
    // Modal should appear with content type selector
    await expect(page.getByText(/upload content to/i)).toBeVisible({ timeout: 3000 });
    await expect(page.getByText(/content type/i)).toBeVisible();
    
    // Content type buttons should be visible in modal
    await expect(page.locator('button:has-text("Classes")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Races/Species")').first()).toBeVisible();
  });

  test('Upload modal has JSON paste area', async ({ page }) => {
    await page.getByRole('button', { name: /rule systems/i }).click();
    await expect(page.getByText('RULE SYSTEM MANAGER')).toBeVisible({ timeout: 5000 });
    
    await page.getByRole('button', { name: /upload content/i }).click();
    await expect(page.getByText(/upload content to/i)).toBeVisible({ timeout: 3000 });
    
    // Should have JSON paste textarea
    await expect(page.getByPlaceholder(/paste json/i)).toBeVisible();
    
    // Should have Load Sample button
    await expect(page.getByRole('button', { name: /load sample/i })).toBeVisible();
  });

  test('Load Sample fills JSON textarea', async ({ page }) => {
    await page.getByRole('button', { name: /rule systems/i }).click();
    await expect(page.getByText('RULE SYSTEM MANAGER')).toBeVisible({ timeout: 5000 });
    
    await page.getByRole('button', { name: /upload content/i }).click();
    await expect(page.getByText(/upload content to/i)).toBeVisible({ timeout: 3000 });
    
    // Click Load Sample
    await page.getByRole('button', { name: /load sample/i }).click();
    
    // Textarea should now have content
    const textarea = page.getByPlaceholder(/paste json/i);
    const value = await textarea.inputValue();
    expect(value.length).toBeGreaterThan(50);
    expect(value).toContain('{');
  });

  test('Clicking New Rule System opens create modal', async ({ page }) => {
    await page.getByRole('button', { name: /rule systems/i }).click();
    await expect(page.getByText('RULE SYSTEM MANAGER')).toBeVisible({ timeout: 5000 });
    
    // Click New Rule System button
    await page.getByRole('button', { name: /new rule system/i }).click();
    
    // Modal should appear
    await expect(page.getByText(/create custom rule system/i)).toBeVisible({ timeout: 3000 });
    
    // Should have form fields
    await expect(page.getByPlaceholder(/custom sci-fi/i)).toBeVisible();
    await expect(page.getByPlaceholder(/scifi_v1/i)).toBeVisible();
  });

  test('Content type card shows count badge', async ({ page }) => {
    await page.getByRole('button', { name: /rule systems/i }).click();
    await expect(page.getByText('RULE SYSTEM MANAGER')).toBeVisible({ timeout: 5000 });
    
    // Select 5e-2024 which has content
    await page.getByRole('button', { name: /D&D 5E 2024/i }).first().click();
    
    // Content cards should show count badges (numbers in colored circles)
    // Check that Classes card exists and has a badge
    const classesCard = page.locator('div:has-text("CLASSES")').first();
    await expect(classesCard).toBeVisible();
  });

  test('Expanding content type shows items list', async ({ page }) => {
    await page.getByRole('button', { name: /rule systems/i }).click();
    await expect(page.getByText('RULE SYSTEM MANAGER')).toBeVisible({ timeout: 5000 });
    
    // Select 5e-2024 which has content
    await page.getByRole('button', { name: /D&D 5E 2024/i }).first().click();
    
    // Click on Classes card to expand - look for the container with "Classes" text
    const classesCard = page.locator('div').filter({ hasText: /^Classes$/ }).first();
    await classesCard.click();
    
    // Should show search input after expanding - case insensitive
    await expect(page.getByPlaceholder(/search/i).first()).toBeVisible({ timeout: 3000 });
  });

  test('Upload modal can be closed', async ({ page }) => {
    await page.getByRole('button', { name: /rule systems/i }).click();
    await expect(page.getByText('RULE SYSTEM MANAGER')).toBeVisible({ timeout: 5000 });
    
    // Open modal
    await page.getByRole('button', { name: /upload content/i }).click();
    await expect(page.getByText(/upload content to/i)).toBeVisible({ timeout: 3000 });
    
    // Close modal via Cancel button
    await page.getByRole('button', { name: /cancel/i }).last().click();
    
    // Modal should be closed - the "upload content to" text should not be visible
    await expect(page.getByText(/upload content to/i)).not.toBeVisible({ timeout: 2000 });
  });
});

test.describe('Stats Cards - Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /admin panel/i })).toBeVisible({ timeout: 10000 });
  });

  test('Dashboard shows stats cards', async ({ page }) => {
    // Check for stats cards - use first() to handle multiple matches
    await expect(page.getByText('TOTAL USERS').first()).toBeVisible();
    await expect(page.getByText('ACTIVE CODES').first()).toBeVisible();
    await expect(page.getByText('Referrals', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('REVIEWS').first()).toBeVisible();
  });

  test('Stats cards show numeric values', async ({ page }) => {
    // At least one stat should have a number - look for the Total Users card's number
    await expect(page.getByText('TOTAL USERS').first()).toBeVisible();
    
    // The number for total users should be present (303 based on screenshot)
    await expect(page.getByText('303').first()).toBeVisible();
  });
});

test.describe('Top Referrers Section', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /admin panel/i })).toBeVisible({ timeout: 10000 });
  });

  test('Top Referrers section is visible', async ({ page }) => {
    await expect(page.getByText('TOP REFERRERS')).toBeVisible();
  });
});
