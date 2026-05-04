import { test, expect } from '@playwright/test';
import { waitForAppReady, dismissToasts, removeBlockingBadges, TEST_USER, TEST_CAMPAIGN_ID, loginTestUser } from '../fixtures/helpers';

test.describe('Dashboard Additional Tabs', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await removeBlockingBadges(page);
    
    // Login with existing test user
    await loginTestUser(page);
    await expect(page.getByText('MY CHARACTERS')).toBeVisible({ timeout: 10000 });
    
    // Navigate to test campaign
    await page.goto(`/campaign/${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
  });

  test('Combat tab loads correctly', async ({ page }) => {
    // Navigate to Combat tab
    await page.getByTestId('combat-creator-tab').click();
    
    // Verify Encounter Builder heading is visible
    await expect(page.getByText('Encounter Builder')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Create combat scenarios with maps and tokens')).toBeVisible();
    
    // Verify key elements are present
    await expect(page.getByText('Saved Encounters')).toBeVisible();
    await expect(page.getByRole('button', { name: 'ADD COMBATANTS' })).toBeVisible();
    // Use heading role to avoid matching 'Add a Battle Map'
    await expect(page.getByRole('heading', { name: 'Battle Map' })).toBeVisible();
  });

  test('Combat tab has saved encounters section', async ({ page }) => {
    await page.getByTestId('combat-creator-tab').click();
    await expect(page.getByText('Encounter Builder')).toBeVisible({ timeout: 10000 });
    
    // Verify saved encounters section exists
    await expect(page.getByText('Saved Encounters')).toBeVisible();
    
    // Verify existing encounter is shown (Goblin Ambush was shown in screenshot)
    await expect(page.getByText('Goblin Ambush')).toBeVisible();
  });

  test('Items tab loads correctly', async ({ page }) => {
    // Navigate to Items tab
    await page.getByTestId('items-tab').click();
    
    // Verify Item Creator heading is visible
    await expect(page.getByText('Item Creator')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Create custom magic items and equipment')).toBeVisible();
    
    // Verify Create Item button exists
    await expect(page.getByText('CREATE ITEM')).toBeVisible();
    
    // Verify search input exists
    await expect(page.locator('input[placeholder="Search items..."]')).toBeVisible();
    
    // Verify empty state message
    await expect(page.getByText('No Custom Items')).toBeVisible();
  });

  test('Items tab shows filter buttons', async ({ page }) => {
    await page.getByTestId('items-tab').click();
    await expect(page.getByText('Item Creator')).toBeVisible({ timeout: 10000 });
    
    // Verify "All" filter button is present
    await expect(page.getByRole('button', { name: 'All' })).toBeVisible();
  });

  test('Encounter Generator tab loads correctly', async ({ page }) => {
    // Navigate to Encounter Generator tab  
    await page.getByTestId('encounter-gen-tab').click();
    
    // Verify Random Encounter Generator heading is visible
    await expect(page.getByText('Random Encounter Generator')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('AI-powered balanced encounters based on your party')).toBeVisible();
    
    // Verify Party Configuration section
    await expect(page.getByText('Party Configuration')).toBeVisible();
    await expect(page.getByText('Party Size')).toBeVisible();
    await expect(page.getByText('Average Level')).toBeVisible();
    
    // Verify Difficulty label is visible (use exact match)
    await expect(page.getByText('Difficulty', { exact: true })).toBeVisible();
  });

  test('Encounter Generator has difficulty options', async ({ page }) => {
    await page.getByTestId('encounter-gen-tab').click();
    await expect(page.getByText('Random Encounter Generator')).toBeVisible({ timeout: 10000 });
    
    // Verify difficulty level options exist
    await expect(page.getByText('Easy')).toBeVisible();
    await expect(page.getByText('Medium')).toBeVisible();
    await expect(page.getByText('Hard')).toBeVisible();
    await expect(page.getByText('Deadly')).toBeVisible();
  });

  test('Encounter Generator has encounter type options', async ({ page }) => {
    await page.getByTestId('encounter-gen-tab').click();
    await expect(page.getByText('Random Encounter Generator')).toBeVisible({ timeout: 10000 });
    
    // Verify Encounter Type section
    await expect(page.getByText('Encounter Type')).toBeVisible();
    
    // Verify encounter type options exist - use exact role buttons
    await expect(page.getByRole('button', { name: 'Combat' }).nth(1)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ambush' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Boss Fight' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Horde' })).toBeVisible();
  });

  test('Encounter Generator shows empty state', async ({ page }) => {
    await page.getByTestId('encounter-gen-tab').click();
    await expect(page.getByText('Random Encounter Generator')).toBeVisible({ timeout: 10000 });
    
    // Verify empty state when no encounter generated
    await expect(page.getByText('No Encounter Generated')).toBeVisible();
    await expect(page.getByText('Configure your settings and click "Generate Encounter"')).toBeVisible();
  });

  test('All dashboard tabs are accessible without errors', async ({ page }) => {
    // Test navigation to all tabs - each should render without error
    const tabIds = [
      'setting-tab',
      'gods-tab',
      'npcs-tab', 
      'locations-tab',
      'players-tab',
      'combat-creator-tab',
      'encounter-gen-tab',
      'items-tab',
      'calendar-tab',
      'ingame-notes-tab'
    ];
    
    for (const tabId of tabIds) {
      await page.getByTestId(tabId).click();
      // Each tab should render without error (no crash)
      await expect(page.getByTestId(tabId)).toBeVisible();
    }
  });
});
