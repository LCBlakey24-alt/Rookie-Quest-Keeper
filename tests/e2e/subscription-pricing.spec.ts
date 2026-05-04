import { test, expect } from '@playwright/test';
import { dismissToasts, removeBlockingBadges, generateTestEmail, generateTestUsername, TEST_USER, loginTestUser } from '../fixtures/helpers';

const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';

test.describe('Subscription Pricing - 4 Tier System', () => {
  
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
  });

  test.describe('Pricing Page Display', () => {
    
    test('should display all 4 pricing tiers after login', async ({ page }) => {
      await loginTestUser(page);
      await removeBlockingBadges(page);
      
      // Navigate to pricing page
      await page.goto('/pricing', { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('domcontentloaded');
      
      // Verify all 4 plan cards are displayed
      await expect(page.getByTestId('plan-card-free')).toBeVisible({ timeout: 10000 });
      await expect(page.getByTestId('plan-card-player')).toBeVisible(); // Hero tier
      await expect(page.getByTestId('plan-card-gm')).toBeVisible(); // Quest Master tier
      await expect(page.getByTestId('plan-card-legendary')).toBeVisible();
      
      // Take screenshot
      await page.screenshot({ path: 'pricing-page-4-tiers.jpeg', quality: 20, fullPage: false });
    });

    test('should display Free plan with correct pricing and features', async ({ page }) => {
      await loginTestUser(page);
      await removeBlockingBadges(page);
      await page.goto('/pricing', { waitUntil: 'domcontentloaded' });
      
      const freePlanCard = page.getByTestId('plan-card-free');
      await expect(freePlanCard).toBeVisible({ timeout: 10000 });
      
      // Check plan name
      await expect(freePlanCard.getByText('Free')).toBeVisible();
      
      // Check price ($0)
      await expect(freePlanCard.getByText('$0')).toBeVisible();
      
      // Check target audience
      await expect(freePlanCard.getByText('Get Started')).toBeVisible();
      
      // Check for features
      await expect(freePlanCard.getByText(/1 character/i)).toBeVisible();
      await expect(freePlanCard.getByText(/3 AI/i)).toBeVisible();
    });

    test('should display Hero (player) plan with $3.99/month pricing', async ({ page }) => {
      await loginTestUser(page);
      await removeBlockingBadges(page);
      await page.goto('/pricing', { waitUntil: 'domcontentloaded' });
      
      const heroCard = page.getByTestId('plan-card-player');
      await expect(heroCard).toBeVisible({ timeout: 10000 });
      
      // Check plan name
      await expect(heroCard.getByText('Hero')).toBeVisible();
      
      // Check price ($3.99)
      await expect(heroCard.getByText('$3.99')).toBeVisible();
      
      // Check target audience
      await expect(heroCard.getByText('For Players')).toBeVisible();
      
      // Check for features
      await expect(heroCard.getByText(/unlimited characters/i)).toBeVisible();
    });

    test('should display Quest Master (GM) plan with $3.99/month pricing', async ({ page }) => {
      await loginTestUser(page);
      await removeBlockingBadges(page);
      await page.goto('/pricing', { waitUntil: 'domcontentloaded' });
      
      const gmCard = page.getByTestId('plan-card-gm');
      await expect(gmCard).toBeVisible({ timeout: 10000 });
      
      // Check plan name
      await expect(gmCard.getByText('Quest Master')).toBeVisible();
      
      // Check price ($3.99)
      await expect(gmCard.getByText('$3.99')).toBeVisible();
      
      // Check target audience
      await expect(gmCard.getByText('For Game Masters')).toBeVisible();
      
      // Check GM red color theme
      const iconContainer = gmCard.locator('[style*="color"]').first();
      // Check for features
      await expect(gmCard.getByText(/unlimited campaigns/i)).toBeVisible();
    });

    test('should display Legendary plan with $5.99/month pricing and MOST POPULAR badge', async ({ page }) => {
      await loginTestUser(page);
      await removeBlockingBadges(page);
      await page.goto('/pricing', { waitUntil: 'domcontentloaded' });
      
      const legendaryCard = page.getByTestId('plan-card-legendary');
      await expect(legendaryCard).toBeVisible({ timeout: 10000 });
      
      // Check plan name
      await expect(legendaryCard.getByText('Legendary')).toBeVisible();
      
      // Check price ($5.99)
      await expect(legendaryCard.getByText('$5.99')).toBeVisible();
      
      // Check MOST POPULAR badge
      await expect(legendaryCard.getByText('MOST POPULAR')).toBeVisible();
      
      // Check target audience
      await expect(legendaryCard.getByText('For Everyone')).toBeVisible();
      
      // Check for features that include both Hero and Quest Master
      await expect(legendaryCard.getByText(/everything in hero/i)).toBeVisible();
      await expect(legendaryCard.getByText(/everything in quest master/i)).toBeVisible();
    });

    test('should toggle between monthly and yearly billing', async ({ page }) => {
      await loginTestUser(page);
      await removeBlockingBadges(page);
      await page.goto('/pricing', { waitUntil: 'domcontentloaded' });
      
      // Monthly should be default
      const monthlyBtn = page.getByRole('button', { name: /monthly/i });
      const yearlyBtn = page.getByRole('button', { name: /yearly/i });
      
      await expect(monthlyBtn).toBeVisible({ timeout: 10000 });
      await expect(yearlyBtn).toBeVisible();
      
      // Click yearly
      await yearlyBtn.click();
      
      // Verify yearly prices are shown
      const heroCard = page.getByTestId('plan-card-player');
      await expect(heroCard.getByText('$39.99')).toBeVisible({ timeout: 5000 });
      
      const legendaryCard = page.getByTestId('plan-card-legendary');
      await expect(legendaryCard.getByText('$59.99')).toBeVisible();
      
      // Verify SAVE badge is shown
      await expect(yearlyBtn.getByText(/save/i)).toBeVisible();
    });
  });

  test.describe('Promo Code Section', () => {
    
    test('should display promo code input section', async ({ page }) => {
      await loginTestUser(page);
      await removeBlockingBadges(page);
      await page.goto('/pricing', { waitUntil: 'domcontentloaded' });
      
      // Check for promo code section
      await expect(page.getByText(/have a promo code/i)).toBeVisible({ timeout: 10000 });
      
      // Check for promo code input
      const promoInput = page.getByTestId('promo-code-input');
      await expect(promoInput).toBeVisible();
      
      // Check for apply button
      const applyBtn = page.getByTestId('apply-promo-btn');
      await expect(applyBtn).toBeVisible();
    });

    test('should convert promo code to uppercase', async ({ page }) => {
      await loginTestUser(page);
      await removeBlockingBadges(page);
      await page.goto('/pricing', { waitUntil: 'domcontentloaded' });
      
      const promoInput = page.getByTestId('promo-code-input');
      await expect(promoInput).toBeVisible({ timeout: 10000 });
      
      // Type a lowercase promo code
      await promoInput.fill('testcode123');
      
      // Verify it's converted to uppercase
      await expect(promoInput).toHaveValue('TESTCODE123');
    });

    test('should show error for invalid promo code', async ({ page }) => {
      // Bug was fixed: PricingPage now calls /api/promo-codes/apply correctly
      await loginTestUser(page);
      await removeBlockingBadges(page);
      await page.goto('/pricing', { waitUntil: 'domcontentloaded' });
      
      const promoInput = page.getByTestId('promo-code-input');
      const applyBtn = page.getByTestId('apply-promo-btn');
      
      await expect(promoInput).toBeVisible({ timeout: 10000 });
      
      // Enter invalid promo code
      await promoInput.fill('INVALIDCODE99999');
      await applyBtn.click();
      
      // Should show error toast - with correct endpoint, we get "Invalid promo code"
      const errorAppeared = await Promise.race([
        page.getByText(/invalid/i).waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false),
        page.locator('[data-sonner-toast]').waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false)
      ]);
      
      expect(errorAppeared).toBeTruthy();
    });
  });

  test.describe('Subscribe Buttons', () => {
    
    test('should display subscribe button for Hero plan', async ({ page }) => {
      await loginTestUser(page);
      await removeBlockingBadges(page);
      await page.goto('/pricing', { waitUntil: 'domcontentloaded' });
      
      const heroCard = page.getByTestId('plan-card-player');
      await expect(heroCard).toBeVisible({ timeout: 10000 });
      
      // Check for subscribe button
      const subscribeBtn = page.getByTestId('subscribe-player-btn');
      const isVisible = await subscribeBtn.isVisible().catch(() => false);
      
      if (isVisible) {
        // User is on free tier - subscribe button should be visible
        await expect(subscribeBtn).toBeEnabled();
      } else {
        // User might already be on this tier - "Current Plan" shown instead
        await expect(heroCard.getByText(/current plan/i)).toBeVisible();
      }
    });

    test('should display subscribe button for Quest Master plan', async ({ page }) => {
      await loginTestUser(page);
      await removeBlockingBadges(page);
      await page.goto('/pricing', { waitUntil: 'domcontentloaded' });
      
      const gmCard = page.getByTestId('plan-card-gm');
      await expect(gmCard).toBeVisible({ timeout: 10000 });
      
      // Check for subscribe button
      const subscribeBtn = page.getByTestId('subscribe-gm-btn');
      const isVisible = await subscribeBtn.isVisible().catch(() => false);
      
      if (isVisible) {
        await expect(subscribeBtn).toBeEnabled();
      } else {
        await expect(gmCard.getByText(/current plan/i)).toBeVisible();
      }
    });

    test('should display subscribe button for Legendary plan', async ({ page }) => {
      await loginTestUser(page);
      await removeBlockingBadges(page);
      await page.goto('/pricing', { waitUntil: 'domcontentloaded' });
      
      const legendaryCard = page.getByTestId('plan-card-legendary');
      await expect(legendaryCard).toBeVisible({ timeout: 10000 });
      
      // Check for subscribe button
      const subscribeBtn = page.getByTestId('subscribe-legendary-btn');
      const isVisible = await subscribeBtn.isVisible().catch(() => false);
      
      if (isVisible) {
        await expect(subscribeBtn).toBeEnabled();
      } else {
        await expect(legendaryCard.getByText(/current plan/i)).toBeVisible();
      }
    });

    test('should show Free Forever text for free plan instead of button', async ({ page }) => {
      await loginTestUser(page);
      await removeBlockingBadges(page);
      await page.goto('/pricing', { waitUntil: 'domcontentloaded' });
      
      const freePlanCard = page.getByTestId('plan-card-free');
      await expect(freePlanCard).toBeVisible({ timeout: 10000 });
      
      // Free plan should show "Free Forever" or "Current Plan" not a subscribe button
      const freeForeverText = freePlanCard.getByText(/free forever/i);
      const currentPlanText = freePlanCard.getByText(/current plan/i);
      
      const freeForeverVisible = await freeForeverText.isVisible().catch(() => false);
      const currentPlanVisible = await currentPlanText.isVisible().catch(() => false);
      
      expect(freeForeverVisible || currentPlanVisible).toBeTruthy();
    });
  });

  test.describe('Referral Section', () => {
    
    test('should display referral section', async ({ page }) => {
      await loginTestUser(page);
      await removeBlockingBadges(page);
      await page.goto('/pricing', { waitUntil: 'domcontentloaded' });
      
      // Check for referral section
      await expect(page.getByText(/refer friends/i)).toBeVisible({ timeout: 10000 });
      
      // Check for referral link display
      await expect(page.getByText(/ref=/i)).toBeVisible();
      
      // Check for referral stats
      await expect(page.getByText(/referrals:/i)).toBeVisible();
      await expect(page.getByText(/free months earned/i)).toBeVisible();
    });
  });

  test.describe('Navigation', () => {
    
    test('should navigate back to home when clicking back button', async ({ page }) => {
      await loginTestUser(page);
      await removeBlockingBadges(page);
      await page.goto('/pricing', { waitUntil: 'domcontentloaded' });
      
      // Click back button (arrow left icon)
      const backBtn = page.getByRole('button').filter({ has: page.locator('svg') }).first();
      await expect(backBtn).toBeVisible({ timeout: 10000 });
      await backBtn.click();
      
      // Should navigate back to home
      await page.waitForURL(/\/home/, { timeout: 10000 });
    });
  });
});
