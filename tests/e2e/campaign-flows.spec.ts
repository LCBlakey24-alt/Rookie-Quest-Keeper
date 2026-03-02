import { test, expect } from '@playwright/test';
import { waitForAppReady, dismissToasts, hideEmergentBadge, generateTestUsername, generateTestEmail, registerUser, loginUser } from '../fixtures/helpers';

test.describe('Campaign Management Flow', () => {
  let testUsername: string;
  let testEmail: string;
  const testPassword = 'testpass123';

  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await hideEmergentBadge(page);
    
    // Create a fresh test user for each test
    testEmail = generateTestEmail();
    testUsername = generateTestUsername();
    
    await registerUser(page, testEmail, testUsername, testPassword);
    await expect(page).toHaveURL(/\/campaigns/, { timeout: 15000 });
  });

  test('should display campaigns page with new design elements', async ({ page }) => {
    // Verify page header
    await expect(page.getByText('Your Campaigns')).toBeVisible();
    await expect(page.getByText(testUsername, { exact: false })).toBeVisible();
    
    // Verify buttons exist
    await expect(page.getByTestId('create-campaign-btn')).toBeVisible();
    await expect(page.getByTestId('logout-btn')).toBeVisible();
  });

  test('should create a new campaign', async ({ page }) => {
    const campaignName = `Test Campaign ${Date.now()}`;
    
    // Open create campaign dialog
    await page.getByTestId('create-campaign-btn').click();
    
    // Fill campaign details
    await expect(page.getByTestId('campaign-name-input')).toBeVisible();
    await page.getByTestId('campaign-name-input').fill(campaignName);
    await page.getByTestId('campaign-description-input').fill('A test campaign description');
    
    // Select TTRPG system
    await expect(page.getByTestId('campaign-system-select')).toBeVisible();
    
    // Submit
    await page.getByTestId('create-campaign-submit-btn').click();
    
    // Wait for campaign card to appear
    await expect(page.getByText(campaignName)).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to campaign dashboard', async ({ page }) => {
    // Create a campaign first
    const campaignName = `Dashboard Test ${Date.now()}`;
    
    await page.getByTestId('create-campaign-btn').click();
    await page.getByTestId('campaign-name-input').fill(campaignName);
    await page.getByTestId('create-campaign-submit-btn').click();
    await expect(page.getByText(campaignName)).toBeVisible({ timeout: 10000 });
    
    // Click manage on the campaign
    const manageBtns = page.locator('[data-testid^="manage-campaign-btn-"]');
    await manageBtns.first().click();
    
    // Should navigate to campaign dashboard
    await expect(page).toHaveURL(/\/campaign\//, { timeout: 10000 });
    
    // Verify dashboard elements
    await expect(page.getByTestId('back-to-campaigns-btn')).toBeVisible();
    await expect(page.getByTestId('open-dm-screen-btn')).toBeVisible();
  });

  test('should display all 8 dashboard tabs', async ({ page }) => {
    // Create campaign and navigate
    const campaignName = `Tab Test ${Date.now()}`;
    
    await page.getByTestId('create-campaign-btn').click();
    await page.getByTestId('campaign-name-input').fill(campaignName);
    await page.getByTestId('create-campaign-submit-btn').click();
    await expect(page.getByText(campaignName)).toBeVisible({ timeout: 10000 });
    
    const manageBtns = page.locator('[data-testid^="manage-campaign-btn-"]');
    await manageBtns.first().click();
    await expect(page).toHaveURL(/\/campaign\//, { timeout: 10000 });
    
    // Verify all 8 tabs exist
    await expect(page.getByTestId('setting-tab')).toBeVisible();
    await expect(page.getByTestId('gods-tab')).toBeVisible();
    await expect(page.getByTestId('npcs-tab')).toBeVisible();
    await expect(page.getByTestId('locations-tab')).toBeVisible();
    await expect(page.getByTestId('players-tab')).toBeVisible();
    await expect(page.getByTestId('combat-creator-tab')).toBeVisible();
    await expect(page.getByTestId('calendar-tab')).toBeVisible();
    await expect(page.getByTestId('ingame-notes-tab')).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    await page.getByTestId('logout-btn').click();
    
    // Should redirect to auth page
    await expect(page).toHaveURL(/\/auth/, { timeout: 10000 });
    await expect(page.getByTestId('login-email')).toBeVisible();
  });
});
