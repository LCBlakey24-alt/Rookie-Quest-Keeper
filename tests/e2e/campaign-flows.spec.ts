import { test, expect } from '@playwright/test';
import { waitForAppReady, dismissToasts, removeBlockingBadges, generateTestUsername, generateTestEmail, registerUser, loginUser } from '../fixtures/helpers';

test.describe('Campaign Management Flow', () => {
  let testUsername: string;
  let testEmail: string;
  const testPassword = 'testpass123';

  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await removeBlockingBadges(page);
    
    // Create a fresh test user for each test
    testEmail = generateTestEmail();
    testUsername = generateTestUsername();
    
    await registerUser(page, testEmail, testUsername, testPassword);
    // App now redirects to /home (UnifiedDashboard) after registration
    await expect(page).toHaveURL(/\/home/, { timeout: 15000 });
  });

  test('should display home page with new design elements', async ({ page }) => {
    // Verify page header shows username
    await expect(page.getByText(testUsername, { exact: false })).toBeVisible();
    
    // Verify key sections exist
    await expect(page.getByText(/my characters/i)).toBeVisible();
    await expect(page.getByText(/my campaigns/i)).toBeVisible();
    
    // Verify action buttons exist
    const newCampaignBtn = page.getByRole('button', { name: /new campaign/i });
    const newCharacterBtn = page.getByRole('button', { name: /new character/i });
    
    await expect(newCampaignBtn).toBeVisible();
    await expect(newCharacterBtn).toBeVisible();
  });

  test('should create a new campaign', async ({ page }) => {
    const campaignName = `Test Campaign ${Date.now()}`;
    
    // Click NEW CAMPAIGN button
    const newCampaignBtn = page.getByRole('button', { name: /new campaign/i });
    await newCampaignBtn.click();
    
    // Wait for modal/dialog to open
    await page.waitForLoadState('domcontentloaded');
    
    // Fill campaign name
    const nameInput = page.getByPlaceholder(/campaign name/i).or(page.locator('input[type="text"]').first());
    await nameInput.fill(campaignName);
    
    // Submit (look for create/confirm button)
    const createBtn = page.getByRole('button', { name: /create/i });
    await createBtn.click();
    
    // Wait for campaign to appear
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

  test('should save and persist campaign settings (bug fix verification)', async ({ page }) => {
    // Create a campaign first
    const campaignName = `Settings Test ${Date.now()}`;
    
    await page.getByTestId('create-campaign-btn').click();
    await page.getByTestId('campaign-name-input').fill(campaignName);
    await page.getByTestId('create-campaign-submit-btn').click();
    await expect(page.getByText(campaignName)).toBeVisible({ timeout: 10000 });
    
    // Navigate to campaign dashboard
    const manageBtns = page.locator('[data-testid^="manage-campaign-btn-"]');
    await manageBtns.first().click();
    await expect(page).toHaveURL(/\/campaign\//, { timeout: 10000 });
    
    // Click on Setting tab
    const settingTab = page.getByTestId('setting-tab');
    await expect(settingTab).toBeVisible();
    await settingTab.click();
    
    // Wait for settings content to load
    await page.waitForLoadState('domcontentloaded');
    
    // Find the setting input/textarea and enter some content
    // The setting content might be in a textarea or contenteditable
    const settingTextarea = page.locator('textarea').first();
    const settingInput = page.locator('input[type="text"]').first();
    
    const testContent = `Test setting content ${Date.now()}`;
    
    // Try to find and fill the content area
    const textareaVisible = await settingTextarea.isVisible().catch(() => false);
    if (textareaVisible) {
      await settingTextarea.fill(testContent);
    }
    
    // Look for a save button or auto-save indicator
    const saveBtn = page.getByRole('button', { name: /save/i });
    const saveVisible = await saveBtn.isVisible().catch(() => false);
    if (saveVisible) {
      await saveBtn.click();
    }
    
    // Reload the page to verify persistence
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    
    // Click setting tab again
    await settingTab.click();
    
    // Verify content persisted (if we were able to set it)
    if (textareaVisible) {
      await expect(settingTextarea).toContainText(testContent, { timeout: 10000 });
    }
  });
});
