import { test, expect } from '@playwright/test';
import { 
  loginTestUser, 
  dismissToasts, 
  removeBlockingBadges,
  TEST_CAMPAIGN_ID 
} from '../fixtures/helpers';

test.describe('Map Builder Feature - Campaign Dashboard', () => {
  
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await loginTestUser(page);
    // Navigate to Campaign Dashboard (Maps tab is now here, not GM Screen)
    await page.goto(`/campaign/${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Campaign Setting/i })).toBeVisible({ timeout: 15000 });
    await removeBlockingBadges(page);
  });

  test('Maps tab is visible and accessible in Campaign Dashboard', async ({ page }) => {
    // Find Maps tab in sidebar
    const mapsTab = page.getByTestId('maps-tab');
    await expect(mapsTab).toBeVisible();
    
    // Click Maps tab
    await mapsTab.click();
    
    // Verify Maps section loads
    await expect(page.getByRole('heading', { name: 'Battle Maps', exact: true })).toBeVisible({ timeout: 10000 });
    
    // Verify Create Map button exists
    await expect(page.getByTestId('create-map-btn')).toBeVisible();
  });

  test('Create Map button opens Map Builder', async ({ page }) => {
    // Navigate to Maps tab
    await page.getByTestId('maps-tab').click();
    await expect(page.getByRole('heading', { name: 'Battle Maps', exact: true })).toBeVisible({ timeout: 10000 });
    
    // Click Create Map button
    await page.getByTestId('create-map-btn').click();
    
    // Verify Map Builder opens (full screen overlay)
    await expect(page.getByRole('heading', { name: 'Map Builder' })).toBeVisible({ timeout: 10000 });
    
    // Verify toolbar tools are visible
    await expect(page.getByTestId('tool-select')).toBeVisible();
    await expect(page.getByTestId('tool-terrain')).toBeVisible();
    await expect(page.getByTestId('tool-wall')).toBeVisible();
    await expect(page.getByTestId('tool-door')).toBeVisible();
    await expect(page.getByTestId('tool-eraser')).toBeVisible();
    await expect(page.getByTestId('tool-fog')).toBeVisible();
    await expect(page.getByTestId('tool-token')).toBeVisible();
  });

  test('Map Builder toolbar - tool selection works', async ({ page }) => {
    // Navigate to Maps tab and open Map Builder
    await page.getByTestId('maps-tab').click();
    await page.getByTestId('create-map-btn').click();
    await expect(page.getByRole('heading', { name: 'Map Builder' })).toBeVisible({ timeout: 10000 });
    
    // Test each tool selection
    const tools = ['select', 'terrain', 'wall', 'door', 'eraser', 'fog', 'token'];
    
    for (const tool of tools) {
      const toolBtn = page.getByTestId(`tool-${tool}`);
      await toolBtn.click();
      
      // Verify tool is selected (has active styling) - check for border
      await expect(toolBtn).toHaveAttribute('style', /border.*solid/);
    }
  });

  test('Map Builder terrain picker appears when terrain tool is selected', async ({ page }) => {
    // Navigate to Maps tab and open Map Builder
    await page.getByTestId('maps-tab').click();
    await page.getByTestId('create-map-btn').click();
    await expect(page.getByRole('heading', { name: 'Map Builder' })).toBeVisible({ timeout: 10000 });
    
    // Select terrain tool
    await page.getByTestId('tool-terrain').click();
    
    // Terrain picker button should be visible in the toolbar
    const terrainPicker = page.locator('button:has-text("Stone Floor")').first();
    await expect(terrainPicker).toBeVisible();
  });

  test('Map Builder has save button', async ({ page }) => {
    // Navigate to Maps tab and open Map Builder
    await page.getByTestId('maps-tab').click();
    await page.getByTestId('create-map-btn').click();
    await expect(page.getByRole('heading', { name: 'Map Builder' })).toBeVisible({ timeout: 10000 });
    
    // Verify Save Map button exists
    await expect(page.getByTestId('save-map-btn')).toBeVisible();
    await expect(page.getByTestId('save-map-btn')).toHaveText(/Save Map/);
  });

  test('Map Builder side panel - Layers tab with Quick Fill', async ({ page }) => {
    // Navigate to Maps tab and open Map Builder
    await page.getByTestId('maps-tab').click();
    await page.getByTestId('create-map-btn').click();
    await expect(page.getByRole('heading', { name: 'Map Builder' })).toBeVisible({ timeout: 10000 });
    
    // Verify side panel with Layers tab (default)
    await expect(page.getByText('Quick Fill')).toBeVisible({ timeout: 10000 });
    
    // Verify Quick Fill buttons for terrain types
    await expect(page.getByRole('button', { name: 'Empty' })).toBeVisible();
    await expect(page.locator('button:has-text("Wood Floor")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Grass")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Water")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Sand")').first()).toBeVisible();
    
    // Verify Fog of War controls
    await expect(page.getByRole('heading', { name: 'Fog of War' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reveal All' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Hide All' })).toBeVisible();
  });

  test('Map Builder back button closes the builder', async ({ page }) => {
    // Navigate to Maps tab and open Map Builder
    await page.getByTestId('maps-tab').click();
    await page.getByTestId('create-map-btn').click();
    await expect(page.getByRole('heading', { name: 'Map Builder' })).toBeVisible({ timeout: 10000 });
    
    // Click Back button
    await page.getByRole('button', { name: 'Back' }).click();
    
    // Verify Map Builder is closed and we're back to Campaign Dashboard Maps tab
    await expect(page.getByRole('heading', { name: 'Battle Maps', exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Map Builder' })).not.toBeVisible();
  });

  test('Map Builder canvas is rendered', async ({ page }) => {
    // Navigate to Maps tab and open Map Builder
    await page.getByTestId('maps-tab').click();
    await page.getByTestId('create-map-btn').click();
    await expect(page.getByRole('heading', { name: 'Map Builder' })).toBeVisible({ timeout: 10000 });
    
    // Verify canvas element exists
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
    
    // Verify grid size info is displayed
    await expect(page.getByText(/\d+ x \d+ grid/)).toBeVisible();
  });
});
