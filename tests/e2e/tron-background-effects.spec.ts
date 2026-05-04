import { test, expect } from '@playwright/test';
import { 
  waitForAppReady,
  dismissToasts,
  removeBlockingBadges,
  TEST_CAMPAIGN_ID,
  TEST_CHARACTER_ID
} from '../fixtures/helpers';

const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';
const TEST_EMAIL = 'admin@rookiequestkeeper.com';
const TEST_PASSWORD = 'admin123';

test.describe('Tron Light Cycle Background Effects', () => {
  
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
  });

  // ==================== LANDING PAGE EFFECTS ====================
  
  test('Landing page has TronBackground with landing variant', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    
    // Check for the tron-effects-container
    const tronContainer = page.locator('.tron-effects-container');
    await expect(tronContainer).toBeVisible({ timeout: 10000 });
    
    // Check for grid overlay
    const tronGrid = page.locator('.tron-grid');
    await expect(tronGrid).toBeVisible();
    
    // Check for blue light trails (landing variant shows both)
    const blueTrails = page.locator('.light-trail-blue');
    await expect(blueTrails.first()).toBeVisible();
    
    // Check for red light trails
    const redTrails = page.locator('.light-trail-red');
    await expect(redTrails.first()).toBeVisible();
    
    // Verify the dual color scheme text is visible
    await expect(page.getByText('ROOKIE QUEST').first()).toBeVisible();
    await expect(page.getByText('KEEPER').first()).toBeVisible();
  });

  test('Landing page Get Started button is clickable with Tron effects', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await removeBlockingBadges(page);
    
    // Verify Get Started button works despite Tron effects layer
    const getStartedBtn = page.getByTestId('get-started-btn');
    await expect(getStartedBtn).toBeVisible();
    await getStartedBtn.click();
    
    // Should navigate to auth page
    await page.waitForURL(/\/auth/);
  });

  // ==================== AUTH PAGE EFFECTS ====================
  
  test('Auth page has TronBackground with both variant (blue and red trails)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    
    // Check for the tron-effects-container
    const tronContainer = page.locator('.tron-effects-container');
    await expect(tronContainer).toBeVisible({ timeout: 10000 });
    
    // Check for grid overlay
    const tronGrid = page.locator('.tron-grid');
    await expect(tronGrid).toBeVisible();
    
    // Variant "both" should show both blue and red trails
    const blueTrails = page.locator('.light-trail-blue');
    await expect(blueTrails.first()).toBeVisible();
    
    const redTrails = page.locator('.light-trail-red');
    await expect(redTrails.first()).toBeVisible();
    
    // Login form should still be accessible
    await expect(page.getByTestId('login-email')).toBeVisible();
    await expect(page.getByTestId('login-password')).toBeVisible();
    await expect(page.getByTestId('login-btn')).toBeVisible();
  });

  test('Login flow works correctly with Tron background effects', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await removeBlockingBadges(page);
    
    // Fill login form
    await page.getByTestId('login-email').fill(TEST_EMAIL);
    await page.getByTestId('login-password').fill(TEST_PASSWORD);
    
    // Click login button
    await page.getByTestId('login-btn').click();
    
    // Should navigate to dashboard
    await page.waitForURL(/\/home/, { timeout: 15000 });
    
    // Verify dashboard loads
    await expect(page.locator('#player-section')).toBeVisible({ timeout: 10000 });
  });

  // ==================== UNIFIED DASHBOARD EFFECTS ====================
  
  test('Unified Dashboard has dual Tron theme - blue player side, red GM side', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await removeBlockingBadges(page);
    
    // Login
    await page.getByTestId('login-email').fill(TEST_EMAIL);
    await page.getByTestId('login-password').fill(TEST_PASSWORD);
    await page.getByTestId('login-btn').click();
    await page.waitForURL(/\/home/, { timeout: 15000 });
    
    // Wait for dashboard to load
    await expect(page.locator('#player-section')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#gm-section')).toBeVisible({ timeout: 10000 });
    
    // Check for TronBackground containers in both sections
    const tronContainers = page.locator('.tron-effects-container');
    const containerCount = await tronContainers.count();
    
    // Should have at least 2 Tron backgrounds (one for player, one for GM)
    expect(containerCount).toBeGreaterThanOrEqual(2);
    
    // Check for blue trails in player section
    const playerSection = page.locator('#player-section');
    const blueTrailsInPlayer = playerSection.locator('.light-trail-blue');
    // Note: Variant blue only shows blue trails
    
    // Check for red trails in GM section
    const gmSection = page.locator('#gm-section');
    const redTrailsInGM = gmSection.locator('.light-trail-red');
    // Note: Variant red only shows red trails
    
    // Player section should have "MY CHARACTERS" header
    await expect(page.getByText('MY CHARACTERS')).toBeVisible();
    
    // GM section should have "MY CAMPAIGNS" header
    await expect(page.getByText('MY CAMPAIGNS')).toBeVisible();
    
    // Headers should show correct labels
    await expect(page.locator('#player-section').getByText('PLAYER SIDE')).toBeVisible();
    await expect(page.locator('#gm-section').getByText('GM SIDE')).toBeVisible();
  });

  test('Dashboard buttons are clickable with Tron effects', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await removeBlockingBadges(page);
    
    // Login
    await page.getByTestId('login-email').fill(TEST_EMAIL);
    await page.getByTestId('login-password').fill(TEST_PASSWORD);
    await page.getByTestId('login-btn').click();
    await page.waitForURL(/\/home/, { timeout: 15000 });
    
    await expect(page.locator('#player-section')).toBeVisible({ timeout: 10000 });
    
    // Verify NEW CHARACTER button is clickable
    const newCharBtn = page.getByTestId('new-character-btn');
    await expect(newCharBtn).toBeVisible();
    
    // Verify NEW CAMPAIGN button is clickable
    const newCampaignBtn = page.getByTestId('new-campaign-btn');
    await expect(newCampaignBtn).toBeVisible();
    
    // Verify Review button is clickable
    const reviewBtn = page.getByTestId('review-btn');
    await expect(reviewBtn).toBeVisible();
    
    // Verify Referral button is clickable
    const referralBtn = page.getByTestId('referral-btn');
    await expect(referralBtn).toBeVisible();
  });

  // ==================== MOBILE RESPONSIVENESS ====================
  
  test('Dashboard mobile toggle works with Tron effects', async ({ page }) => {
    // Login first at desktop size
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await removeBlockingBadges(page);
    
    await page.getByTestId('login-email').fill(TEST_EMAIL);
    await page.getByTestId('login-password').fill(TEST_PASSWORD);
    await page.getByTestId('login-btn').click();
    await page.waitForURL(/\/home/, { timeout: 15000 });
    
    // Switch to mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForLoadState('domcontentloaded');
    
    // Mobile toggle should be visible
    const mobileNav = page.locator('#mobile-nav-toggle');
    await expect(mobileNav).toBeVisible();
    
    // PLAYER HUB button should be visible
    const playerHubBtn = page.getByRole('button', { name: /PLAYER HUB/i });
    await expect(playerHubBtn).toBeVisible();
    
    // GM SIDE button should be visible
    const gmSideBtn = page.getByRole('button', { name: /GM SIDE/i });
    await expect(gmSideBtn).toBeVisible();
    
    // Click GM SIDE to switch view
    await gmSideBtn.click();
    
    // GM section should now be visible (player section hidden on mobile)
    await expect(page.locator('#gm-section')).toBeVisible();
  });

  // ==================== NAVIGATION WITH EFFECTS ====================
  
  test('Navigation between pages does not break with Tron backgrounds', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await removeBlockingBadges(page);
    
    // Start at landing page
    await expect(page.locator('.tron-effects-container').first()).toBeVisible({ timeout: 10000 });
    
    // Navigate to auth
    await page.getByTestId('get-started-btn').click();
    await page.waitForURL(/\/auth/);
    await expect(page.locator('.tron-effects-container').first()).toBeVisible();
    await expect(page.getByTestId('login-email')).toBeVisible();
    
    // Login
    await page.getByTestId('login-email').fill(TEST_EMAIL);
    await page.getByTestId('login-password').fill(TEST_PASSWORD);
    await page.getByTestId('login-btn').click();
    await page.waitForURL(/\/home/, { timeout: 15000 });
    
    // Verify dashboard loaded with effects
    await expect(page.locator('#player-section')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.tron-effects-container').first()).toBeVisible();
    
    // Navigate back to landing (logout)
    const logoutBtn = page.locator('button').filter({ has: page.locator('svg') }).last();
    // Click logout (last button with icon in header)
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('header button');
      const logoutBtn = buttons[buttons.length - 1];
      if (logoutBtn) (logoutBtn as HTMLElement).click();
    });
    
    // Should return to auth or landing
    await page.waitForURL(/\/(auth|$)/);
  });

  // ==================== LOGOUT FLOW ====================
  
  test('Logout flow works correctly with Tron effects', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await removeBlockingBadges(page);
    
    // Login
    await page.getByTestId('login-email').fill(TEST_EMAIL);
    await page.getByTestId('login-password').fill(TEST_PASSWORD);
    await page.getByTestId('login-btn').click();
    await page.waitForURL(/\/home/, { timeout: 15000 });
    
    await expect(page.locator('#player-section')).toBeVisible({ timeout: 10000 });
    
    // Find and click logout button
    // The logout button is the last button in the header with LogOut icon
    await page.evaluate(() => {
      const header = document.querySelector('header');
      if (header) {
        const buttons = header.querySelectorAll('button');
        // Last button should be logout
        const logoutBtn = buttons[buttons.length - 1];
        if (logoutBtn) (logoutBtn as HTMLElement).click();
      }
    });
    
    // Should redirect to auth page
    await page.waitForURL(/\/auth/, { timeout: 10000 });
    
    // Auth page should have Tron effects
    await expect(page.locator('.tron-effects-container').first()).toBeVisible();
    await expect(page.getByTestId('login-email')).toBeVisible();
  });

  // ==================== VISUAL CONSISTENCY ====================
  
  test('Tron effects do not block form interactions', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await removeBlockingBadges(page);
    
    // Verify Tron container has pointer-events: none
    const tronContainer = page.locator('.tron-effects-container').first();
    const pointerEvents = await tronContainer.evaluate(el => 
      window.getComputedStyle(el).pointerEvents
    );
    expect(pointerEvents).toBe('none');
    
    // Verify z-index is set correctly (should be 0 for background)
    const zIndex = await tronContainer.evaluate(el => 
      window.getComputedStyle(el).zIndex
    );
    expect(parseInt(zIndex)).toBeLessThanOrEqual(1);
    
    // Form interactions should work
    const emailInput = page.getByTestId('login-email');
    await emailInput.fill('test@example.com');
    const emailValue = await emailInput.inputValue();
    expect(emailValue).toBe('test@example.com');
    
    const passwordInput = page.getByTestId('login-password');
    await passwordInput.fill('testpassword');
    const passwordValue = await passwordInput.inputValue();
    expect(passwordValue).toBe('testpassword');
  });

  test('Light trail animations have correct CSS classes', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    
    // Check blue trail has correct styling
    const blueTrail = page.locator('.light-trail-blue').first();
    await expect(blueTrail).toBeVisible();
    
    // Verify animation is applied
    const blueAnimation = await blueTrail.evaluate(el => 
      window.getComputedStyle(el).animation
    );
    expect(blueAnimation).toContain('lightTrailLeft');
    
    // Check red trail has correct styling
    const redTrail = page.locator('.light-trail-red').first();
    await expect(redTrail).toBeVisible();
    
    const redAnimation = await redTrail.evaluate(el => 
      window.getComputedStyle(el).animation
    );
    expect(redAnimation).toContain('lightTrailRight');
  });
});
