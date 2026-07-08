import { test, expect } from '@playwright/test';
import { dismissToasts, removeBlockingBadges } from '../fixtures/helpers';

/**
 * Tests for the global Rookie Quest Keeper dice roller:
 * - Floating dice button stays anchored bottom-left
 * - Dice tray opens bottom-left
 * - Rolls launch the cinematic sunset d20 overlay
 * - Users can reveal/close the cinematic result without waiting
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

async function openDiceRoller(page: any) {
  await page.goto('/home', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.getByTestId('dice-roller-toggle').click();
  await page.waitForTimeout(500);
}

test.describe('Global cinematic dice roller', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await registerTestUser(page);
    await removeBlockingBadges(page);
  });

  test('Dice Roller button is positioned at bottom-LEFT corner', async ({ page }) => {
    await page.goto('/home', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const diceToggle = page.getByTestId('dice-roller-toggle');
    await expect(diceToggle).toBeVisible();

    const box = await diceToggle.boundingBox();
    expect(box).not.toBeNull();

    const viewportSize = page.viewportSize();
    expect(box!.x).toBeLessThan(100);

    const bottomDistance = viewportSize!.height - (box!.y + box!.height);
    expect(bottomDistance).toBeLessThan(100);
  });

  test('Dice Roller panel opens at bottom-LEFT', async ({ page }) => {
    await openDiceRoller(page);

    const panel = page.getByTestId('dice-roller-panel');
    await expect(panel).toBeVisible();

    const box = await panel.boundingBox();
    expect(box).not.toBeNull();

    const viewportSize = page.viewportSize();
    expect(box!.x).toBeLessThan(100);

    const bottomDistance = viewportSize!.height - (box!.y + box!.height);
    expect(bottomDistance).toBeLessThan(100);
  });

  test('Dice Roller launches the cinematic d20 overlay and records the result', async ({ page }) => {
    await openDiceRoller(page);

    await expect(page.getByText('DICE ROLLER')).toBeVisible();
    await expect(page.getByTestId('roll-d4-btn')).toBeVisible();
    await expect(page.getByTestId('roll-d6-btn')).toBeVisible();
    await expect(page.getByTestId('roll-d8-btn')).toBeVisible();
    await expect(page.getByTestId('roll-d10-btn')).toBeVisible();
    await expect(page.getByTestId('roll-d12-btn')).toBeVisible();
    await expect(page.getByTestId('roll-d20-btn')).toBeVisible();
    await expect(page.getByTestId('roll-d100-btn')).toBeVisible();
    await expect(page.getByTestId('roll-advantage-btn')).toBeVisible();
    await expect(page.getByTestId('roll-disadvantage-btn')).toBeVisible();

    await page.getByTestId('roll-d20-btn').click();

    const overlay = page.getByTestId('cinematic-dice-overlay');
    await expect(overlay).toBeVisible();
    await expect(page.getByTestId('cinematic-d20')).toBeVisible();
    await expect(page.getByTestId('cinematic-dice-status')).toContainText('Rolling dice');
    await expect(page.getByTestId('cinematic-dice-reveal-now')).toBeVisible();

    await page.getByTestId('cinematic-dice-reveal-now').click();

    await expect(overlay).toHaveClass(/is-revealed/);
    await expect(page.getByTestId('cinematic-dice-status')).toContainText(/Roll complete|Critical success|Critical fail/);
    await expect(page.getByTestId('cinematic-dice-total')).not.toContainText('—');
    await expect(page.getByTestId('cinematic-dice-number')).not.toContainText('—');

    const rollResult = page.getByTestId('roll-result').first();
    await expect(rollResult).toBeVisible();
    await expect(page.getByText('1d20')).toBeVisible();
  });

  test('Cinematic dice overlay supports keyboard reveal and close', async ({ page }) => {
    await openDiceRoller(page);

    await page.getByTestId('roll-d20-btn').click();
    const overlay = page.getByTestId('cinematic-dice-overlay');
    await expect(overlay).toBeVisible();

    await page.keyboard.press('Enter');
    await expect(overlay).toHaveClass(/is-revealed/);
    await expect(page.getByTestId('cinematic-dice-total')).not.toContainText('—');

    await page.keyboard.press('Escape');
    await expect(overlay).not.toBeVisible({ timeout: 2000 });
  });

  test('Dice Roller can be closed', async ({ page }) => {
    await openDiceRoller(page);

    const panel = page.getByTestId('dice-roller-panel');
    await expect(panel).toBeVisible();

    await page.getByTestId('dice-roller-close').click();
    await page.waitForTimeout(500);

    await expect(panel).not.toBeVisible();
    await expect(page.getByTestId('dice-roller-toggle')).toBeVisible();
  });

  test('Custom dice roll input works with the cinematic overlay', async ({ page }) => {
    await openDiceRoller(page);

    const customInput = page.getByTestId('custom-dice-input');
    await customInput.fill('2d6+3');

    await page.getByTestId('custom-roll-btn').click();
    const overlay = page.getByTestId('cinematic-dice-overlay');
    await expect(overlay).toBeVisible();

    await page.getByTestId('cinematic-dice-reveal-now').click();
    await expect(overlay).toHaveClass(/is-revealed/);

    await expect(page.getByText('2d6+3')).toBeVisible();
  });
});
