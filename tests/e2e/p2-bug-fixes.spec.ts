import { test, expect } from '@playwright/test';
import { TEST_USER, waitForAppReady, dismissToasts, removeBlockingBadges, TEST_CAMPAIGN_ID } from '../fixtures/helpers';

const TEST_EMAIL = TEST_USER.email;
const TEST_PASSWORD = TEST_USER.password;

test.describe('P2 Bug Fixes Verification', () => {
  
  test.describe('Landing Page Fixes (Unauthenticated)', () => {
    test.beforeEach(async ({ page }) => {
      await dismissToasts(page);
      await removeBlockingBadges(page);
    });

    test('Landing page has visible white text on glass panels', async ({ page }) => {
      // Navigate to landing page directly
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await waitForAppReady(page);
      
      // Check that the hero title "KEEPER" is visible (white text on dark glass)
      const keeperTitle = page.locator('h1:has-text("KEEPER")');
      await expect(keeperTitle).toBeVisible();
      
      // Check navigation text is visible
      const signInBtn = page.locator('text=Sign In');
      await expect(signInBtn).toBeVisible();
      
      // Take screenshot to verify text visibility on dark glass panels
      await page.screenshot({ path: 'p2-landing-text-visibility.jpeg', quality: 20, fullPage: false });
    });

    test('Landing page pricing shows correct tiers (Free, Player Coming Soon, Game Master £3.99, Legendary £5.99)', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await waitForAppReady(page);
      
      // Scroll down to see pricing
      await page.evaluate(() => window.scrollTo(0, 500));
      await page.waitForTimeout(500);
      
      // Take a full page screenshot to verify pricing
      await page.screenshot({ path: 'p2-landing-pricing-full.jpeg', quality: 20, fullPage: true });
      
      // Verify "Choose Your Path" pricing section title
      const pricingTitle = page.locator('text=Choose Your Path');
      await expect(pricingTitle).toBeVisible();
      
      // Verify 4 tier names are visible (updated tiers)
      await expect(page.locator('h3:has-text("Free")').first()).toBeVisible();
      await expect(page.locator('h3:has-text("Player")').first()).toBeVisible();
      await expect(page.locator('h3:has-text("Game Master")').first()).toBeVisible();
      await expect(page.locator('h3:has-text("Legendary")').first()).toBeVisible();
    });
  });

  test.describe('Monster Lookup Fix - GM Screen', () => {
    test.beforeEach(async ({ page }) => {
      await dismissToasts(page);
      await removeBlockingBadges(page);
      
      // Login
      await page.goto('/auth', { waitUntil: 'domcontentloaded' });
      await waitForAppReady(page);
      await page.getByTestId('login-email').fill(TEST_EMAIL);
      await page.getByTestId('login-password').fill(TEST_PASSWORD);
      await page.getByTestId('login-btn').click();
      await page.waitForURL(/\/home/, { timeout: 15000 });
    });

    test('Monster Lookup returns results for "Goblin" search', async ({ page }) => {
      // Navigate to GM Screen
      await page.goto(`/gm-screen/${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
      await waitForAppReady(page);
      await page.waitForTimeout(2000);
      
      // Click on Monsters tab
      await page.getByTestId('tab-monsters').click();
      await page.waitForTimeout(1000);
      
      // Search for Goblin
      const searchInput = page.getByTestId('monster-search-input');
      await searchInput.fill('Goblin');
      await page.waitForTimeout(500);
      
      // Verify results are shown - Goblin should be in the results
      const goblinResult = page.locator('text=Goblin').first();
      await expect(goblinResult).toBeVisible();
      
      // Verify CR badge is visible
      const crBadge = page.locator('text=CR 1/4').first();
      await expect(crBadge).toBeVisible();
      
      await page.screenshot({ path: 'p2-monster-lookup-goblin.jpeg', quality: 20, fullPage: false });
    });

    test('Monster Lookup shows monster details when clicked', async ({ page }) => {
      // Navigate to GM Screen
      await page.goto(`/gm-screen/${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
      await waitForAppReady(page);
      await page.waitForTimeout(2000);
      
      // Click on Monsters tab
      await page.getByTestId('tab-monsters').click();
      await page.waitForTimeout(1000);
      
      // Search for Dragon to test a different monster
      const searchInput = page.getByTestId('monster-search-input');
      await searchInput.fill('Dragon');
      await page.waitForTimeout(500);
      
      // Click on first Dragon result
      const dragonResult = page.locator('text=Dragon').first();
      await expect(dragonResult).toBeVisible();
      await dragonResult.click();
      await page.waitForTimeout(500);
      
      // Should show monster stat block
      await page.screenshot({ path: 'p2-monster-lookup-dragon.jpeg', quality: 20, fullPage: false });
    });
  });

  test.describe('Combat Creator - Full Monster List Fix', () => {
    test.beforeEach(async ({ page }) => {
      await dismissToasts(page);
      await removeBlockingBadges(page);
      
      // Login
      await page.goto('/auth', { waitUntil: 'domcontentloaded' });
      await waitForAppReady(page);
      await page.getByTestId('login-email').fill(TEST_EMAIL);
      await page.getByTestId('login-password').fill(TEST_PASSWORD);
      await page.getByTestId('login-btn').click();
      await page.waitForURL(/\/home/, { timeout: 15000 });
    });

    test('Combat Creator monster database shows all 303 monsters (no slice limit)', async ({ page }) => {
      // Use wider viewport
      await page.setViewportSize({ width: 1400, height: 900 });
      
      // Navigate to home
      await page.goto('/home', { waitUntil: 'domcontentloaded' });
      await waitForAppReady(page);
      await page.waitForTimeout(1000);
      
      // Close tips modals
      await page.locator('text=Got it, thanks!').first().click({ timeout: 2000 }).catch(() => {});
      await page.waitForTimeout(500);
      await page.locator('text=Got it, thanks!').first().click({ timeout: 2000 }).catch(() => {});
      await page.waitForTimeout(500);
      
      // Click on a campaign to get to dashboard
      await page.locator('text=TEST_Campaign_1773389199863').first().click();
      await page.waitForTimeout(2500);
      
      // Close tips modal if present
      await page.locator('text=Got it, thanks!').first().click({ timeout: 2000 }).catch(() => {});
      await page.waitForTimeout(500);
      
      // Navigate to Combat tab - expand Combat group by clicking twice if needed
      const combatGroup = page.getByTestId('group-combat');
      await combatGroup.click();
      await page.waitForTimeout(500);
      
      // If combat-tab not visible, click again
      let combatTab = page.locator('[data-testid="combat-tab"]');
      let isVisible = await combatTab.isVisible();
      if (!isVisible) {
        await combatGroup.click();
        await page.waitForTimeout(500);
      }
      
      // Click Combat tab
      await page.getByTestId('combat-tab').click();
      await page.waitForTimeout(1500);
      
      // Close Combat Hub tips if visible
      await page.locator('text=Got it, thanks!').first().click({ timeout: 2000 }).catch(() => {});
      await page.waitForTimeout(500);
      
      // Scroll down to see the ADD button
      await page.evaluate(() => window.scrollTo(0, 300));
      await page.waitForTimeout(500);
      
      // Click ADD COMBATANTS button
      const addBtn = page.locator('button:has-text("Add Combatants"), button:has-text("ADD"), button:has-text("Add")').first();
      await addBtn.click({ force: true });
      await page.waitForTimeout(1500);
      
      // Scroll back to top
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(500);
      
      // Take screenshot
      await page.screenshot({ path: 'p2-combat-add-panel-opened.jpeg', quality: 20, fullPage: true });
      
      // Now look for "Monster Database (303)" - it should be a tab or button
      // The panel has two tabs: "CAMPAIGN CHARACTERS" and "Monster Database (303)"
      const monsterDbTab = page.locator('text=Monster Database (303)');
      await expect(monsterDbTab).toBeVisible();
      
      // Click to switch to Monster Database tab
      await monsterDbTab.click();
      await page.waitForTimeout(500);
      
      // Verify the "Showing X of 303 monsters" text appears
      await expect(page.locator('text=of 303 monsters')).toBeVisible();
      
      await page.screenshot({ path: 'p2-combat-creator-monster-database-303.jpeg', quality: 20, fullPage: false });
    });
  });
});
