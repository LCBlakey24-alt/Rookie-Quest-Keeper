import { test, expect } from '@playwright/test';
import { dismissToasts, removeBlockingBadges } from '../fixtures/helpers';

/**
 * Tests for the global Rookie Quest Keeper dice roller:
 * - Floating dice button stays anchored bottom-left
 * - Dice tray opens inside the viewport
 * - Every roll uses the compact flat result overlay
 * - Multi-dice/custom rolls remain visible without a cinematic renderer
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
  await page.waitForTimeout(300);
}

test.describe('Global flat dice roller', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await registerTestUser(page);
    await removeBlockingBadges(page);
  });

  test('Dice Roller button is positioned at bottom-left', async ({ page }) => {
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

  test('Dice Roller panel stays fully inside the viewport', async ({ page }) => {
    await openDiceRoller(page);

    const panel = page.getByTestId('dice-roller-panel');
    await expect(panel).toBeVisible();
    await expect(page.getByTestId('dice-render-mode-selector')).toHaveCount(0);

    const box = await panel.boundingBox();
    expect(box).not.toBeNull();
    const viewportSize = page.viewportSize();

    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewportSize!.width);
    expect(box!.y + box!.height).toBeLessThanOrEqual(viewportSize!.height);
  });

  test('quick d20 roll uses the flat result overlay and records history', async ({ page }) => {
    await openDiceRoller(page);

    await expect(page.getByText('DICE ROLLER')).toBeVisible();
    await expect(page.getByTestId('roll-d4-btn')).toBeVisible();
    await expect(page.getByTestId('roll-d6-btn')).toBeVisible();
    await expect(page.getByTestId('roll-d8-btn')).toBeVisible();
    await expect(page.getByTestId('roll-d10-btn')).toBeVisible();
    await expect(page.getByTestId('roll-d12-btn')).toBeVisible();
    await expect(page.getByTestId('roll-d20-btn')).toBeVisible();
    await expect(page.getByTestId('roll-d100-btn')).toBeVisible();

    await page.getByTestId('roll-d20-btn').click();

    const overlay = page.getByTestId('flat-dice-overlay');
    await expect(overlay).toBeVisible();
    await expect(page.getByTestId('cinematic-dice-overlay')).toHaveCount(0);

    await page.getByRole('button', { name: 'Reveal now' }).click();
    await expect(overlay).toHaveClass(/is-revealed/);
    await expect(page.getByTestId('flat-dice-total')).not.toContainText('—');

    const rollResult = page.getByTestId('roll-result').first();
    await expect(rollResult).toBeVisible();
  });

  test('custom multi-dice roll stays flat and shows individual dice', async ({ page }) => {
    await openDiceRoller(page);

    const customInput = page.getByTestId('custom-dice-input');
    await customInput.fill('2d6+3');
    await page.getByTestId('custom-roll-btn').click();

    const overlay = page.getByTestId('flat-dice-overlay');
    await expect(overlay).toBeVisible();
    await expect(page.getByTestId('cinematic-dice-overlay')).toHaveCount(0);

    await page.getByRole('button', { name: 'Reveal now' }).click();
    await expect(overlay).toHaveClass(/is-revealed/);
    await expect(page.getByText('2d6+3')).toBeVisible();
    await expect(overlay.locator('.rq-flat-roll__dice > span')).toHaveCount(2);
  });

  test('flat dice overlay supports keyboard reveal and close', async ({ page }) => {
    await openDiceRoller(page);

    await page.getByTestId('roll-d20-btn').click();
    const overlay = page.getByTestId('flat-dice-overlay');
    await expect(overlay).toBeVisible();

    await page.keyboard.press('Enter');
    await expect(overlay).toHaveClass(/is-revealed/);
    await expect(page.getByTestId('flat-dice-total')).not.toContainText('—');

    await page.keyboard.press('Escape');
    await expect(overlay).not.toBeVisible({ timeout: 2000 });
  });

  test('Dice Roller panel can be closed', async ({ page }) => {
    await openDiceRoller(page);

    const panel = page.getByTestId('dice-roller-panel');
    await expect(panel).toBeVisible();
    await page.getByTestId('dice-roller-close').click();
    await expect(panel).not.toBeVisible();
    await expect(page.getByTestId('dice-roller-toggle')).toBeVisible();
  });
});
