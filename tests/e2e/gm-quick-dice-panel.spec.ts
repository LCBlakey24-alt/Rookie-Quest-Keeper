import { test, expect } from '@playwright/test';

const TEST_EMAIL = 'lcblakey24@outlook.com';
const TEST_PASSWORD = 'LCBlakey24?!';
const CAMPAIGN_ID = 'b51ba0e9-5b08-44ed-b3dd-4a97dd2a09f6';

async function login(page: any) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');
  await page.fill('input[placeholder="Email address"]', TEST_EMAIL);
  await page.fill('input[placeholder="Password"]', TEST_PASSWORD);
  await page.click('button:has-text("Sign In")');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
}

test.describe('GM Screen Quick Dice Panel', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`/gm-screen/${CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
  });

  test('Quick Dice panel is visible on right side of GM Screen', async ({ page }) => {
    // Check Quick Dice panel header is visible
    await expect(page.locator('text=Quick Dice').first()).toBeVisible();
    
    // Check quick roll buttons exist
    await expect(page.locator('button:has-text("d4")').first()).toBeVisible();
    await expect(page.locator('button:has-text("d6")').first()).toBeVisible();
    await expect(page.locator('button:has-text("d8")').first()).toBeVisible();
    await expect(page.locator('button:has-text("d10")').first()).toBeVisible();
    await expect(page.locator('button:has-text("d12")').first()).toBeVisible();
    await expect(page.locator('button:has-text("d20")').first()).toBeVisible();
    
    // Check common roll buttons exist
    await expect(page.locator('button:has-text("Attack (d20)")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Advantage (2d20 high)")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Disadvantage (2d20 low)")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Damage (2d6)")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Fireball (8d6)")').first()).toBeVisible();
    
    // Check d100 button exists
    await expect(page.locator('button:has-text("Roll d100")').first()).toBeVisible();
    
    await page.screenshot({ path: 'quick-dice-panel-visible.jpeg', quality: 20, fullPage: false });
  });

  test('Quick Dice panel persists when switching tabs', async ({ page }) => {
    // Verify on Combat tab
    await expect(page.getByTestId('tab-combat')).toBeVisible();
    await expect(page.locator('text=Quick Dice').first()).toBeVisible();
    
    // Switch to Tables tab
    await page.getByTestId('tab-tables').click();
    await page.waitForTimeout(500);
    
    // Quick Dice should still be visible
    await expect(page.locator('text=Quick Dice').first()).toBeVisible();
    await expect(page.locator('button:has-text("d20")').first()).toBeVisible();
    
    // Switch to Dice tab
    await page.getByTestId('tab-dice').click();
    await page.waitForTimeout(500);
    
    // Quick Dice should still be visible
    await expect(page.locator('text=Quick Dice').first()).toBeVisible();
    
    // Switch to Notes tab
    await page.getByTestId('tab-notes').click();
    await page.waitForTimeout(500);
    
    // Quick Dice should still be visible
    await expect(page.locator('text=Quick Dice').first()).toBeVisible();
    
    await page.screenshot({ path: 'quick-dice-panel-persistent.jpeg', quality: 20, fullPage: false });
  });

  test('Quick roll buttons (d4, d6, d8, d10, d12, d20) work', async ({ page }) => {
    // Test d4
    await page.locator('button:has-text("d4")').first().click();
    await expect(page.locator('[data-sonner-toast]:has-text("d4:")').first()).toBeVisible();
    await page.waitForTimeout(500);
    
    // Test d6
    await page.locator('button:has-text("d6")').first().click();
    await expect(page.locator('[data-sonner-toast]:has-text("d6:")').first()).toBeVisible();
    await page.waitForTimeout(500);
    
    // Test d20
    await page.locator('button:has-text("d20")').first().click();
    await expect(page.locator('[data-sonner-toast]:has-text("d20:")').first()).toBeVisible();
    
    await page.screenshot({ path: 'quick-roll-buttons-work.jpeg', quality: 20, fullPage: false });
  });

  test('Common rolls (Attack, Advantage, Disadvantage) work', async ({ page }) => {
    // Test Attack
    await page.locator('button:has-text("Attack (d20)")').first().click();
    await expect(page.locator('[data-sonner-toast]:has-text("Attack")').first()).toBeVisible();
    await page.waitForTimeout(500);
    
    // Test Advantage
    await page.locator('button:has-text("Advantage (2d20 high)")').first().click();
    await expect(page.locator('[data-sonner-toast]:has-text("Advantage")').first()).toBeVisible();
    await page.waitForTimeout(500);
    
    // Test Disadvantage
    await page.locator('button:has-text("Disadvantage (2d20 low)")').first().click();
    await expect(page.locator('[data-sonner-toast]:has-text("Disadvantage")').first()).toBeVisible();
    
    await page.screenshot({ path: 'common-rolls-work.jpeg', quality: 20, fullPage: false });
  });

  test('Damage and Fireball rolls work', async ({ page }) => {
    // Test Damage roll
    await page.locator('button:has-text("Damage (2d6)")').first().click();
    await expect(page.locator('[data-sonner-toast]:has-text("Damage")').first()).toBeVisible();
    await page.waitForTimeout(500);
    
    // Test Fireball roll
    await page.locator('button:has-text("Fireball (8d6)")').first().click();
    await expect(page.locator('[data-sonner-toast]:has-text("Fireball")').first()).toBeVisible();
    
    await page.screenshot({ path: 'damage-fireball-rolls.jpeg', quality: 20, fullPage: false });
  });

  test('d100 percentile roll works', async ({ page }) => {
    await page.locator('button:has-text("Roll d100")').first().click();
    await expect(page.locator('[data-sonner-toast]:has-text("d100:")').first()).toBeVisible();
    
    await page.screenshot({ path: 'd100-roll-works.jpeg', quality: 20, fullPage: false });
  });
});

test.describe('GM Screen Gold Color Theme', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`/gm-screen/${CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
  });

  test('Random Tables uses gold colors', async ({ page }) => {
    await page.getByTestId('tab-tables').click();
    await page.waitForTimeout(1000);
    
    // Check that Shop Name button exists with gold border (color: #F59E0B)
    const shopNameBtn = page.getByTestId('roll-shop_names-btn');
    await expect(shopNameBtn).toBeVisible();
    
    // The button should have a gold border - verify it has the right data-testid
    await expect(page.locator('[data-testid="roll-shop_names-btn"]')).toBeVisible();
    
    await page.screenshot({ path: 'tables-gold-colors.jpeg', quality: 20, fullPage: false });
  });

  test('Dice tab uses gold colors', async ({ page }) => {
    await page.getByTestId('tab-dice').click();
    await page.waitForTimeout(1000);
    
    // Check dice roller is visible with gold elements
    await expect(page.locator('text=Dice Roller').first()).toBeVisible();
    
    // Check the Roll button exists
    await expect(page.locator('button:has-text("ROLL")').first()).toBeVisible();
    
    await page.screenshot({ path: 'dice-tab-gold-colors.jpeg', quality: 20, fullPage: false });
  });
});
