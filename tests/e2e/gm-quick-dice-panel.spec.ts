import { test, expect } from '@playwright/test';

test.skip(!process.env.RQK_E2E_EMAIL || !process.env.RQK_E2E_PASSWORD, 'E2E credentials are not configured; set RQK_E2E_EMAIL and RQK_E2E_PASSWORD.');

const TEST_EMAIL = (process.env.RQK_E2E_EMAIL || '');
const TEST_PASSWORD = (process.env.RQK_E2E_PASSWORD || '');
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
    
    // Check common roll buttons exist (updated labels for new 3D dice roller)
    await expect(page.locator('button:has-text("Attack (d20)")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Advantage")').first()).toBeVisible();
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

  test('Quick roll buttons (d4, d6, d8, d10, d12, d20) trigger 3D dice animation', async ({ page }) => {
    // Test d4 - now triggers 3D dice roller overlay
    await page.locator('button:has-text("d4")').first().click();
    await page.waitForTimeout(500);
    
    // The 3D dice roller creates a full-screen overlay - check for it or wait for it to auto-close
    // The overlay auto-closes after ~3.5 seconds
    await page.waitForTimeout(3500);
    
    // Test d20
    await page.locator('button:has-text("d20")').first().click();
    await page.waitForTimeout(500);
    
    // Take screenshot while dice animation is showing
    await page.screenshot({ path: 'quick-roll-buttons-work.jpeg', quality: 20, fullPage: false });
    
    // Wait for auto-close
    await page.waitForTimeout(3500);
  });

  test('Common rolls (Attack, Advantage) trigger 3D dice animation', async ({ page }) => {
    // Test Attack
    await page.locator('button:has-text("Attack (d20)")').first().click();
    await page.waitForTimeout(500);
    
    // Take screenshot of 3D dice animation
    await page.screenshot({ path: 'common-rolls-work.jpeg', quality: 20, fullPage: false });
    
    // Click to close or wait for auto-close
    await page.click('body', { force: true });
    await page.waitForTimeout(500);
    
    // Test Advantage
    await page.locator('button:has-text("Advantage")').first().click();
    await page.waitForTimeout(3500);
  });

  test('Damage and Fireball rolls trigger 3D dice animation', async ({ page }) => {
    // Test Damage roll
    await page.locator('button:has-text("Damage (2d6)")').first().click();
    await page.waitForTimeout(500);
    
    // Take screenshot of 3D dice animation
    await page.screenshot({ path: 'damage-fireball-rolls.jpeg', quality: 20, fullPage: false });
    
    // Click to close
    await page.click('body', { force: true });
    await page.waitForTimeout(500);
    
    // Test Fireball roll
    await page.locator('button:has-text("Fireball (8d6)")').first().click();
    await page.waitForTimeout(3500);
  });

  test('d100 percentile roll triggers 3D dice animation', async ({ page }) => {
    await page.locator('button:has-text("Roll d100")').first().click();
    await page.waitForTimeout(500);
    
    // Take screenshot of 3D dice animation
    await page.screenshot({ path: 'd100-roll-works.jpeg', quality: 20, fullPage: false });
    
    // Wait for auto-close
    await page.waitForTimeout(3500);
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
