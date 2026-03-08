import { test, expect } from '@playwright/test';
import { waitForAppReady, dismissToasts } from '../fixtures/helpers';

const TEST_EMAIL = 'lcblakey24@outlook.com';
const TEST_PASSWORD = 'Trigger24?!';
const TEST_CAMPAIGN_ID = 'eabd4ae0-d1d8-40a5-858e-f7772af1d2ce';
const TEST_CAMPAIGN_NAME = 'Test Forgotten Realms Campaign';

async function loginUser(page: any) {
  await page.goto('/auth', { waitUntil: 'domcontentloaded' });
  await waitForAppReady(page);
  await page.getByTestId('login-email').fill(TEST_EMAIL);
  await page.getByTestId('login-password').fill(TEST_PASSWORD);
  await page.getByTestId('login-btn').click();
  await page.waitForURL(/\/home/, { timeout: 15000 });
}

test.describe('Campaign Content in Character Builder', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
  });

  test('standard character builder shows no custom content', async ({ page }) => {
    await loginUser(page);
    
    // Navigate to standard character builder (no campaignId) - correct route is /characters/new
    await page.goto('/characters/new', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('text=CREATE CHARACTER')).toBeVisible({ timeout: 10000 });
    
    // No campaign name shown
    await expect(page.locator('text=For Campaign:')).not.toBeVisible();
    
    // Click Next to Race & Class selection
    await page.locator('text=Next').first().click();
    await expect(page.locator('text=CHOOSE RACE')).toBeVisible({ timeout: 10000 });
    
    // No Campaign Custom section
    await expect(page.locator('text=CAMPAIGN CUSTOM')).not.toBeVisible();
    
    // Standard races are visible
    await expect(page.locator('button:has-text("HUMAN")').first()).toBeVisible();
  });

  test('loads custom content with campaignId param', async ({ page }) => {
    await loginUser(page);
    
    // Navigate to character builder with campaignId
    await page.goto(`/characters/new?campaignId=${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('text=CREATE CHARACTER')).toBeVisible({ timeout: 10000 });
    
    // Campaign name is shown with star icon
    await expect(page.locator(`text=For Campaign:`)).toBeVisible();
    await expect(page.locator(`text=${TEST_CAMPAIGN_NAME}`)).toBeVisible();
    
    // Custom Content Available badge
    await expect(page.locator('text=CUSTOM CONTENT AVAILABLE')).toBeVisible();
  });

  test('custom races shown with star indicators and correct position', async ({ page }) => {
    await loginUser(page);
    await page.goto(`/characters/new?campaignId=${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('text=CREATE CHARACTER')).toBeVisible({ timeout: 10000 });
    
    // Go to Race & Class step
    await page.locator('text=Next').first().click();
    await expect(page.locator('text=CHOOSE RACE')).toBeVisible({ timeout: 10000 });
    
    // Campaign Custom section visible
    await expect(page.locator('text=CAMPAIGN CUSTOM')).toBeVisible();
    
    // Custom race with star indicator
    await expect(page.locator('text=★ HALF-DRAGON')).toBeVisible();
    
    // Ability bonuses formatted correctly (+2 STR, +1 CHA) - use first() as Dragonborn has same bonus
    await expect(page.locator('text=+2 STR, +1 CHA').first()).toBeVisible();
    
    // Get positions to verify custom content is first
    const customRaceBtn = page.locator('button:has-text("★ HALF-DRAGON")').first();
    const humanRaceBtn = page.locator('button:has-text("HUMAN")').first();
    
    const customBox = await customRaceBtn.boundingBox();
    const humanBox = await humanRaceBtn.boundingBox();
    
    // Custom race should appear before standard races (smaller Y = higher on page)
    expect(customBox).not.toBeNull();
    expect(humanBox).not.toBeNull();
    if (customBox && humanBox) {
      expect(customBox.y).toBeLessThan(humanBox.y);
    }
  });

  test('custom classes shown with star indicators', async ({ page }) => {
    await loginUser(page);
    await page.goto(`/characters/new?campaignId=${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('text=CREATE CHARACTER')).toBeVisible({ timeout: 10000 });
    
    // Go to Race & Class step
    await page.locator('text=Next').first().click();
    await expect(page.locator('text=CHOOSE CLASS')).toBeVisible({ timeout: 10000 });
    
    // Custom class with star indicator
    await expect(page.locator('text=★ DRAGON KNIGHT')).toBeVisible();
    
    // Hit die and primary ability shown
    await expect(page.locator('text=D10 • STRENGTH OR CHARISMA')).toBeVisible();
  });

  test('toast notification shows when custom content is loaded', async ({ page }) => {
    await loginUser(page);
    await page.goto(`/characters/new?campaignId=${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('text=CREATE CHARACTER')).toBeVisible({ timeout: 10000 });
    
    // Go to step 2 to trigger the toast
    await page.locator('text=Next').first().click();
    
    // Toast notification appears - use first() in case multiple toasts
    await expect(page.locator('text=Custom content loaded!').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Campaign-specific races, classes, and more are available').first()).toBeVisible();
  });
});
