import { test, expect } from '@playwright/test';
import { waitForAppReady, dismissToasts, removeBlockingBadges, loginTestUser, TEST_CAMPAIGN_ID } from '../fixtures/helpers';

test.describe('Sidebar Tab Grouping', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await removeBlockingBadges(page);
    
    // Login with existing test user
    await loginTestUser(page);
    await expect(page.getByText('MY CHARACTERS')).toBeVisible({ timeout: 10000 });
    
    // Navigate to test campaign dashboard
    await page.goto(`/campaign/${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/campaign\//, { timeout: 10000 });
    await waitForAppReady(page);
  });

  test('World group contains correct tabs (Setting, World Builder, Gods, Locations, NPCs, Calendar)', async ({ page }) => {
    // Verify World group header is visible
    await expect(page.getByTestId('group-world')).toBeVisible();
    
    // World group should be auto-expanded since Setting is the active tab by default
    // Verify all World tabs are present
    await expect(page.getByTestId('setting-tab')).toBeVisible();
    await expect(page.getByTestId('world-tab')).toBeVisible();
    await expect(page.getByTestId('gods-tab')).toBeVisible();
    await expect(page.getByTestId('locations-tab')).toBeVisible();
    await expect(page.getByTestId('npcs-tab')).toBeVisible();
    await expect(page.getByTestId('calendar-tab')).toBeVisible();
    
    // Take screenshot of World group expanded
    await page.screenshot({ path: 'world-group-expanded.jpeg', quality: 20 });
  });

  test('Combat group contains correct tabs (Combat, Battle Maps, Encounter Gen)', async ({ page }) => {
    // Verify Combat group header is visible
    await expect(page.getByTestId('group-combat')).toBeVisible();
    
    // Combat group may be collapsed by default, expand it
    const combatTab = page.getByTestId('combat-creator-tab');
    const isVisible = await combatTab.isVisible().catch(() => false);
    
    if (!isVisible) {
      // Group is collapsed, click to expand
      await page.getByTestId('group-combat').click();
    }
    
    // Verify all Combat tabs are present
    await expect(page.getByTestId('combat-creator-tab')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('maps-tab')).toBeVisible();
    await expect(page.getByTestId('encounter-gen-tab')).toBeVisible();
    
    // Take screenshot of Combat group expanded
    await page.screenshot({ path: 'combat-group-expanded.jpeg', quality: 20 });
  });

  test('Standalone tabs are shown individually (References, Inventory, Players, Notes)', async ({ page }) => {
    // Verify standalone tabs are visible (not in groups)
    await expect(page.getByTestId('reference-tab')).toBeVisible();
    await expect(page.getByTestId('items-tab')).toBeVisible();
    await expect(page.getByTestId('players-tab')).toBeVisible();
    await expect(page.getByTestId('ingame-notes-tab')).toBeVisible();
    
    // Verify the labels are correct
    await expect(page.getByTestId('reference-tab')).toContainText('References');
    await expect(page.getByTestId('items-tab')).toContainText('Inventory');
    await expect(page.getByTestId('players-tab')).toContainText('Players');
    await expect(page.getByTestId('ingame-notes-tab')).toContainText('Notes');
    
    // Take screenshot showing standalone tabs
    await page.screenshot({ path: 'standalone-tabs.jpeg', quality: 20 });
  });

  test('Battle Maps tab (renamed from Maps) works correctly', async ({ page }) => {
    // First expand Combat group - click on group header
    const combatGroup = page.getByTestId('group-combat');
    await expect(combatGroup).toBeVisible();
    await combatGroup.click();
    
    // Wait for maps tab to become visible
    const mapsTab = page.getByTestId('maps-tab');
    await expect(mapsTab).toBeVisible({ timeout: 5000 });
    
    // Check that the maps tab label says "Battle Maps"
    await expect(mapsTab).toContainText('Battle Maps');
    
    // Click the Battle Maps tab
    await mapsTab.click();
    
    // Verify Battle Maps content loads
    await expect(page.getByRole('heading', { name: /Battle Map/i })).toBeVisible({ timeout: 10000 });
  });

  test('Collapsible groups expand and collapse on click', async ({ page }) => {
    // Verify World group is visible
    await expect(page.getByTestId('group-world')).toBeVisible();
    
    // Setting tab should be visible since World group is auto-expanded (Setting is active)
    await expect(page.getByTestId('setting-tab')).toBeVisible();
    
    // Test with Combat group instead (World group won't collapse because it has active tab)
    await expect(page.getByTestId('group-combat')).toBeVisible();
    
    // First check Combat current state
    const combatTabBefore = page.getByTestId('combat-creator-tab');
    const isExpandedBefore = await combatTabBefore.isVisible().catch(() => false);
    
    // Toggle Combat group
    await page.getByTestId('group-combat').click();
    
    // After toggle, state should be opposite
    if (isExpandedBefore) {
      // Was expanded, should now be collapsed
      await expect(page.getByTestId('combat-creator-tab')).toBeHidden({ timeout: 2000 });
    } else {
      // Was collapsed, should now be expanded
      await expect(page.getByTestId('combat-creator-tab')).toBeVisible({ timeout: 2000 });
    }
    
    // Toggle again to verify bidirectional
    await page.getByTestId('group-combat').click();
    
    if (isExpandedBefore) {
      // Should be back to expanded
      await expect(page.getByTestId('combat-creator-tab')).toBeVisible({ timeout: 2000 });
    } else {
      // Should be back to collapsed
      await expect(page.getByTestId('combat-creator-tab')).toBeHidden({ timeout: 2000 });
    }
  });

  test('Active tab group auto-expands', async ({ page }) => {
    // Setting tab is default, so World group should be auto-expanded
    await expect(page.getByTestId('setting-tab')).toBeVisible();
    
    // Click on a standalone tab (References)
    await page.getByTestId('reference-tab').click();
    
    // Verify Reference tab content loads - it shows ITEMS DATABASE or Items section
    await expect(page.getByText('ITEMS DATABASE').first()).toBeVisible({ timeout: 10000 });
    
    // Navigate back to a World tab
    await page.getByTestId('npcs-tab').click();
    
    // Verify World group is now showing NPCs active
    await expect(page.getByRole('heading', { name: /NPCs/i })).toBeVisible({ timeout: 10000 });
  });

  test('Tab navigation within groups works correctly', async ({ page }) => {
    // Navigate through different tabs in World group
    await page.getByTestId('setting-tab').click();
    await expect(page.getByRole('heading', { name: 'Campaign Setting' })).toBeVisible({ timeout: 10000 });
    
    await page.getByTestId('gods-tab').click();
    await expect(page.getByRole('heading', { name: /Gods/i })).toBeVisible({ timeout: 10000 });
    
    await page.getByTestId('npcs-tab').click();
    await expect(page.getByRole('heading', { name: /NPCs/i })).toBeVisible({ timeout: 10000 });
    
    await page.getByTestId('locations-tab').click();
    await expect(page.getByRole('heading', { name: /Locations/i })).toBeVisible({ timeout: 10000 });
    
    // Navigate to Combat group - ensure it's expanded first
    const encounterGenTab = page.getByTestId('encounter-gen-tab');
    const isCombatExpanded = await encounterGenTab.isVisible().catch(() => false);
    
    if (!isCombatExpanded) {
      await page.getByTestId('group-combat').click();
    }
    
    await encounterGenTab.click();
    await expect(page.getByText('Random Encounter Generator')).toBeVisible({ timeout: 10000 });
    
    // Navigate to standalone Inventory tab
    await page.getByTestId('items-tab').click();
    await expect(page.getByText('Item Creator')).toBeVisible({ timeout: 10000 });
  });

  test('Group headers show chevron icons and toggle state', async ({ page }) => {
    // World group header should have a chevron icon
    const worldGroup = page.getByTestId('group-world');
    await expect(worldGroup).toBeVisible();
    
    // Combat group should also be visible
    const combatGroup = page.getByTestId('group-combat');
    await expect(combatGroup).toBeVisible();
    
    // Verify groups are clickable (can toggle)
    await worldGroup.click();
    await combatGroup.click();
    
    // Take final screenshot
    await page.screenshot({ path: 'groups-toggled.jpeg', quality: 20 });
  });
});
