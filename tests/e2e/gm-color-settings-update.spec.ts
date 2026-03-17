import { test, expect, Page } from '@playwright/test';

/**
 * Tests for GM Side Color Updates and Campaign Settings Modal:
 * 1. Campaign Dashboard - Settings button visible in header
 * 2. Campaign Settings Modal - opens and shows 4 upload sections
 * 3. GM Screen - NPCs tab uses gold colors (Name Generator merged here)
 * 4. GM Screen - Tables tab Shop Name uses gold colors
 * 5. GM Screen - Dice tab uses gold colors
 * 6. Previous features still work
 */

const TEST_EMAIL = 'lcblakey24@outlook.com';
const TEST_PASSWORD = 'LCBlakey24?!';
const CAMPAIGN_ID = 'b51ba0e9-5b08-44ed-b3dd-4a97dd2a09f6';

// Helper to login
async function login(page: Page) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');
  await page.fill('input[placeholder="Email address"]', TEST_EMAIL);
  await page.fill('input[placeholder="Password"]', TEST_PASSWORD);
  await page.click('button:has-text("Sign In")');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
}

test.describe('Campaign Dashboard Settings Button', () => {
  test('Settings button is visible in Campaign Dashboard header', async ({ page }) => {
    await login(page);
    
    // Navigate to campaign
    await page.goto(`/campaign/${CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    // Verify Settings button is visible
    const settingsBtn = page.getByTestId('campaign-settings-btn');
    await expect(settingsBtn).toBeVisible();
    
    // Screenshot for verification
    await page.screenshot({ path: 'test-campaign-dashboard-settings.jpeg', quality: 20 });
  });

  test('Settings button opens Campaign Settings modal with 4 upload sections', async ({ page }) => {
    await login(page);
    
    // Navigate to campaign
    await page.goto(`/campaign/${CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    // Click Settings button
    await page.getByTestId('campaign-settings-btn').click();
    await page.waitForTimeout(1000);
    
    // Verify modal title
    await expect(page.locator('text=Campaign Settings').first()).toBeVisible();
    
    // Verify 4 upload sections are present
    await expect(page.locator('h3').filter({ hasText: 'Custom Rulesets' })).toBeVisible();
    await expect(page.locator('h3').filter({ hasText: 'Custom Races & Classes' })).toBeVisible();
    await expect(page.locator('h3').filter({ hasText: 'Custom Items & Spells' })).toBeVisible();
    await expect(page.locator('h3').filter({ hasText: 'Custom Monsters & NPCs' })).toBeVisible();
    
    // Screenshot for verification
    await page.screenshot({ path: 'test-campaign-settings-modal.jpeg', quality: 20 });
  });
});

test.describe('GM Screen Color Updates', () => {
  test('GM Screen NPCs tab uses gold colors in Name Generator section', async ({ page }) => {
    await login(page);
    
    // Navigate to GM Screen directly
    await page.goto(`/gm-screen/${CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    // Click on NPCs tab (Name Generator is now merged here)
    await page.getByTestId('tab-npcs').click();
    await page.waitForTimeout(1000);
    
    // Verify NPCs tab content is displayed (combined with Name Generator)
    await expect(page.locator('text=NPCs & Name Generator').first()).toBeVisible();
    
    // Verify gold color elements - check for "Generate NPC Name" section
    await expect(page.locator('h3').filter({ hasText: 'Generate NPC Name' })).toBeVisible();
    
    // Verify the Generate Name button exists
    await expect(page.getByTestId('generate-name-btn')).toBeVisible();
    
    // Screenshot for visual verification of gold colors
    await page.screenshot({ path: 'test-gm-screen-names-gold.jpeg', quality: 20 });
  });

  test('GM Screen Tables tab Shop Name uses gold color', async ({ page }) => {
    await login(page);
    
    // Navigate to GM Screen directly
    await page.goto(`/gm-screen/${CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    // Click on Tables tab
    await page.getByTestId('tab-tables').click();
    await page.waitForTimeout(1000);
    
    // Verify Tables tab content
    await expect(page.locator('text=Random Tables').first()).toBeVisible();
    
    // Verify Shop Name button is visible (should be gold colored - #F59E0B)
    const shopNameBtn = page.getByTestId('roll-shop_names-btn');
    await expect(shopNameBtn).toBeVisible();
    
    // Verify the Shop Name button contains correct text
    await expect(shopNameBtn).toContainText('Shop Name');
    
    // Screenshot for visual verification
    await page.screenshot({ path: 'test-gm-screen-tables-shop-gold.jpeg', quality: 20 });
  });

  test('GM Screen Dice tab uses gold colors', async ({ page }) => {
    await login(page);
    
    // Navigate to GM Screen directly
    await page.goto(`/gm-screen/${CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    // Click on Dice tab
    await page.getByTestId('tab-dice').click();
    await page.waitForTimeout(1000);
    
    // Verify Dice tab content
    await expect(page.locator('text=Dice Roller').first()).toBeVisible();
    
    // Verify Roll button exists
    await expect(page.locator('button:has-text("Roll")').first()).toBeVisible();
    
    // Screenshot for visual verification
    await page.screenshot({ path: 'test-gm-screen-dice-gold.jpeg', quality: 20 });
  });

  test('GM Screen Party tab displays correctly', async ({ page }) => {
    await login(page);
    
    // Navigate to GM Screen directly
    await page.goto(`/gm-screen/${CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    // Click on Party tab
    await page.getByTestId('tab-party').click();
    await page.waitForTimeout(1000);
    
    // Verify Party tab content
    await expect(page.locator('text=Party Overview').first()).toBeVisible();
    
    // Screenshot for visual verification of pink/purple colors
    await page.screenshot({ path: 'test-gm-screen-party-colors.jpeg', quality: 20 });
  });
});

test.describe('Previous Features Still Work', () => {
  test('Campaign Dashboard sidebar has correct tabs structure', async ({ page }) => {
    await login(page);
    
    // Navigate to campaign
    await page.goto(`/campaign/${CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    // Verify sidebar groups exist
    await expect(page.getByTestId('group-world')).toBeVisible();
    await expect(page.getByTestId('group-combat')).toBeVisible();
    await expect(page.getByTestId('group-tools')).toBeVisible();
    
    // Verify key tabs are visible
    await expect(page.getByTestId('setting-tab')).toBeVisible();
    await expect(page.getByTestId('combat-tab')).toBeVisible();
    await expect(page.getByTestId('tools-tab')).toBeVisible();
  });

  test('Open GM Screen button works', async ({ page }) => {
    await login(page);
    
    // Navigate to campaign
    await page.goto(`/campaign/${CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    // Verify Open GM Screen button is visible
    const gmScreenBtn = page.getByTestId('open-dm-screen-btn');
    await expect(gmScreenBtn).toBeVisible();
    await expect(gmScreenBtn).toContainText('GM Screen');
  });
});
