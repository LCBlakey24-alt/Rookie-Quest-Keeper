import { test, expect } from '@playwright/test';
import { dismissToasts, removeBlockingBadges } from '../fixtures/helpers';

// Test the consolidated tabs feature in Campaign Dashboard
test.describe('Consolidated Tabs - Campaign Dashboard', () => {
  const campaignId = '747e1590-9418-4be8-93bc-4d76a636e655';
  
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    // Login
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await page.getByTestId('login-email').fill('admin@rookiequestkeeper.com');
    await page.getByTestId('login-password').fill('admin123');
    await page.getByTestId('login-btn').click();
    await page.waitForTimeout(2000);
    // Navigate to campaign
    await page.goto(`/campaign/${campaignId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await removeBlockingBadges(page);
  });

  test('should display consolidated Maps tab with World Map and Local Maps sub-tabs', async ({ page }) => {
    // Click on Maps tab
    await page.getByTestId('maps-tab').click();
    await page.waitForTimeout(500);
    
    // Verify the consolidated Maps tab container is visible
    await expect(page.getByTestId('maps-consolidated-tab')).toBeVisible();
    
    // Verify sub-tabs are visible
    await expect(page.getByTestId('maps-subtab-world')).toBeVisible();
    await expect(page.getByTestId('maps-subtab-local')).toBeVisible();
    
    // World Map sub-tab should have correct label
    await expect(page.getByTestId('maps-subtab-world')).toContainText('World Map');
    
    // Local Maps sub-tab should have correct label  
    await expect(page.getByTestId('maps-subtab-local')).toContainText('Local Maps');
  });

  test('should switch between Maps sub-tabs', async ({ page }) => {
    await page.getByTestId('maps-tab').click();
    await page.waitForTimeout(500);
    
    // By default World Map is selected
    const worldSubTab = page.getByTestId('maps-subtab-world');
    
    // Click Local Maps sub-tab
    await page.getByTestId('maps-subtab-local').click();
    await page.waitForTimeout(500);
    
    // Local Maps content should now be visible
    // The sub-tab should be active (has primary color background)
    const localSubTab = page.getByTestId('maps-subtab-local');
    await expect(localSubTab).toBeVisible();
    
    // Switch back to World Map
    await worldSubTab.click();
    await page.waitForTimeout(500);
    await expect(worldSubTab).toBeVisible();
  });

  test('should display consolidated NPCs tab with NPC List and Relationship Web sub-tabs', async ({ page }) => {
    // Click on NPCs tab
    await page.getByTestId('npcs-tab').click();
    await page.waitForTimeout(500);
    
    // Verify the consolidated NPCs tab container
    await expect(page.getByTestId('npcs-consolidated-tab')).toBeVisible();
    
    // Verify sub-tabs
    await expect(page.getByTestId('npcs-subtab-list')).toBeVisible();
    await expect(page.getByTestId('npcs-subtab-web')).toBeVisible();
    
    // Check labels
    await expect(page.getByTestId('npcs-subtab-list')).toContainText('NPC List');
    await expect(page.getByTestId('npcs-subtab-web')).toContainText('Relationship Web');
  });

  test('should display consolidated Chronicle tab with Timeline and Calendar sub-tabs', async ({ page }) => {
    // Click on Chronicle tab
    await page.getByTestId('chronicle-tab').click();
    await page.waitForTimeout(500);
    
    // Verify the consolidated Chronicle tab container
    await expect(page.getByTestId('chronicle-consolidated-tab')).toBeVisible();
    
    // Verify sub-tabs
    await expect(page.getByTestId('chronicle-subtab-timeline')).toBeVisible();
    await expect(page.getByTestId('chronicle-subtab-calendar')).toBeVisible();
    
    // Check labels
    await expect(page.getByTestId('chronicle-subtab-timeline')).toContainText('Session Timeline');
    await expect(page.getByTestId('chronicle-subtab-calendar')).toContainText('In-Game Calendar');
  });

  test('should display consolidated Combat tab with Combat Setup and Encounter Gen sub-tabs', async ({ page }) => {
    // Click on Combat tab in the Combat group
    await page.getByTestId('combat-tab').click();
    await page.waitForTimeout(500);
    
    // Verify the consolidated Combat tab container
    await expect(page.getByTestId('combat-consolidated-tab')).toBeVisible();
    
    // Verify sub-tabs
    await expect(page.getByTestId('combat-subtab-creator')).toBeVisible();
    await expect(page.getByTestId('combat-subtab-generator')).toBeVisible();
    
    // Check labels
    await expect(page.getByTestId('combat-subtab-creator')).toContainText('Combat Setup');
    await expect(page.getByTestId('combat-subtab-generator')).toContainText('Encounter Gen');
  });

  test('should display consolidated Tools tab with Quick Reference and Random Generators sub-tabs', async ({ page }) => {
    // Click on Tools tab
    await page.getByTestId('tools-tab').click();
    await page.waitForTimeout(500);
    
    // Verify the consolidated Tools tab container
    await expect(page.getByTestId('tools-consolidated-tab')).toBeVisible();
    
    // Verify sub-tabs
    await expect(page.getByTestId('tools-subtab-reference')).toBeVisible();
    await expect(page.getByTestId('tools-subtab-generators')).toBeVisible();
    
    // Check labels
    await expect(page.getByTestId('tools-subtab-reference')).toContainText('Quick Reference');
    await expect(page.getByTestId('tools-subtab-generators')).toContainText('Random Generators');
  });

  test('should display consolidated Inventory tab with Party Loot and Item Creator sub-tabs', async ({ page }) => {
    // Click on Inventory tab
    await page.getByTestId('inventory-tab').click();
    await page.waitForTimeout(500);
    
    // Verify the consolidated Inventory tab container
    await expect(page.getByTestId('inventory-consolidated-tab')).toBeVisible();
    
    // Verify sub-tabs
    await expect(page.getByTestId('inventory-subtab-party-loot')).toBeVisible();
    await expect(page.getByTestId('inventory-subtab-items')).toBeVisible();
    
    // Check labels
    await expect(page.getByTestId('inventory-subtab-party-loot')).toContainText('Party Loot');
    await expect(page.getByTestId('inventory-subtab-items')).toContainText('Item Creator');
  });

  test('should have sidebar showing grouped tabs structure', async ({ page }) => {
    // Verify the main sidebar structure shows World, Combat, and GM Tools groups
    await expect(page.getByTestId('group-world')).toBeVisible();
    await expect(page.getByTestId('group-combat')).toBeVisible();
    await expect(page.getByTestId('group-tools')).toBeVisible();
    
    // Verify standalone tabs (not in groups)
    await expect(page.getByTestId('session-recap-tab')).toBeVisible();
    await expect(page.getByTestId('players-tab')).toBeVisible();
    await expect(page.getByTestId('ingame-notes-tab')).toBeVisible();
  });
});
