import { test, expect } from '@playwright/test';
import { 
  waitForAppReady, 
  removeBlockingBadges, 
  loginTestUser, 
  navigateToGMScreen,
  TEST_CAMPAIGN_ID
} from '../fixtures/helpers';

test.describe('GM Screen Tabs Test', () => {
  test.beforeEach(async ({ page }) => {
    await removeBlockingBadges(page);
    await loginTestUser(page);
    await navigateToGMScreen(page);
  });

  test('GM Screen displays all tabs (Maps moved to Campaign Dashboard)', async ({ page }) => {
    // Verify all main tabs are present - Maps tab was moved to Campaign Dashboard
    await expect(page.getByTestId('tab-combat')).toBeVisible();
    await expect(page.getByTestId('tab-dice')).toBeVisible();
    await expect(page.getByTestId('tab-monsters')).toBeVisible();
    await expect(page.getByTestId('tab-creatures')).toBeVisible();
    await expect(page.getByTestId('tab-names')).toBeVisible();
    await expect(page.getByTestId('tab-tables')).toBeVisible();
    await expect(page.getByTestId('tab-loot')).toBeVisible();
    await expect(page.getByTestId('tab-inventory')).toBeVisible();
    await expect(page.getByTestId('tab-party')).toBeVisible();
    await expect(page.getByTestId('tab-notes')).toBeVisible();
    
    // Maps tab should NOT be on GM Screen anymore (moved to Campaign Dashboard)
    await expect(page.getByTestId('tab-maps')).not.toBeVisible();
  });

  test('Combat tab shows Combat Control section', async ({ page }) => {
    // Combat should be default tab
    await page.getByTestId('tab-combat').click();
    await expect(page.getByRole('heading', { name: 'Combat Control' })).toBeVisible();
    
    // Should show encounter selector
    await expect(page.getByText('Select Encounter')).toBeVisible();
    
    // Should show Start Combat button
    await expect(page.getByTestId('start-combat-btn')).toBeVisible();
    
    // Should show Quick Start button
    await expect(page.getByTestId('quick-combat-btn')).toBeVisible();
  });

  test('Dice tab shows Dice Roller', async ({ page }) => {
    await page.getByTestId('tab-dice').click();
    await expect(page.getByRole('heading', { name: 'Dice Roller' }).first()).toBeVisible();
    
    // Should show dice buttons
    await expect(page.getByRole('button', { name: 'D20', exact: true })).toBeVisible();
  });

  test('Monsters tab shows Monster Lookup', async ({ page }) => {
    await page.getByTestId('tab-monsters').click();
    
    // Should have monster search functionality
    // Look for search input or monster list header
    await expect(page.getByText(/monster/i).first()).toBeVisible();
  });

  test('Creatures tab shows Custom Creatures', async ({ page }) => {
    await page.getByTestId('tab-creatures').click();
    
    // Should show creatures header or management
    await expect(page.getByText(/creature/i).first()).toBeVisible();
  });

  test('Names tab shows Name Generator', async ({ page }) => {
    await page.getByTestId('tab-names').click();
    
    // Should show name generator heading
    await expect(page.getByRole('heading', { name: /Name Generator/i })).toBeVisible();
    
    // Should have generate button
    await expect(page.getByTestId('generate-name-btn')).toBeVisible();
  });

  test('Tables tab shows Random Tables', async ({ page }) => {
    await page.getByTestId('tab-tables').click();
    
    // Should show tables content
    await expect(page.getByText(/table/i).first()).toBeVisible();
  });

  test('Loot Gen tab shows Loot Generator', async ({ page }) => {
    await page.getByTestId('tab-loot').click();
    
    // Should show loot generator
    await expect(page.getByText(/loot/i).first()).toBeVisible();
  });

  test('Inventory tab shows Party Inventory', async ({ page }) => {
    await page.getByTestId('tab-inventory').click();
    
    // Should show inventory section
    await expect(page.getByText(/inventory/i).first()).toBeVisible();
  });

  test('Party tab shows Party Overview', async ({ page }) => {
    await page.getByTestId('tab-party').click();
    
    // Should show party overview heading
    await expect(page.getByRole('heading', { name: 'Party Overview' })).toBeVisible();
    
    // Should show party members (Fighter and Wizard from test data)
    await expect(page.getByText('Fighter')).toBeVisible();
    await expect(page.getByText('Wizard')).toBeVisible();
  });

  test('Notes tab shows Session Notes', async ({ page }) => {
    await page.getByTestId('tab-notes').click();
    
    // Should show notes section
    await expect(page.getByText(/notes/i).first()).toBeVisible();
  });

  test('Name Generator can generate a random name', async ({ page }) => {
    await page.getByTestId('tab-names').click();
    
    // Wait for name generator to load
    await expect(page.getByTestId('generate-name-btn')).toBeVisible();
    
    // Click generate button
    await page.getByTestId('generate-name-btn').click();
    
    // Wait for name to be generated - should show a name somewhere
    await page.waitForTimeout(1000);
    
    // A generated name should appear in the UI
    // Look for "Save as NPC" button which appears after generation
    await expect(page.getByTestId('save-as-npc-btn')).toBeVisible({ timeout: 5000 });
  });

  // Maps tab tests removed - Maps functionality moved to Campaign Dashboard
  // See map-builder.spec.ts for Campaign Dashboard Maps tab tests
});
