import { test, expect } from '@playwright/test';
import { 
  loginTestUser, 
  dismissToasts, 
  hideEmergentBadge,
  TEST_CAMPAIGN_ID 
} from '../fixtures/helpers';

const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'https://ttrpg-combat-fix.preview.emergentagent.com';

test.describe('Map Builder Feature', () => {
  
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await loginTestUser(page);
    // Navigate to GM Screen
    await page.goto(`/gm-screen/${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Combat Control' })).toBeVisible({ timeout: 15000 });
    await hideEmergentBadge(page);
  });

  test('Maps tab is visible and accessible in GM Screen', async ({ page }) => {
    // Find Maps tab
    const mapsTab = page.getByTestId('tab-maps');
    await expect(mapsTab).toBeVisible();
    
    // Click Maps tab
    await mapsTab.click();
    
    // Verify Maps section loads - use exact match
    await expect(page.getByRole('heading', { name: 'Battle Maps', exact: true })).toBeVisible({ timeout: 10000 });
    
    // Verify Create Map button exists
    await expect(page.getByTestId('create-map-btn')).toBeVisible();
  });

  test('Create Map button opens Map Builder', async ({ page }) => {
    // Navigate to Maps tab
    await page.getByTestId('tab-maps').click();
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
    await page.getByTestId('tab-maps').click();
    await page.getByTestId('create-map-btn').click();
    await expect(page.getByRole('heading', { name: 'Map Builder' })).toBeVisible({ timeout: 10000 });
    
    // Test each tool selection
    const tools = ['select', 'terrain', 'wall', 'door', 'eraser', 'fog', 'token'];
    
    for (const tool of tools) {
      const toolBtn = page.getByTestId(`tool-${tool}`);
      await toolBtn.click();
      
      // Verify tool is selected (has active styling) - check for border
      // Active tools have border: 2px solid #3b82f6
      await expect(toolBtn).toHaveAttribute('style', /border.*solid/);
    }
  });

  test('Map Builder terrain picker appears when terrain tool is selected', async ({ page }) => {
    // Navigate to Maps tab and open Map Builder
    await page.getByTestId('tab-maps').click();
    await page.getByTestId('create-map-btn').click();
    await expect(page.getByRole('heading', { name: 'Map Builder' })).toBeVisible({ timeout: 10000 });
    
    // Select terrain tool
    await page.getByTestId('tool-terrain').click();
    
    // Terrain picker button should be visible in the toolbar
    // It shows the currently selected terrain type (default is stone)
    const terrainPicker = page.locator('button:has-text("Stone Floor")').first();
    await expect(terrainPicker).toBeVisible();
  });

  test('Map Builder has save button', async ({ page }) => {
    // Navigate to Maps tab and open Map Builder
    await page.getByTestId('tab-maps').click();
    await page.getByTestId('create-map-btn').click();
    await expect(page.getByRole('heading', { name: 'Map Builder' })).toBeVisible({ timeout: 10000 });
    
    // Verify Save Map button exists
    await expect(page.getByTestId('save-map-btn')).toBeVisible();
    await expect(page.getByTestId('save-map-btn')).toHaveText(/Save Map/);
  });

  test('Map Builder side panel - Layers tab with Quick Fill', async ({ page }) => {
    // Navigate to Maps tab and open Map Builder
    await page.getByTestId('tab-maps').click();
    await page.getByTestId('create-map-btn').click();
    await expect(page.getByRole('heading', { name: 'Map Builder' })).toBeVisible({ timeout: 10000 });
    
    // Verify side panel with Layers tab (default)
    await expect(page.getByText('Quick Fill')).toBeVisible({ timeout: 10000 });
    
    // Verify Quick Fill buttons for terrain types
    // Empty, Stone Floor, Wood Floor, Grass, Water, Sand are shown in the Quick Fill grid
    await expect(page.getByRole('button', { name: 'Empty' })).toBeVisible();
    // Wood Floor only appears in Quick Fill, not in toolbar - use first()
    await expect(page.locator('button:has-text("Wood Floor")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Grass")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Water")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Sand")').first()).toBeVisible();
    
    // Verify Fog of War controls - use heading role for specificity
    await expect(page.getByRole('heading', { name: 'Fog of War' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reveal All' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Hide All' })).toBeVisible();
  });

  test('Map Builder side panel - Tokens tab', async ({ page }) => {
    // Navigate to Maps tab and open Map Builder
    await page.getByTestId('tab-maps').click();
    await page.getByTestId('create-map-btn').click();
    await expect(page.getByRole('heading', { name: 'Map Builder' })).toBeVisible({ timeout: 10000 });
    
    // Click Tokens tab in side panel
    await page.locator('button:has-text("Tokens")').click();
    
    // Verify Add Test Token button
    await expect(page.getByRole('button', { name: 'Add Test Token' })).toBeVisible({ timeout: 5000 });
  });

  test('Map Builder side panel - Settings tab', async ({ page }) => {
    // Navigate to Maps tab and open Map Builder
    await page.getByTestId('tab-maps').click();
    await page.getByTestId('create-map-btn').click();
    await expect(page.getByRole('heading', { name: 'Map Builder' })).toBeVisible({ timeout: 10000 });
    
    // Click Settings tab in side panel
    await page.locator('button:has-text("Settings")').click();
    
    // Verify settings controls
    await expect(page.getByText('Map Width (squares)')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Map Height (squares)')).toBeVisible();
    await expect(page.getByText('Keyboard Shortcuts')).toBeVisible();
  });

  test('Map Builder back button closes the builder', async ({ page }) => {
    // Navigate to Maps tab and open Map Builder
    await page.getByTestId('tab-maps').click();
    await page.getByTestId('create-map-btn').click();
    await expect(page.getByRole('heading', { name: 'Map Builder' })).toBeVisible({ timeout: 10000 });
    
    // Click Back button
    await page.getByRole('button', { name: 'Back' }).click();
    
    // Verify Map Builder is closed and we're back to GM Screen Maps tab
    await expect(page.getByRole('heading', { name: 'Battle Maps', exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Map Builder' })).not.toBeVisible();
  });

  test('Map Builder canvas is rendered', async ({ page }) => {
    // Navigate to Maps tab and open Map Builder
    await page.getByTestId('tab-maps').click();
    await page.getByTestId('create-map-btn').click();
    await expect(page.getByRole('heading', { name: 'Map Builder' })).toBeVisible({ timeout: 10000 });
    
    // Verify canvas element exists
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
    
    // Verify grid size info is displayed
    await expect(page.getByText(/\d+ x \d+ grid/)).toBeVisible();
  });

  test('Map Builder - Save map to campaign', async ({ page }) => {
    // Navigate to Maps tab and open Map Builder
    await page.getByTestId('tab-maps').click();
    await page.getByTestId('create-map-btn').click();
    await expect(page.getByRole('heading', { name: 'Map Builder' })).toBeVisible({ timeout: 10000 });
    
    // Enter a unique map name
    const timestamp = Date.now();
    const mapName = `TEST_Map_${timestamp}`;
    const mapNameInput = page.locator('input[placeholder="Map name..."]');
    await mapNameInput.fill(mapName);
    
    // Fill the map with stone terrain using Quick Fill
    await page.locator('button:has-text("Stone Floor")').nth(1).click();
    
    // Wait for toast notification about filling
    await expect(page.locator('[data-sonner-toast]').first()).toBeVisible({ timeout: 5000 }).catch(() => {});
    
    // Click Save Map button
    await page.getByTestId('save-map-btn').click();
    
    // Wait for success toast
    await expect(page.getByText('Map saved successfully!')).toBeVisible({ timeout: 10000 });
    
    // Go back to Maps tab to verify map appears
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page.getByRole('heading', { name: 'Battle Maps', exact: true })).toBeVisible({ timeout: 10000 });
    
    // Verify our map is now in the list
    await expect(page.getByText(mapName)).toBeVisible({ timeout: 10000 });
  });

  test('Map Builder - Quick Fill terrain fill', async ({ page }) => {
    // Navigate to Maps tab and open Map Builder
    await page.getByTestId('tab-maps').click();
    await page.getByTestId('create-map-btn').click();
    await expect(page.getByRole('heading', { name: 'Map Builder' })).toBeVisible({ timeout: 10000 });
    
    // Click on Grass in Quick Fill
    await page.locator('button:has-text("Grass")').first().click();
    
    // Should see toast confirming terrain fill
    await expect(page.getByText(/Filled with Grass/i)).toBeVisible({ timeout: 10000 });
  });

  test('Map Builder - Fog of War Reveal All and Hide All', async ({ page }) => {
    // Navigate to Maps tab and open Map Builder
    await page.getByTestId('tab-maps').click();
    await page.getByTestId('create-map-btn').click();
    await expect(page.getByRole('heading', { name: 'Map Builder' })).toBeVisible({ timeout: 10000 });
    
    // Click Reveal All
    await page.getByRole('button', { name: 'Reveal All' }).click();
    await expect(page.getByText(/fog cleared|All fog cleared/i)).toBeVisible({ timeout: 10000 });
    
    // Click Hide All
    await page.getByRole('button', { name: 'Hide All' }).click();
    await expect(page.getByText(/hidden|Map hidden/i)).toBeVisible({ timeout: 10000 });
  });

  test('Map Builder - Add test token', async ({ page }) => {
    // Navigate to Maps tab and open Map Builder
    await page.getByTestId('tab-maps').click();
    await page.getByTestId('create-map-btn').click();
    await expect(page.getByRole('heading', { name: 'Map Builder' })).toBeVisible({ timeout: 10000 });
    
    // Go to Tokens tab
    await page.locator('button:has-text("Tokens")').click();
    await expect(page.getByRole('button', { name: 'Add Test Token' })).toBeVisible({ timeout: 5000 });
    
    // Initially no tokens
    await expect(page.getByText('No tokens on map')).toBeVisible();
    
    // Add test token
    await page.getByRole('button', { name: 'Add Test Token' }).click();
    
    // Verify token appears in list - use exact match
    await expect(page.getByText('Test Token', { exact: true })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Position:/)).toBeVisible();
    
    // No longer shows "no tokens"
    await expect(page.getByText('No tokens on map')).not.toBeVisible();
  });
});
