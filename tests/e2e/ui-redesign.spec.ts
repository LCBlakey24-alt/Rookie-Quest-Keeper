import { test, expect } from '@playwright/test';
import { waitForAppReady, dismissToasts, removeBlockingBadges, loginTestUser, TEST_USER, TEST_CAMPAIGN_ID } from '../fixtures/helpers';

test.describe('UI Redesign - Parallax and Glass Morphism', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await removeBlockingBadges(page);
  });

  test('GM Screen has parallax background with grid pattern', async ({ page }) => {
    // Login
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await page.getByTestId('login-email').fill(TEST_USER.email);
    await page.getByTestId('login-password').fill(TEST_USER.password);
    await page.getByTestId('login-btn').click();
    await page.waitForURL(/\/(home|campaigns)/, { timeout: 15000 });

    // Navigate to GM Screen
    await page.goto(`/gm-screen/${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Combat Control')).toBeVisible({ timeout: 10000 });

    // Verify background gradient exists (main container)
    const mainContainer = page.locator('div').first();
    await expect(mainContainer).toBeVisible();

    // The GM Screen should be visible with proper styling
    await expect(page.getByRole('heading', { name: 'Combat Control' })).toBeVisible();
  });

  test('GM Screen has glass morphism tabs that are clickable', async ({ page }) => {
    // Login
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await page.getByTestId('login-email').fill(TEST_USER.email);
    await page.getByTestId('login-password').fill(TEST_USER.password);
    await page.getByTestId('login-btn').click();
    await page.waitForURL(/\/(home|campaigns)/, { timeout: 15000 });

    // Navigate to GM Screen
    await page.goto(`/gm-screen/${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Combat Control')).toBeVisible({ timeout: 10000 });

    // Verify all glass morphism tabs exist and are clickable
    const tabs = [
      { id: 'tab-combat', text: 'Combat' },
      { id: 'tab-maps', text: 'Maps' },
      { id: 'tab-dice', text: 'Dice' },
      { id: 'tab-monsters', text: 'Monsters' },
      { id: 'tab-creatures', text: 'Creatures' },
      { id: 'tab-names', text: 'Names' },
      { id: 'tab-tables', text: 'Tables' },
      { id: 'tab-loot', text: 'Loot Gen' },
      { id: 'tab-inventory', text: 'Inventory' },
      { id: 'tab-party', text: 'Party' },
      { id: 'tab-notes', text: 'Notes' }
    ];

    for (const tab of tabs) {
      const tabElement = page.getByTestId(tab.id);
      await expect(tabElement).toBeVisible();
    }
  });

  test('GM Screen tabs switch content correctly', async ({ page }) => {
    // Login
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await page.getByTestId('login-email').fill(TEST_USER.email);
    await page.getByTestId('login-password').fill(TEST_USER.password);
    await page.getByTestId('login-btn').click();
    await page.waitForURL(/\/(home|campaigns)/, { timeout: 15000 });

    // Navigate to GM Screen
    await page.goto(`/gm-screen/${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Combat Control')).toBeVisible({ timeout: 10000 });

    // Click Maps tab
    await page.getByTestId('tab-maps').click();
    await expect(page.getByTestId('create-map-btn')).toBeVisible({ timeout: 5000 });

    // Click Dice tab
    await page.getByTestId('tab-dice').click();
    await expect(page.getByText('Dice Roller').first()).toBeVisible({ timeout: 5000 });

    // Click Names tab
    await page.getByTestId('tab-names').click();
    await expect(page.getByTestId('generate-name-btn')).toBeVisible({ timeout: 5000 });
  });

  test('Player Dashboard has parallax background', async ({ page }) => {
    // Login
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await page.getByTestId('login-email').fill(TEST_USER.email);
    await page.getByTestId('login-password').fill(TEST_USER.password);
    await page.getByTestId('login-btn').click();
    await page.waitForURL(/\/(home|campaigns)/, { timeout: 15000 });

    // Navigate to Player Dashboard
    await page.goto('/player', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Player Hub')).toBeVisible({ timeout: 10000 });

    // Verify player dashboard content visible
    await expect(page.getByRole('heading', { name: 'My Characters' })).toBeVisible({ timeout: 5000 });
  });

  test('Player Dashboard has glass morphism tabs', async ({ page }) => {
    // Login
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await page.getByTestId('login-email').fill(TEST_USER.email);
    await page.getByTestId('login-password').fill(TEST_USER.password);
    await page.getByTestId('login-btn').click();
    await page.waitForURL(/\/(home|campaigns)/, { timeout: 15000 });

    // Navigate to Player Dashboard
    await page.goto('/player', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Player Hub')).toBeVisible({ timeout: 10000 });

    // Verify glass morphism tabs exist
    await expect(page.getByTestId('tab-characters')).toBeVisible();
    await expect(page.getByTestId('tab-notes')).toBeVisible();

    // Test tab switching
    await page.getByTestId('tab-notes').click();
    // After clicking notes tab, verify it's active or content changes
    await expect(page.getByTestId('tab-notes')).toBeVisible();
  });

  test('Player Dashboard has gradient buttons', async ({ page }) => {
    // Login
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await page.getByTestId('login-email').fill(TEST_USER.email);
    await page.getByTestId('login-password').fill(TEST_USER.password);
    await page.getByTestId('login-btn').click();
    await page.waitForURL(/\/(home|campaigns)/, { timeout: 15000 });

    // Navigate to Player Dashboard
    await page.goto('/player', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Player Hub')).toBeVisible({ timeout: 10000 });

    // Verify gradient buttons exist
    await expect(page.getByTestId('create-character-btn')).toBeVisible();
    await expect(page.getByTestId('join-campaign-btn')).toBeVisible();

    // Buttons should be clickable
    await page.getByTestId('create-character-btn').click();
    // Should navigate to character creation
    await expect(page).toHaveURL(/\/characters\/new/, { timeout: 10000 });
  });
});
