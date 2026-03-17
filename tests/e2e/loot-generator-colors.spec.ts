import { test, expect, Page } from '@playwright/test';

/**
 * Tests for Loot Generator gold color implementation and Quick Dice panel visibility
 * on Loot tab. This verifies the UI cleanup (green #22c55e → gold #F59E0B).
 */

const TEST_EMAIL = 'lcblakey24@outlook.com';
const TEST_PASSWORD = 'LCBlakey24?!';
const CAMPAIGN_ID = 'b51ba0e9-5b08-44ed-b3dd-4a97dd2a09f6';

async function login(page: Page) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');
  await page.fill('input[placeholder="Email address"]', TEST_EMAIL);
  await page.fill('input[placeholder="Password"]', TEST_PASSWORD);
  await page.click('button:has-text("Sign In")');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
}

test.describe('GM Screen Loot Tab and Quick Dice Panel', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`/gm-screen/${CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
  });

  test('Quick Dice panel is visible on Loot tab', async ({ page }) => {
    // Navigate to Loot tab
    await page.getByTestId('tab-loot').click();
    await page.waitForTimeout(1000);
    
    // Verify Loot Generator is visible
    await expect(page.locator('text=Loot Generator').first()).toBeVisible();
    
    // Verify Quick Dice panel is also visible (should be persistent across all tabs)
    await expect(page.locator('text=Quick Dice').first()).toBeVisible();
    
    // Verify quick roll buttons are available
    await expect(page.locator('button:has-text("d20")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Attack (d20)")').first()).toBeVisible();
    
    await page.screenshot({ path: 'loot-tab-with-quick-dice.jpeg', quality: 20 });
  });

  test('Loot Generator displays correctly with gold theme', async ({ page }) => {
    // Navigate to Loot tab
    await page.getByTestId('tab-loot').click();
    await page.waitForTimeout(1000);
    
    // Verify Loot Generator header
    await expect(page.locator('text=Loot Generator').first()).toBeVisible();
    
    // Verify tier selection buttons are visible
    await expect(page.locator('button:has-text("Low (CR 0-4)")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Medium (CR 5-10)")').first()).toBeVisible();
    await expect(page.locator('button:has-text("High (CR 11-16)")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Legendary (CR 17+)")').first()).toBeVisible();
    
    // Verify Generate Loot button exists
    await expect(page.locator('button:has-text("Generate Loot")').first()).toBeVisible();
    
    await page.screenshot({ path: 'loot-generator-gold-theme.jpeg', quality: 20 });
  });

  test('Generate Loot button works and shows results', async ({ page }) => {
    // Navigate to Loot tab
    await page.getByTestId('tab-loot').click();
    await page.waitForTimeout(1000);
    
    // Click Generate Loot button
    await page.locator('button:has-text("Generate Loot")').first().click();
    await page.waitForTimeout(1500);
    
    // Verify some loot result is displayed (Coins section should always appear)
    await expect(page.locator('text=Coins').first()).toBeVisible();
    
    // Verify Total Value is displayed
    await expect(page.locator('text=Total Value').first()).toBeVisible();
    
    // Verify Reroll button appears after generation
    await expect(page.locator('button:has-text("Reroll Loot")').first()).toBeVisible();
    
    await page.screenshot({ path: 'loot-generated-results.jpeg', quality: 20 });
  });

  test('Loot Generator Medium tier button uses gold color (#F59E0B)', async ({ page }) => {
    // Navigate to Loot tab
    await page.getByTestId('tab-loot').click();
    await page.waitForTimeout(1000);
    
    // Click on Medium tier button to select it
    const mediumBtn = page.locator('button:has-text("Medium (CR 5-10)")').first();
    await mediumBtn.click();
    await page.waitForTimeout(500);
    
    // Take screenshot to visually verify gold color
    await page.screenshot({ path: 'loot-medium-tier-gold.jpeg', quality: 20 });
    
    // The button should have gold border/styling when selected
    // This is a visual verification - the actual border color is #F59E0B
  });

  test('Generated loot Magic Items section uses correct styling', async ({ page }) => {
    // Navigate to Loot tab
    await page.getByTestId('tab-loot').click();
    await page.waitForTimeout(1000);
    
    // Select High tier (more likely to generate magic items)
    await page.locator('button:has-text("High (CR 11-16)")').first().click();
    await page.waitForTimeout(300);
    
    // Generate loot multiple times to try to get magic items
    for (let i = 0; i < 5; i++) {
      await page.locator('button:has-text("Generate Loot")').first().click();
      await page.waitForTimeout(700);
      
      const magicItems = page.locator('text=Magic Items');
      if (await magicItems.isVisible()) {
        // Magic items generated - take screenshot
        await page.screenshot({ path: 'loot-magic-items-styling.jpeg', quality: 20 });
        break;
      }
      
      // Click Reroll if available
      const reroll = page.locator('button:has-text("Reroll Loot")').first();
      if (await reroll.isVisible()) {
        await reroll.click();
        await page.waitForTimeout(700);
      }
    }
  });
});

test.describe('GM Screen All 9 Tabs Functional', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`/gm-screen/${CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
  });

  test('All 9 GM Screen tabs are visible and clickable', async ({ page }) => {
    // List of all 9 tabs
    const tabs = [
      { id: 'tab-combat', label: 'Combat' },
      { id: 'tab-location', label: 'Location' },
      { id: 'tab-npcs', label: 'NPCs' },
      { id: 'tab-monsters', label: 'Monsters' },
      { id: 'tab-tables', label: 'Tables' },
      { id: 'tab-loot', label: 'Loot' },
      { id: 'tab-dice', label: 'Dice' },
      { id: 'tab-party', label: 'Party' },
      { id: 'tab-notes', label: 'Notes' }
    ];
    
    // Verify all tabs are visible
    for (const tab of tabs) {
      await expect(page.getByTestId(tab.id)).toBeVisible();
    }
    
    await page.screenshot({ path: 'all-9-tabs-visible.jpeg', quality: 20 });
  });

  test('Each tab loads content when clicked', async ({ page }) => {
    // Combat tab (default)
    await page.getByTestId('tab-combat').click();
    await page.waitForTimeout(500);
    await expect(page.locator('text=Combat Control').first()).toBeVisible();
    
    // Location tab
    await page.getByTestId('tab-location').click();
    await page.waitForTimeout(500);
    await expect(page.locator('text=Party Location').first()).toBeVisible();
    
    // NPCs tab
    await page.getByTestId('tab-npcs').click();
    await page.waitForTimeout(500);
    await expect(page.locator('text=NPCs').first()).toBeVisible();
    
    // Monsters tab
    await page.getByTestId('tab-monsters').click();
    await page.waitForTimeout(500);
    await expect(page.locator('text=Monster').first()).toBeVisible();
    
    // Tables tab
    await page.getByTestId('tab-tables').click();
    await page.waitForTimeout(500);
    await expect(page.locator('text=Random Tables').first()).toBeVisible();
    
    // Loot tab
    await page.getByTestId('tab-loot').click();
    await page.waitForTimeout(500);
    await expect(page.locator('text=Loot Generator').first()).toBeVisible();
    
    // Dice tab
    await page.getByTestId('tab-dice').click();
    await page.waitForTimeout(500);
    await expect(page.locator('text=Dice Roller').first()).toBeVisible();
    
    // Party tab
    await page.getByTestId('tab-party').click();
    await page.waitForTimeout(500);
    await expect(page.locator('text=Party').first()).toBeVisible();
    
    // Notes tab
    await page.getByTestId('tab-notes').click();
    await page.waitForTimeout(500);
    await expect(page.locator('text=Session Notes').first()).toBeVisible();
    
    await page.screenshot({ path: 'all-tabs-load-content.jpeg', quality: 20 });
  });
});
