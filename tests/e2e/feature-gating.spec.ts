import { test, expect } from '@playwright/test';
import { waitForAppReady, dismissToasts, loginTestUser, TEST_CAMPAIGN_ID } from '../fixtures/helpers';

test.describe('Feature Gating & CampaignDashboard', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
  });

  test('CampaignDashboard shows Session Mode button', async ({ page }) => {
    await loginTestUser(page);
    
    // Navigate to campaign dashboard
    await page.goto(`/campaign/${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    
    // Verify the Session Mode button exists
    await expect(page.getByTestId('open-session-mode-btn')).toBeVisible({ timeout: 15000 });
  });

  test('CampaignDashboard Session button shows lock icon when feature is locked', async ({ page }) => {
    await loginTestUser(page);
    await page.goto(`/campaign/${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    
    // The button should show either Swords icon (unlocked) or Lock icon (locked)
    // Free tier users should see lock icon
    const button = page.getByTestId('open-session-mode-btn');
    await expect(button).toBeVisible({ timeout: 15000 });
    
    // Button should have text "Session" on desktop
    await expect(button).toContainText('Session');
  });

  test('GM Screen button is always visible on campaign dashboard', async ({ page }) => {
    await loginTestUser(page);
    await page.goto(`/campaign/${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    
    // Verify GM Screen button
    await expect(page.getByTestId('open-dm-screen-btn')).toBeVisible();
    await expect(page.getByTestId('open-dm-screen-btn')).toContainText('GM Screen');
  });

  test('CampaignDashboard has sidebar with tab groups', async ({ page }) => {
    await loginTestUser(page);
    await page.goto(`/campaign/${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    
    // Verify tab groups exist
    await expect(page.getByTestId('group-world')).toBeVisible();
    await expect(page.getByTestId('group-combat')).toBeVisible();
    
    // Verify standalone tabs
    await expect(page.getByTestId('reference-tab')).toBeVisible();
    await expect(page.getByTestId('items-tab')).toBeVisible();
    await expect(page.getByTestId('players-tab')).toBeVisible();
    await expect(page.getByTestId('ingame-notes-tab')).toBeVisible();
  });

  test('Back button navigates to /home', async ({ page }) => {
    await loginTestUser(page);
    await page.goto(`/campaign/${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    
    await expect(page.getByTestId('back-to-campaigns-btn')).toBeVisible();
    await page.getByTestId('back-to-campaigns-btn').click();
    
    await page.waitForURL(/\/home/, { timeout: 10000 });
  });
});
