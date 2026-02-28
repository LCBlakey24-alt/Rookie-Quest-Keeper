import { test, expect } from '@playwright/test';
import { waitForAppReady, dismissToasts, hideEmergentBadge, generateTestUsername } from '../fixtures/helpers';

test.describe('Campaign Dashboard Features', () => {
  let testUsername: string;
  const testPassword = 'testpass123';
  let campaignId: string;

  test.beforeAll(async ({ browser }) => {
    // Register a test user and create a campaign
    testUsername = generateTestUsername();
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await page.goto('https://loot-tracker-8.preview.emergentagent.com/auth', { waitUntil: 'domcontentloaded' });
    await page.getByTestId('switch-to-register-btn').click();
    await page.getByTestId('register-username-input').fill(testUsername);
    await page.getByTestId('register-password-input').fill(testPassword);
    await page.getByTestId('register-submit-btn').click();
    await expect(page).toHaveURL(/\/campaigns/, { timeout: 10000 });
    
    // Create a test campaign
    await page.getByTestId('create-campaign-btn').click();
    await page.getByTestId('campaign-name-input').fill(`Dashboard Test ${Date.now()}`);
    await page.getByTestId('create-campaign-submit-btn').click();
    
    // Navigate to the campaign
    const manageBtns = page.locator('[data-testid^="manage-campaign-btn-"]');
    await expect(manageBtns.first()).toBeVisible({ timeout: 10000 });
    await manageBtns.first().click();
    await expect(page).toHaveURL(/\/campaign\//, { timeout: 10000 });
    
    // Extract campaign ID from URL
    const url = page.url();
    campaignId = url.split('/campaign/')[1];
    
    await context.close();
  });

  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await hideEmergentBadge(page);
    
    // Login and navigate to campaign
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await page.getByTestId('login-username-input').fill(testUsername);
    await page.getByTestId('login-password-input').fill(testPassword);
    await page.getByTestId('login-submit-btn').click();
    await expect(page).toHaveURL(/\/campaigns/, { timeout: 10000 });
    
    // Go to campaign dashboard
    const manageBtns = page.locator('[data-testid^="manage-campaign-btn-"]');
    await manageBtns.first().click();
    await expect(page).toHaveURL(/\/campaign\//, { timeout: 10000 });
  });

  test('Campaign Setting tab displays correctly', async ({ page }) => {
    // Setting tab should be selected by default
    await expect(page.getByTestId('setting-tab')).toBeVisible();
    
    // Verify Campaign Setting elements
    await expect(page.getByTestId('save-setting-btn')).toBeVisible();
    await expect(page.getByTestId('setting-content-input')).toBeVisible();
    await expect(page.getByTestId('ai-setting-prompt')).toBeVisible();
    await expect(page.getByTestId('generate-setting-btn')).toBeVisible();
    
    // Verify AI Assistant panel text
    await expect(page.getByText('AI Assistant')).toBeVisible();
  });

  test('should save campaign setting content', async ({ page }) => {
    const testContent = `Test Campaign Setting ${Date.now()}`;
    
    // Wait for setting tab to load
    await expect(page.getByTestId('setting-content-input')).toBeVisible({ timeout: 10000 });
    
    // Enter content
    await page.getByTestId('setting-content-input').fill(testContent);
    
    // Save
    await page.getByTestId('save-setting-btn').click();
    
    // Wait for save toast or response
    await page.waitForTimeout(1000);  // Brief wait for save to complete
    
    // Reload and verify content persists
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('setting-content-input')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('setting-content-input')).toHaveValue(testContent);
  });

  test('should navigate through all tabs', async ({ page }) => {
    // Test tab navigation
    const tabs = [
      { testid: 'gods-tab', label: 'Gods' },
      { testid: 'npcs-tab', label: 'NPCs' },
      { testid: 'locations-tab', label: 'Locations' },
      { testid: 'players-tab', label: 'Players' },
      { testid: 'combat-creator-tab', label: 'Combat Creator' },
      { testid: 'calendar-tab', label: 'Calendar' },
      { testid: 'ingame-notes-tab', label: 'In-Game Notes' },
      { testid: 'setting-tab', label: 'Campaign Setting' }
    ];
    
    for (const tab of tabs) {
      await page.getByTestId(tab.testid).click();
      // Each tab should be clickable without errors
      await expect(page.getByTestId(tab.testid)).toBeVisible();
    }
  });

  test('NPCs tab displays add NPC functionality', async ({ page }) => {
    await page.getByTestId('npcs-tab').click();
    
    // Verify NPC tab elements
    await expect(page.getByTestId('add-npc-btn')).toBeVisible();
    await expect(page.getByTestId('generate-npc-btn')).toBeVisible();
  });

  test('Calendar tab displays calendar controls', async ({ page }) => {
    await page.getByTestId('calendar-tab').click();
    
    // Verify Calendar tab elements
    await expect(page.getByTestId('calendar-type-select')).toBeVisible();
    await expect(page.getByTestId('customize-calendar-btn')).toBeVisible();
    await expect(page.getByTestId('advance-time-btn')).toBeVisible();
    await expect(page.getByTestId('add-event-btn')).toBeVisible();
  });

  test('Players tab displays create character button', async ({ page }) => {
    await page.getByTestId('players-tab').click();
    
    // Verify Players tab elements
    await expect(page.getByTestId('add-player-btn')).toBeVisible();
  });

  test('Back button navigates to campaigns list', async ({ page }) => {
    await page.getByTestId('back-to-campaigns-btn').click();
    
    await expect(page).toHaveURL(/\/campaigns/, { timeout: 10000 });
    await expect(page.getByText('Your Campaigns')).toBeVisible();
  });
});
