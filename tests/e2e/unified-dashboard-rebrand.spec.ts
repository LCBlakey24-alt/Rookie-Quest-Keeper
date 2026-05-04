import { test, expect } from '@playwright/test';
import { 
  waitForAppReady, 
  removeBlockingBadges, 
  loginTestUser,
  dismissToasts,
  TEST_USER,
  TEST_CHARACTER_ID,
  TEST_CAMPAIGN_ID
} from '../fixtures/helpers';

test.describe('Unified Dashboard Rebrand', () => {
  test.beforeEach(async ({ page }) => {
    await removeBlockingBadges(page);
    await dismissToasts(page);
  });

  test.describe('Dashboard Layout', () => {
    test('UnifiedDashboard shows after login (not role selection)', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      
      // Login
      await page.goto('/auth', { waitUntil: 'domcontentloaded' });
      await page.getByTestId('login-email').fill(TEST_USER.email);
      await page.getByTestId('login-password').fill(TEST_USER.password);
      await page.getByTestId('login-btn').click();
      
      // Should redirect to /home (UnifiedDashboard)
      await page.waitForURL(/\/home/, { timeout: 15000 });
      
      // Verify split view with Characters and Campaigns
      await expect(page.getByText('MY CHARACTERS')).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('MY CAMPAIGNS')).toBeVisible();
    });

    test('MY CHARACTERS section uses red color scheme', async ({ page }) => {
      await loginTestUser(page);
      await expect(page.getByText('MY CHARACTERS')).toBeVisible({ timeout: 10000 });
      
      // Check New Character button is RED (dark minimalist design uses #E11D48 red accent throughout)
      const newCharBtn = page.getByTestId('new-character-btn');
      await expect(newCharBtn).toBeVisible();
      
      // Verify it has red background color #E11D48 = rgb(225, 29, 72)
      await expect(newCharBtn).toHaveCSS('background-color', /rgb\(225, 29, 72\)/);
    });

    test('MY CAMPAIGNS section uses red color scheme', async ({ page }) => {
      await loginTestUser(page);
      await expect(page.getByText('MY CAMPAIGNS')).toBeVisible({ timeout: 10000 });
      
      // Check New Campaign button is red #E11D48
      const newCampBtn = page.getByTestId('new-campaign-btn');
      await expect(newCampBtn).toBeVisible();
      
      // Verify it has red background color #E11D48 = rgb(225, 29, 72)
      await expect(newCampBtn).toHaveCSS('background-color', /rgb\(225, 29, 72\)/);
    });
  });

  test.describe('Header Buttons', () => {
    test.beforeEach(async ({ page }) => {
      await loginTestUser(page);
      await expect(page.getByText('MY CHARACTERS')).toBeVisible({ timeout: 10000 });
    });

    test('Review button is visible in header', async ({ page }) => {
      await expect(page.getByTestId('review-btn')).toBeVisible();
      await expect(page.getByTestId('review-btn')).toContainText('Review');
    });

    test('Referral button is visible in header', async ({ page }) => {
      await expect(page.getByTestId('referral-btn')).toBeVisible();
      await expect(page.getByTestId('referral-btn')).toContainText('Referral');
    });

    test('Review modal opens with star rating', async ({ page }) => {
      await page.getByTestId('review-btn').click();
      
      // Modal should appear
      await expect(page.getByText('Leave a Review')).toBeVisible({ timeout: 5000 });
      await expect(page.getByText('How would you rate your experience?')).toBeVisible();
      
      // Should have Submit and Cancel buttons
      await expect(page.getByRole('button', { name: /submit/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /cancel/i })).toBeVisible();
      
      // Close modal by clicking cancel
      await page.getByRole('button', { name: /cancel/i }).click();
      await expect(page.getByText('Leave a Review')).not.toBeVisible();
    });

    test('Referral modal opens with code display', async ({ page }) => {
      await page.getByTestId('referral-btn').click();
      
      // Modal should appear
      await expect(page.getByText('Your Referral Code')).toBeVisible({ timeout: 5000 });
      await expect(page.getByText('Share this link with friends to earn rewards')).toBeVisible();
      
      // Should have Copy Referral Link button
      await expect(page.getByRole('button', { name: /copy referral link/i })).toBeVisible();
    });
  });

  test.describe('Navigation Buttons', () => {
    test.beforeEach(async ({ page }) => {
      await loginTestUser(page);
      await expect(page.getByText('MY CHARACTERS')).toBeVisible({ timeout: 10000 });
    });

    test('New Character button navigates to character builder', async ({ page }) => {
      await page.getByTestId('new-character-btn').click();
      await page.waitForURL(/\/character-builder/, { timeout: 10000 });
    });

    test('New Campaign button opens campaign creation dialog', async ({ page }) => {
      await page.getByTestId('new-campaign-btn').click();
      // Fix: navigates to /campaigns and opens Create Campaign modal
      await page.waitForURL(/\/campaigns/, { timeout: 10000 });
      // Verify the Create New Campaign modal is open
      await expect(page.getByRole('heading', { name: 'Create New Campaign' })).toBeVisible({ timeout: 5000 });
      await expect(page.getByRole('textbox', { name: /enter campaign name/i })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Create Campaign' })).toBeVisible();
    });

    test('Character card navigates to character sheet', async ({ page }) => {
      // Check if there's a character card to click
      const characterCard = page.getByTestId(`character-${TEST_CHARACTER_ID}`);
      if (await characterCard.isVisible({ timeout: 5000 })) {
        await characterCard.click();
        await page.waitForURL(/\/characters\//, { timeout: 10000 });
      }
    });

    test('Campaign card navigates to campaign dashboard', async ({ page }) => {
      // Check if there's a campaign card to click
      const campaignCard = page.getByTestId(`campaign-${TEST_CAMPAIGN_ID}`);
      if (await campaignCard.isVisible({ timeout: 5000 })) {
        await campaignCard.click();
        await page.waitForURL(/\/campaign\//, { timeout: 10000 });
      }
    });
  });

  test.describe('Auth Page Color Scheme', () => {
    test('Auth page has red login button (dark minimalist design)', async ({ page }) => {
      await page.goto('/auth', { waitUntil: 'domcontentloaded' });
      
      const loginBtn = page.getByTestId('login-btn');
      await expect(loginBtn).toBeVisible();
      
      // Verify login button has red background #E11D48 = rgb(225, 29, 72)
      await expect(loginBtn).toHaveCSS('background-color', /rgb\(225, 29, 72\)/);
    });
  });

  test.describe('Square Corners Design', () => {
    test('Sidebar tabs have square corners', async ({ page }) => {
      await loginTestUser(page);
      await page.goto(`/campaign/${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[data-testid="setting-tab"]', { timeout: 15000 });
      
      const settingTab = page.getByTestId('setting-tab');
      const borderRadius = await settingTab.evaluate(el => getComputedStyle(el).borderRadius);
      
      // Sidebar tabs should have small border-radius (2px or similar)
      expect(parseInt(borderRadius)).toBeLessThanOrEqual(4);
    });

    test('Character/Campaign cards have square corners', async ({ page }) => {
      await loginTestUser(page);
      
      // Wait for dashboard
      await expect(page.getByText('MY CHARACTERS')).toBeVisible({ timeout: 10000 });
      
      // Find character card (uses red left border)
      const characterItem = page.locator('[class*="character"]').first();
      if (await characterItem.isVisible({ timeout: 5000 })) {
        const borderRadius = await characterItem.evaluate(el => getComputedStyle(el).borderRadius);
        // Cards should have minimal border-radius
        expect(parseInt(borderRadius) || 0).toBeLessThanOrEqual(8);
      }
    });
  });
});
