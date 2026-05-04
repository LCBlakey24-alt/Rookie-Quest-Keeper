import { test, expect } from '@playwright/test';
import { 
  waitForAppReady, 
  dismissToasts, 
  removeBlockingBadges, 
  loginTestUser,
  TEST_USER,
  TEST_CAMPAIGN_ID 
} from '../fixtures/helpers';

test.describe('Rook Guide - First-Time User Tips', () => {
  
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await removeBlockingBadges(page);
    // Clear localStorage to simulate first-time user
    await page.addInitScript(() => {
      localStorage.removeItem('rook_guides_dismissed');
    });
    await loginTestUser(page);
  });

  test.describe('Dashboard RookGuide', () => {
    
    test('should show Player section guide on dashboard', async ({ page }) => {
      // Navigate to dashboard
      await page.goto('/home', { waitUntil: 'domcontentloaded' });
      await waitForAppReady(page);
      
      // Wait for page to load
      await expect(page.locator('#player-section')).toBeVisible({ timeout: 10000 });
      
      // Check for the player guide card
      const playerGuide = page.getByTestId('rook-guide-dashboard-player');
      await expect(playerGuide).toBeVisible({ timeout: 5000 });
      
      // Verify guide content contains helpful tips about characters
      await expect(playerGuide).toContainText(/character/i);
    });

    test('should show GM section guide on dashboard', async ({ page }) => {
      await page.goto('/home', { waitUntil: 'domcontentloaded' });
      await waitForAppReady(page);
      
      // Wait for GM section to be visible (scroll or check layout)
      await expect(page.locator('#gm-section')).toBeVisible({ timeout: 10000 });
      
      // Check for the GM guide card
      const gmGuide = page.getByTestId('rook-guide-dashboard-gm');
      await expect(gmGuide).toBeVisible({ timeout: 5000 });
      
      // Verify guide content mentions campaigns
      await expect(gmGuide).toContainText(/campaign/i);
    });

    test('should dismiss Player guide and persist in localStorage', async ({ page }) => {
      await page.goto('/home', { waitUntil: 'domcontentloaded' });
      await waitForAppReady(page);
      
      // Wait for guide to appear
      const playerGuide = page.getByTestId('rook-guide-dashboard-player');
      await expect(playerGuide).toBeVisible({ timeout: 5000 });
      
      // Click the "Got it, thanks!" button to dismiss
      await playerGuide.getByRole('button', { name: /Got it/i }).click();
      
      // Wait for animation and guide to disappear
      await expect(playerGuide).not.toBeVisible({ timeout: 3000 });
      
      // Verify localStorage was updated
      const dismissed = await page.evaluate(() => {
        const stored = localStorage.getItem('rook_guides_dismissed');
        return stored ? JSON.parse(stored) : [];
      });
      expect(dismissed).toContain('dashboard-player');
    });

    test('should NOT show guide after being dismissed', async ({ page }) => {
      // First dismiss the guide
      await page.goto('/home', { waitUntil: 'domcontentloaded' });
      await waitForAppReady(page);
      
      const playerGuide = page.getByTestId('rook-guide-dashboard-player');
      await expect(playerGuide).toBeVisible({ timeout: 5000 });
      
      await playerGuide.getByRole('button', { name: /Got it/i }).click();
      await expect(playerGuide).not.toBeVisible({ timeout: 3000 });
      
      // Navigate away and come back
      await page.goto('/account', { waitUntil: 'domcontentloaded' });
      await page.goto('/home', { waitUntil: 'domcontentloaded' });
      await waitForAppReady(page);
      
      // Guide should NOT appear again
      await expect(playerGuide).not.toBeVisible({ timeout: 3000 });
    });

    test('should dismiss GM guide independently of Player guide', async ({ page }) => {
      await page.goto('/home', { waitUntil: 'domcontentloaded' });
      await waitForAppReady(page);
      
      // Both guides should be visible
      const playerGuide = page.getByTestId('rook-guide-dashboard-player');
      const gmGuide = page.getByTestId('rook-guide-dashboard-gm');
      
      await expect(playerGuide).toBeVisible({ timeout: 5000 });
      await expect(gmGuide).toBeVisible({ timeout: 5000 });
      
      // Dismiss only the player guide
      await playerGuide.getByRole('button', { name: /Got it/i }).click();
      await expect(playerGuide).not.toBeVisible({ timeout: 3000 });
      
      // GM guide should still be visible
      await expect(gmGuide).toBeVisible();
    });
  });

  test.describe('Campaign Dashboard Tab Guides', () => {
    
    test('should show guide when navigating to Setting tab', async ({ page }) => {
      await page.goto(`/campaign/${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
      await waitForAppReady(page);
      
      // Setting tab is the default - guide should show
      const settingGuide = page.getByTestId('rook-guide-setting');
      await expect(settingGuide).toBeVisible({ timeout: 5000 });
      await expect(settingGuide).toContainText(/Campaign Settings/i);
    });

    test('should show World Map guide when navigating to World Map tab', async ({ page }) => {
      await page.goto(`/campaign/${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
      await waitForAppReady(page);
      
      // Click World Map tab
      await page.getByTestId('world-map-tab').click();
      
      // Wait for World Map guide
      const worldMapGuide = page.getByTestId('rook-guide-world-map');
      await expect(worldMapGuide).toBeVisible({ timeout: 5000 });
      
      // Verify content mentions map features
      await expect(worldMapGuide).toContainText(/map/i);
      await expect(worldMapGuide).toContainText(/location/i);
    });

    test('should show Local Maps guide when navigating to Local Maps tab', async ({ page }) => {
      await page.goto(`/campaign/${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
      await waitForAppReady(page);
      
      // Click Local Maps tab
      await page.getByTestId('local-maps-tab').click();
      
      // Wait for Local Maps guide
      const localMapsGuide = page.getByTestId('rook-guide-local-maps');
      await expect(localMapsGuide).toBeVisible({ timeout: 5000 });
      
      // Verify content
      await expect(localMapsGuide).toContainText(/Local Maps/i);
    });

    test('should dismiss tab guide and persist across sessions', async ({ page }) => {
      await page.goto(`/campaign/${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
      await waitForAppReady(page);
      
      // Dismiss the Setting guide
      const settingGuide = page.getByTestId('rook-guide-setting');
      await expect(settingGuide).toBeVisible({ timeout: 5000 });
      
      await settingGuide.getByRole('button', { name: /Got it/i }).click();
      await expect(settingGuide).not.toBeVisible({ timeout: 3000 });
      
      // Navigate to another tab and back
      await page.getByTestId('npcs-tab').click();
      await page.getByTestId('setting-tab').click();
      
      // Setting guide should NOT reappear
      await expect(settingGuide).not.toBeVisible({ timeout: 3000 });
    });

    test('should show NPCs guide when navigating to NPCs tab', async ({ page }) => {
      await page.goto(`/campaign/${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
      await waitForAppReady(page);
      
      // Click NPCs tab
      await page.getByTestId('npcs-tab').click();
      
      // Wait for NPCs guide
      const npcsGuide = page.getByTestId('rook-guide-npcs');
      await expect(npcsGuide).toBeVisible({ timeout: 5000 });
      await expect(npcsGuide).toContainText(/NPC/i);
    });

    test('should show Locations guide when navigating to Locations tab', async ({ page }) => {
      await page.goto(`/campaign/${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
      await waitForAppReady(page);
      
      // Click Locations tab
      await page.getByTestId('locations-tab').click();
      
      // Wait for Locations guide
      const locationsGuide = page.getByTestId('rook-guide-locations');
      await expect(locationsGuide).toBeVisible({ timeout: 5000 });
      await expect(locationsGuide).toContainText(/location/i);
    });
  });

  test.describe('Guide UI Elements', () => {
    
    test('should display lightbulb icon in guide header', async ({ page }) => {
      await page.goto('/home', { waitUntil: 'domcontentloaded' });
      await waitForAppReady(page);
      
      const playerGuide = page.getByTestId('rook-guide-dashboard-player');
      await expect(playerGuide).toBeVisible({ timeout: 5000 });
      
      // Guide should have "Rook's Tips" label
      await expect(playerGuide).toContainText(/Rook.*Tips/i);
    });

    test('should display multiple tips in guide', async ({ page }) => {
      await page.goto('/home', { waitUntil: 'domcontentloaded' });
      await waitForAppReady(page);
      
      const playerGuide = page.getByTestId('rook-guide-dashboard-player');
      await expect(playerGuide).toBeVisible({ timeout: 5000 });
      
      // Check that guide has multiple list items (tips)
      const tipItems = playerGuide.locator('li');
      await expect(tipItems).toHaveCount(3, { timeout: 3000 });
    });

    test('should have dismiss button visible and accessible', async ({ page }) => {
      await page.goto('/home', { waitUntil: 'domcontentloaded' });
      await waitForAppReady(page);
      
      const playerGuide = page.getByTestId('rook-guide-dashboard-player');
      await expect(playerGuide).toBeVisible({ timeout: 5000 });
      
      // Check for dismiss button
      const dismissBtn = playerGuide.getByRole('button', { name: /Got it/i });
      await expect(dismissBtn).toBeVisible();
      await expect(dismissBtn).toBeEnabled();
    });
  });
});
