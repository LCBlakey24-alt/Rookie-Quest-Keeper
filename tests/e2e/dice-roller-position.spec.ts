import { test, expect } from '@playwright/test';
import { waitForAppReady, dismissToasts, removeBlockingBadges } from '../fixtures/helpers';

/**
 * Tests for Dice Roller Position Fix:
 * - Dice Roller button should be positioned at bottom-LEFT corner
 * - Dice Roller panel should open at bottom-LEFT
 */

async function registerTestUser(page: any) {
  await page.goto('/auth', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('domcontentloaded');
  
  await page.click('button:has-text("CREATE ACCOUNT")');
  await page.waitForTimeout(500);
  
  const timestamp = Date.now();
  const emailInput = page.locator('input[placeholder*="email" i]');
  const displayNameInput = page.locator('input[placeholder*="display name" i]');
  const passwordInput = page.locator('input[placeholder*="password" i]');
  
  await emailInput.fill(`test${timestamp}@example.com`);
  await displayNameInput.fill(`testuser${timestamp}`);
  await passwordInput.fill('testpass123');
  await page.click('button:has-text("CREATE ACCOUNT")');
  await page.waitForTimeout(3000);
}

test.describe('Dice Roller Position Fix', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await registerTestUser(page);
  });

  test('Dice Roller button is positioned at bottom-LEFT corner', async ({ page }) => {
    // Navigate to a page where dice roller is visible
    await page.goto('/characters/new', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    // Verify dice roller toggle button is visible
    const diceToggle = page.getByTestId('dice-roller-toggle');
    await expect(diceToggle).toBeVisible();
    
    // Verify position - should be in bottom-LEFT (left: 24px, bottom: 24px)
    const box = await diceToggle.boundingBox();
    expect(box).not.toBeNull();
    
    // Get viewport size
    const viewportSize = page.viewportSize();
    
    // Button should be near the left edge (within 100px from left)
    expect(box!.x).toBeLessThan(100);
    
    // Button should be near the bottom (within 100px from bottom)
    const bottomDistance = viewportSize!.height - (box!.y + box!.height);
    expect(bottomDistance).toBeLessThan(100);
  });

  test('Dice Roller panel opens at bottom-LEFT', async ({ page }) => {
    await page.goto('/characters/new', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    // Click to open dice roller
    await page.getByTestId('dice-roller-toggle').click();
    await page.waitForTimeout(500);
    
    // Verify panel is visible
    const panel = page.getByTestId('dice-roller-panel');
    await expect(panel).toBeVisible();
    
    // Verify panel position - should be in bottom-LEFT
    const box = await panel.boundingBox();
    expect(box).not.toBeNull();
    
    const viewportSize = page.viewportSize();
    
    // Panel should be near the left edge
    expect(box!.x).toBeLessThan(100);
    
    // Panel should be near the bottom
    const bottomDistance = viewportSize!.height - (box!.y + box!.height);
    expect(bottomDistance).toBeLessThan(100);
  });

  test('Dice Roller functionality works correctly', async ({ page }) => {
    await page.goto('/characters/new', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    // Open dice roller
    await page.getByTestId('dice-roller-toggle').click();
    await page.waitForTimeout(500);
    
    // Verify panel header
    await expect(page.getByText('DICE ROLLER')).toBeVisible();
    
    // Verify dice buttons are present
    await expect(page.getByTestId('roll-d4-btn')).toBeVisible();
    await expect(page.getByTestId('roll-d6-btn')).toBeVisible();
    await expect(page.getByTestId('roll-d8-btn')).toBeVisible();
    await expect(page.getByTestId('roll-d10-btn')).toBeVisible();
    await expect(page.getByTestId('roll-d12-btn')).toBeVisible();
    await expect(page.getByTestId('roll-d20-btn')).toBeVisible();
    await expect(page.getByTestId('roll-d100-btn')).toBeVisible();
    await expect(page.getByTestId('roll-advantage-btn')).toBeVisible();
    
    // Roll a d20
    await page.getByTestId('roll-d20-btn').click();
    await page.waitForTimeout(500);
    
    // Verify roll result appears
    const rollResult = page.getByTestId('roll-result').first();
    await expect(rollResult).toBeVisible();
    
    // Verify roll shows d20 notation
    await expect(page.getByText('1d20')).toBeVisible();
  });

  test('Dice Roller can be closed', async ({ page }) => {
    await page.goto('/characters/new', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    // Open dice roller
    await page.getByTestId('dice-roller-toggle').click();
    await page.waitForTimeout(500);
    
    // Verify panel is visible
    const panel = page.getByTestId('dice-roller-panel');
    await expect(panel).toBeVisible();
    
    // Close dice roller
    await page.getByTestId('dice-roller-close').click();
    await page.waitForTimeout(500);
    
    // Verify panel is hidden
    await expect(panel).not.toBeVisible();
    
    // Verify toggle button is still visible
    await expect(page.getByTestId('dice-roller-toggle')).toBeVisible();
  });

  test('Custom dice roll input works', async ({ page }) => {
    await page.goto('/characters/new', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    // Open dice roller
    await page.getByTestId('dice-roller-toggle').click();
    await page.waitForTimeout(500);
    
    // Enter custom roll
    const customInput = page.getByTestId('custom-dice-input');
    await customInput.fill('2d6+3');
    
    // Click roll button
    await page.getByTestId('custom-roll-btn').click();
    await page.waitForTimeout(500);
    
    // Verify result shows the custom roll notation
    await expect(page.getByText('2d6+3')).toBeVisible();
  });
});
