import { test, expect } from '@playwright/test';
import { waitForAppReady, dismissToasts, removeBlockingBadges, loginTestUser, TEST_USER, TEST_CAMPAIGN_ID } from '../fixtures/helpers';

test.describe('Campaign Dashboard Features', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await removeBlockingBadges(page);
    
    // Login with existing test user
    await loginTestUser(page);
    await expect(page.getByText('MY CHARACTERS')).toBeVisible({ timeout: 10000 });
    
    // Navigate to existing test campaign dashboard
    await page.goto(`/campaign/${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/campaign\//, { timeout: 10000 });
  });

  test('Campaign Setting tab displays correctly', async ({ page }) => {
    // Setting tab should be selected by default
    await expect(page.getByTestId('setting-tab')).toBeVisible({ timeout: 10000 });
    
    // Verify Campaign Setting elements
    await expect(page.getByTestId('save-setting-btn')).toBeVisible();
    await expect(page.getByTestId('setting-content-input')).toBeVisible();
    await expect(page.getByTestId('ai-setting-prompt')).toBeVisible();
    await expect(page.getByTestId('generate-setting-btn')).toBeVisible();
    
    // Verify ROOK panel text - AI assistant panel
    await expect(page.getByRole('heading', { name: 'ROOK' }).first()).toBeVisible();
  });

  test('should save campaign setting content', async ({ page }) => {
    const testContent = `Test Campaign Setting ${Date.now()}`;
    
    // Wait for setting tab to load
    await expect(page.getByTestId('setting-content-input')).toBeVisible({ timeout: 10000 });
    
    // Enter content
    await page.getByTestId('setting-content-input').fill(testContent);
    
    // Save
    await page.getByTestId('save-setting-btn').click();
    
    // Wait for save to complete
    await expect(page.locator('[data-sonner-toast]').first()).toBeVisible({ timeout: 5000 });
    
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
    
    // Wait for NPCs tab content to load
    await expect(page.getByRole('heading', { name: /NPCs/i })).toBeVisible({ timeout: 10000 });
    
    // Wait for skeleton loading to finish
    await page.waitForLoadState('networkidle');
    
    // Both "Create Your First NPC" and "SUMMON NPC" buttons are visible on empty state
    await expect(page.getByRole('button', { name: /create your first npc/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('summon-npc-btn')).toBeVisible();
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

  test('Back button navigates to unified dashboard', async ({ page }) => {
    await page.getByTestId('back-to-campaigns-btn').click();
    
    // With rebrand: Back button now goes to /home (UnifiedDashboard) instead of /campaigns
    await expect(page).toHaveURL(/\/home/, { timeout: 10000 });
    await expect(page.getByText('MY CHARACTERS')).toBeVisible();
    await expect(page.getByText('MY CAMPAIGNS')).toBeVisible();
  });
});
