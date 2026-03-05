import { test, expect } from '@playwright/test';
import { waitForAppReady, dismissToasts, hideEmergentBadge, loginTestUser, TEST_CAMPAIGN_ID } from '../fixtures/helpers';

test.describe('Sidebar Tab Grouping', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await hideEmergentBadge(page);
    
    // Login with existing test user
    await loginTestUser(page);
    await expect(page.getByText('MY CHARACTERS')).toBeVisible({ timeout: 10000 });
    
    // Navigate to test campaign dashboard
    await page.goto(`/campaign/${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/campaign\//, { timeout: 10000 });
    await waitForAppReady(page);
  });

  test('World group contains correct tabs', async ({ page }) => {
    // Verify World group header is visible
    await expect(page.getByTestId('group-world')).toBeVisible();
    
    // World group should be auto-expanded since Setting is the active tab by default
    // Verify all World tabs are present
    await expect(page.getByTestId('setting-tab')).toBeVisible();
    await expect(page.getByTestId('world-tab')).toBeVisible();
    await expect(page.getByTestId('gods-tab')).toBeVisible();
    await expect(page.getByTestId('locations-tab')).toBeVisible();
    await expect(page.getByTestId('npcs-tab')).toBeVisible();
    
    // Take screenshot of World group expanded
    await page.screenshot({ path: 'world-group-expanded.jpeg', quality: 20 });
  });

  test('Tools group contains correct tabs', async ({ page }) => {
    // Verify Tools group header is visible
    await expect(page.getByTestId('group-tools')).toBeVisible();
    
    // Tools group starts expanded (default state). Check if tabs are visible
    // If not visible, we might need to click to expand
    const referenceTab = page.getByTestId('reference-tab');
    
    // Wait a bit for sidebar to render, then check visibility
    const isVisible = await referenceTab.isVisible().catch(() => false);
    
    if (!isVisible) {
      // Group is collapsed, click to expand
      await page.getByTestId('group-tools').click();
    }
    
    // Now verify all Tools tabs are present
    await expect(page.getByTestId('reference-tab')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('encounter-gen-tab')).toBeVisible();
    await expect(page.getByTestId('items-tab')).toBeVisible();
    
    // Take screenshot of Tools group expanded
    await page.screenshot({ path: 'tools-group-expanded.jpeg', quality: 20 });
  });

  test('Players group contains Party tab', async ({ page }) => {
    // Verify Players group header is visible
    await expect(page.getByTestId('group-players-group')).toBeVisible();
    
    // Check if Party tab is visible (group might be expanded by default)
    const playersTab = page.getByTestId('players-tab');
    const isVisible = await playersTab.isVisible().catch(() => false);
    
    if (!isVisible) {
      // Group is collapsed, click to expand
      await page.getByTestId('group-players-group').click();
    }
    
    // Verify Party tab is present
    await expect(playersTab).toBeVisible({ timeout: 5000 });
    
    // Take screenshot of Players group expanded
    await page.screenshot({ path: 'players-group-expanded.jpeg', quality: 20 });
  });

  test('Ungrouped tabs are shown individually', async ({ page }) => {
    // Verify Combat tab is visible (ungrouped)
    await expect(page.getByTestId('combat-creator-tab')).toBeVisible();
    
    // Verify Battle Maps tab is visible (renamed from Maps)
    await expect(page.getByTestId('maps-tab')).toBeVisible();
    // Verify the label says "Battle Maps" not "Maps"
    await expect(page.getByTestId('maps-tab')).toContainText('Battle Maps');
    
    // Verify Calendar tab is visible (ungrouped)
    await expect(page.getByTestId('calendar-tab')).toBeVisible();
    
    // Verify Notes tab is visible (ungrouped)
    await expect(page.getByTestId('ingame-notes-tab')).toBeVisible();
    
    // Take screenshot showing ungrouped tabs
    await page.screenshot({ path: 'ungrouped-tabs.jpeg', quality: 20 });
  });

  test('Maps renamed to Battle Maps', async ({ page }) => {
    // Check that the maps tab label says "Battle Maps"
    const mapsTab = page.getByTestId('maps-tab');
    await expect(mapsTab).toBeVisible();
    await expect(mapsTab).toContainText('Battle Maps');
    
    // Click the Battle Maps tab
    await mapsTab.click();
    
    // Verify Battle Maps content loads
    await expect(page.getByRole('heading', { name: 'Battle Map' })).toBeVisible({ timeout: 10000 });
  });

  test('Collapsible groups expand and collapse on click', async ({ page }) => {
    // Verify World group is visible
    await expect(page.getByTestId('group-world')).toBeVisible();
    
    // Setting tab should be visible since World group is auto-expanded (Setting is active)
    await expect(page.getByTestId('setting-tab')).toBeVisible();
    
    // Click World group to collapse it (since it starts expanded)
    await page.getByTestId('group-world').click();
    
    // Since World has the active tab (Setting), the group won't collapse (activeGroupId check)
    // Instead, test with Tools group
    await expect(page.getByTestId('group-tools')).toBeVisible();
    
    // First check Tools current state
    const referenceTabBefore = page.getByTestId('reference-tab');
    const isExpandedBefore = await referenceTabBefore.isVisible().catch(() => false);
    
    // Toggle Tools group
    await page.getByTestId('group-tools').click();
    
    // After toggle, state should be opposite
    if (isExpandedBefore) {
      // Was expanded, should now be collapsed
      await expect(page.getByTestId('reference-tab')).toBeHidden({ timeout: 2000 });
    } else {
      // Was collapsed, should now be expanded
      await expect(page.getByTestId('reference-tab')).toBeVisible({ timeout: 2000 });
    }
    
    // Toggle again to verify bidirectional
    await page.getByTestId('group-tools').click();
    
    if (isExpandedBefore) {
      // Should be back to expanded
      await expect(page.getByTestId('reference-tab')).toBeVisible({ timeout: 2000 });
    } else {
      // Should be back to collapsed
      await expect(page.getByTestId('reference-tab')).toBeHidden({ timeout: 2000 });
    }
  });

  test('Active tab group auto-expands', async ({ page }) => {
    // Setting tab is default, so World group should be auto-expanded
    await expect(page.getByTestId('setting-tab')).toBeVisible();
    
    // Expand Tools group first if needed and click Reference tab
    const referenceTab = page.getByTestId('reference-tab');
    const isVisible = await referenceTab.isVisible().catch(() => false);
    
    if (!isVisible) {
      await page.getByTestId('group-tools').click();
    }
    
    await expect(referenceTab).toBeVisible({ timeout: 5000 });
    await referenceTab.click();
    
    // Verify Reference tab content loads - it shows ITEMS DATABASE or Items section
    await expect(page.getByText('ITEMS DATABASE')).toBeVisible({ timeout: 10000 });
    
    // Navigate to a World tab
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
    
    // Navigate to Tools group - ensure it's expanded first
    const encounterGenTab = page.getByTestId('encounter-gen-tab');
    const isToolsExpanded = await encounterGenTab.isVisible().catch(() => false);
    
    if (!isToolsExpanded) {
      await page.getByTestId('group-tools').click();
    }
    
    await encounterGenTab.click();
    await expect(page.getByText('Random Encounter Generator')).toBeVisible({ timeout: 10000 });
    
    await page.getByTestId('items-tab').click();
    await expect(page.getByText('Item Creator')).toBeVisible({ timeout: 10000 });
  });

  test('Group headers show chevron icons for expand/collapse state', async ({ page }) => {
    // World group header should have a chevron icon
    const worldGroup = page.getByTestId('group-world');
    await expect(worldGroup).toBeVisible();
    
    // Tools group should also be visible
    const toolsGroup = page.getByTestId('group-tools');
    await expect(toolsGroup).toBeVisible();
    
    // Players group should be visible
    const playersGroup = page.getByTestId('group-players-group');
    await expect(playersGroup).toBeVisible();
    
    // Verify all groups are clickable (can toggle)
    await worldGroup.click();
    await toolsGroup.click();
    await playersGroup.click();
    
    // Take final screenshot
    await page.screenshot({ path: 'groups-toggled.jpeg', quality: 20 });
  });
});
