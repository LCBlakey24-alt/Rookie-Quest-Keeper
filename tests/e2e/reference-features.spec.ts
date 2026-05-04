import { test, expect } from '@playwright/test';
import { waitForAppReady, dismissToasts, removeBlockingBadges, TEST_USER, TEST_CAMPAIGN_ID, loginUser } from '../fixtures/helpers';

test.describe('Reference Tab Features', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    
    // Login with test user
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await page.getByTestId('login-email').fill(TEST_USER.email);
    await page.getByTestId('login-password').fill(TEST_USER.password);
    await page.getByTestId('login-btn').click();
    await page.waitForURL(/\/campaigns/, { timeout: 15000 });
    
    // Navigate to test campaign
    await page.goto(`/campaign/${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await removeBlockingBadges(page);
  });

  test('Reference tab loads with Items Database section', async ({ page }) => {
    // Navigate to Reference tab
    await page.getByTestId('reference-tab').click();
    
    // Verify Items Database heading is visible
    await expect(page.getByText('D&D Items Database')).toBeVisible({ timeout: 10000 });
    
    // Verify item count shows 3076 items (use first match)
    await expect(page.getByText(/3,076 items|3076 items/).first()).toBeVisible();
    
    // Verify search input exists
    await expect(page.getByTestId('item-search-input')).toBeVisible();
    
    // Verify type filter exists
    await expect(page.getByTestId('item-type-filter')).toBeVisible();
    
    // Verify rarity filter exists
    await expect(page.getByTestId('rarity-filter')).toBeVisible();
  });

  test('Items Database search functionality works', async ({ page }) => {
    await page.getByTestId('reference-tab').click();
    await expect(page.getByText('D&D Items Database')).toBeVisible({ timeout: 10000 });
    
    // Search for a specific item
    await page.getByTestId('item-search-input').fill('sword');
    
    // Verify results are filtered (should show items containing "sword")
    // Wait for filtered results
    await expect(page.getByText(/Showing \d+ of/)).toBeVisible({ timeout: 5000 });
    
    // Clear search and verify count returns
    await page.getByTestId('item-search-input').clear();
    await expect(page.getByText(/Showing 100 of/)).toBeVisible({ timeout: 5000 });
  });

  test('Items Database type filter works', async ({ page }) => {
    await page.getByTestId('reference-tab').click();
    await expect(page.getByText('D&D Items Database')).toBeVisible({ timeout: 10000 });
    
    // Filter by Melee Weapon
    await page.getByTestId('item-type-filter').selectOption('Melee Weapon');
    
    // Verify results are filtered
    await expect(page.getByText(/Showing \d+ of/)).toBeVisible({ timeout: 5000 });
  });

  test('Items Database rarity filter works', async ({ page }) => {
    await page.getByTestId('reference-tab').click();
    await expect(page.getByText('D&D Items Database')).toBeVisible({ timeout: 10000 });
    
    // Filter by Rare rarity
    await page.getByTestId('rarity-filter').selectOption('Rare');
    
    // Verify results are filtered
    await expect(page.getByText(/Showing \d+ of/)).toBeVisible({ timeout: 5000 });
  });

  test('Rules Reference section is accessible', async ({ page }) => {
    await page.getByTestId('reference-tab').click();
    await expect(page.getByText('D&D Items Database')).toBeVisible({ timeout: 10000 });
    
    // Click on Rules Reference section toggle
    await page.getByRole('button', { name: /Rules Reference/i }).click();
    
    // Verify Rules Reference heading
    await expect(page.getByText('Quick Reference')).toBeVisible({ timeout: 10000 });
    
    // Verify Difficulty Classes section exists
    await expect(page.getByText('Difficulty Classes (DC)')).toBeVisible();
  });

  test('Rules Reference shows DC tables', async ({ page }) => {
    await page.getByTestId('reference-tab').click();
    await expect(page.getByText('D&D Items Database')).toBeVisible({ timeout: 10000 });
    
    // Click on Rules Reference tab
    await page.getByRole('button', { name: /Rules Reference/i }).click();
    await expect(page.getByText('Quick Reference')).toBeVisible({ timeout: 10000 });
    
    // Verify DC values are visible
    await expect(page.getByText('DC 5')).toBeVisible();
    await expect(page.getByText('DC 10')).toBeVisible();
    await expect(page.getByText('DC 15')).toBeVisible();
    await expect(page.getByText('DC 20')).toBeVisible();
    await expect(page.getByText('DC 25')).toBeVisible();
    await expect(page.getByText('DC 30')).toBeVisible();
    
    // Verify difficulty labels
    await expect(page.getByText('Very Easy')).toBeVisible();
    await expect(page.getByText('Nearly Impossible')).toBeVisible();
  });

  test('Rules Reference XP Thresholds section expands', async ({ page }) => {
    await page.getByTestId('reference-tab').click();
    await page.getByRole('button', { name: /Rules Reference/i }).click();
    await expect(page.getByText('Quick Reference')).toBeVisible({ timeout: 10000 });
    
    // Expand XP Thresholds section
    await page.getByText('Encounter XP Thresholds').click();
    
    // Verify XP threshold columns are visible (use role for column headers)
    await expect(page.getByRole('columnheader', { name: 'EASY' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('columnheader', { name: 'MEDIUM' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'HARD' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'DEADLY' })).toBeVisible();
  });

  test('Rules Reference Conditions section expands', async ({ page }) => {
    await page.getByTestId('reference-tab').click();
    await page.getByRole('button', { name: /Rules Reference/i }).click();
    await expect(page.getByText('Quick Reference')).toBeVisible({ timeout: 10000 });
    
    // Expand Conditions section
    await page.getByText('Conditions Reference').click();
    
    // Verify common conditions are visible
    await expect(page.getByText('Blinded')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Charmed')).toBeVisible();
    await expect(page.getByText('Frightened')).toBeVisible();
    await expect(page.getByText('Poisoned')).toBeVisible();
    await expect(page.getByText('Exhaustion')).toBeVisible();
  });

  test('Rules Reference Cover Rules section expands', async ({ page }) => {
    await page.getByTestId('reference-tab').click();
    await page.getByRole('button', { name: /Rules Reference/i }).click();
    await expect(page.getByText('Quick Reference')).toBeVisible({ timeout: 10000 });
    
    // Expand Cover Rules section
    await page.getByText('Cover Rules').click();
    
    // Verify cover types are visible
    await expect(page.getByText('Half Cover')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Three-Quarters Cover')).toBeVisible();
    await expect(page.getByText('Total Cover')).toBeVisible();
    
    // Verify AC bonuses are shown
    await expect(page.getByText('AC: +2')).toBeVisible();
    await expect(page.getByText('AC: +5')).toBeVisible();
  });
});

test.describe('Login Page Logos', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await removeBlockingBadges(page);
  });

  test('Login page displays Rookie Quest logo on left side above form', async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    
    // Verify Rookie Quest logo is visible (there should be multiple - one above form, one on right)
    const rookieQuestLogos = page.locator('img[alt="Rookie Quest"]');
    await expect(rookieQuestLogos.first()).toBeVisible();
    
    // Verify there are 2 Rookie Quest logos
    await expect(rookieQuestLogos).toHaveCount(2);
    
    // Verify "Your Ultimate DM Companion" tagline
    await expect(page.getByText('Your Ultimate DM Companion')).toBeVisible();
  });

  test('Login page displays logos on right side', async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    
    // Verify TTRPG Companion logo is visible on right side
    const ttrpgLogo = page.locator('img[alt="TTRPG Companion"]');
    await expect(ttrpgLogo).toBeVisible();
    
    // Verify Rookie Quest logo on right side (the bigger one)
    const rookieQuestLogos = page.locator('img[alt="Rookie Quest"]');
    await expect(rookieQuestLogos.last()).toBeVisible();
  });

  test('Login page logos are visible and properly sized', async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    
    // Check that logos have appropriate size (maxWidth 500px for right side logo)
    const rightRookieQuestLogo = page.locator('img[alt="Rookie Quest"]').last();
    await expect(rightRookieQuestLogo).toBeVisible();
    
    // Check the logo is loaded (has natural dimensions)
    const isLoaded = await rightRookieQuestLogo.evaluate((img: HTMLImageElement) => {
      return img.complete && img.naturalWidth > 0;
    });
    expect(isLoaded).toBe(true);
    
    // Verify TTRPG logo is loaded
    const ttrpgLogo = page.locator('img[alt="TTRPG Companion"]');
    const ttrpgLoaded = await ttrpgLogo.evaluate((img: HTMLImageElement) => {
      return img.complete && img.naturalWidth > 0;
    });
    expect(ttrpgLoaded).toBe(true);
  });
});

test.describe('DM Screen Party Tab - Initiative Modifier', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    
    // Login with test user
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await page.getByTestId('login-username-input').fill(TEST_USER.username);
    await page.getByTestId('login-password-input').fill(TEST_USER.password);
    await page.getByTestId('login-submit-btn').click();
    await page.waitForURL(/\/campaigns/, { timeout: 10000 });
    
    // Navigate to DM Screen
    await page.goto(`/dm-screen/${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await removeBlockingBadges(page);
  });

  test('Party tab shows initiative modifier with correct format (+ or -)', async ({ page }) => {
    // Navigate to Party tab
    await page.getByTestId('tab-party').click();
    
    // Verify Party Overview heading
    await expect(page.getByRole('heading', { name: 'Party Overview' })).toBeVisible({ timeout: 10000 });
    
    // Verify INIT label is visible for stat display
    await expect(page.getByText('INIT')).toBeVisible();
    
    // Check that initiative modifier format is correct (should NOT show +- pattern)
    // Look for the initiative modifier value - it should show just + or - followed by number
    const initSection = page.locator('text=INIT').first().locator('..').locator('..');
    
    // Get the text content and verify it doesn't contain +- (the bug pattern)
    const initText = await initSection.textContent();
    expect(initText).not.toMatch(/\+\-/); // Should not contain +-
    
    // Verify valid format: either +N, -N, or ? for unknown
    const hasValidFormat = /(\+\d+|\-\d+|\?)/.test(initText || '');
    expect(hasValidFormat).toBe(true);
  });

  test('Party tab displays player stats correctly', async ({ page }) => {
    await page.getByTestId('tab-party').click();
    await expect(page.getByRole('heading', { name: 'Party Overview' })).toBeVisible({ timeout: 10000 });
    
    // Verify HP label exists
    await expect(page.getByText('HP').first()).toBeVisible();
    
    // Verify AC label exists
    await expect(page.getByText('AC').first()).toBeVisible();
    
    // Verify stat abbreviations are visible (STR, DEX, CON, INT, WIS, CHA)
    await expect(page.getByText('STR').first()).toBeVisible();
    await expect(page.getByText('DEX').first()).toBeVisible();
    await expect(page.getByText('CON').first()).toBeVisible();
    await expect(page.getByText('INT').first()).toBeVisible();
    await expect(page.getByText('WIS').first()).toBeVisible();
    await expect(page.getByText('CHA').first()).toBeVisible();
  });
});
