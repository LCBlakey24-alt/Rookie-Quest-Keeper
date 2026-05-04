import { test, expect } from '@playwright/test';
import { dismissToasts, removeBlockingBadges } from '../fixtures/helpers';

// Test Rook's Tips guides for the consolidated tabs
test.describe("Rook's Tips - Consolidated Tabs", () => {
  const campaignId = '747e1590-9418-4be8-93bc-4d76a636e655';
  
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to ensure guides are shown fresh
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.removeItem('rook_guides_dismissed');
    });
    
    await dismissToasts(page);
    // Login
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await page.getByTestId('login-email').fill('admin@rookiequestkeeper.com');
    await page.getByTestId('login-password').fill('admin123');
    await page.getByTestId('login-btn').click();
    await page.waitForTimeout(2000);
    // Navigate to campaign
    await page.goto(`/campaign/${campaignId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await removeBlockingBadges(page);
  });

  test('should show Maps Hub guide when navigating to Maps tab', async ({ page }) => {
    // Navigate to Maps tab
    await page.getByTestId('maps-tab').click();
    await page.waitForTimeout(800);
    
    // Look for Rook's Tips guide for maps
    const guideContainer = page.getByTestId('rook-guide-maps');
    await expect(guideContainer).toBeVisible({ timeout: 5000 });
    
    // Check for Maps Hub title
    await expect(guideContainer.getByText('Maps Hub')).toBeVisible();
    
    // Check for "ROOK'S TIPS" label
    await expect(guideContainer.getByText("Rook's Tips")).toBeVisible();
  });

  test('should show Chronicle guide when navigating to Chronicle tab', async ({ page }) => {
    // Navigate to Chronicle tab
    await page.getByTestId('chronicle-tab').click();
    await page.waitForTimeout(800);
    
    // Look for Rook's Tips guide for chronicle
    const guideContainer = page.getByTestId('rook-guide-chronicle');
    await expect(guideContainer).toBeVisible({ timeout: 5000 });
    
    // Check for Chronicle title
    await expect(guideContainer.getByText('Campaign Chronicle')).toBeVisible();
  });

  test('should show Combat Hub guide when navigating to Combat tab', async ({ page }) => {
    // Navigate to Combat tab
    await page.getByTestId('combat-tab').click();
    await page.waitForTimeout(800);
    
    // Look for Rook's Tips guide for combat
    const guideContainer = page.getByTestId('rook-guide-combat');
    await expect(guideContainer).toBeVisible({ timeout: 5000 });
    
    // Check for Combat Hub title
    await expect(guideContainer.getByText('Combat Hub')).toBeVisible();
  });

  test('should show GM Tools guide when navigating to Tools tab', async ({ page }) => {
    // Navigate to Tools tab
    await page.getByTestId('tools-tab').click();
    await page.waitForTimeout(800);
    
    // Look for Rook's Tips guide for tools
    const guideContainer = page.getByTestId('rook-guide-tools');
    await expect(guideContainer).toBeVisible({ timeout: 5000 });
    
    // Check for GM Tools title
    await expect(guideContainer.getByText('GM Tools')).toBeVisible();
  });

  test('should show Inventory Hub guide when navigating to Inventory tab', async ({ page }) => {
    // Navigate to Inventory tab
    await page.getByTestId('inventory-tab').click();
    await page.waitForTimeout(800);
    
    // Look for Rook's Tips guide for inventory
    const guideContainer = page.getByTestId('rook-guide-inventory');
    await expect(guideContainer).toBeVisible({ timeout: 5000 });
    
    // Check for Inventory Hub title
    await expect(guideContainer.getByText('Inventory Hub')).toBeVisible();
  });

  test('should dismiss guide and persist dismissal', async ({ page }) => {
    // Navigate to Maps tab
    await page.getByTestId('maps-tab').click();
    await page.waitForTimeout(800);
    
    // Find and click dismiss button
    const guideContainer = page.getByTestId('rook-guide-maps');
    await expect(guideContainer).toBeVisible({ timeout: 5000 });
    
    // Click "GOT IT, THANKS!" button to dismiss
    await guideContainer.getByRole('button', { name: /got it/i }).click();
    await page.waitForTimeout(500);
    
    // Guide should be hidden now
    await expect(guideContainer).not.toBeVisible();
    
    // Verify localStorage was updated
    const dismissedGuides = await page.evaluate(() => {
      return localStorage.getItem('rook_guides_dismissed');
    });
    
    expect(dismissedGuides).toContain('maps');
  });
});
