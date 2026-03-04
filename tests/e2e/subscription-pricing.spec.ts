import { test, expect } from '@playwright/test';
import { dismissToasts, hideEmergentBadge, generateTestUsername, TEST_USER, loginTestUser } from '../fixtures/helpers';

const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'https://ttrpg-combat-fix.preview.emergentagent.com';

test.describe('Subscription & Pricing Features', () => {
  
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
  });

  test.describe('Pricing Page Display', () => {
    
    test('should display pricing page with plan cards after login', async ({ page }) => {
      // Login first
      await loginTestUser(page);
      await hideEmergentBadge(page);
      
      // Navigate to pricing page
      await page.goto('/pricing', { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('domcontentloaded');
      
      // Verify page title
      await expect(page.getByText('Choose Your Adventure')).toBeVisible({ timeout: 10000 });
      
      // Verify plan cards are displayed
      await expect(page.getByTestId('plan-card-free')).toBeVisible();
      await expect(page.getByTestId('plan-card-adventurer')).toBeVisible();
      
      // Take screenshot
      await page.screenshot({ path: 'pricing-page.jpeg', quality: 20, fullPage: false });
    });

    test('should display Free plan with correct info', async ({ page }) => {
      await loginTestUser(page);
      await hideEmergentBadge(page);
      await page.goto('/pricing', { waitUntil: 'domcontentloaded' });
      
      const freePlanCard = page.getByTestId('plan-card-free');
      await expect(freePlanCard).toBeVisible({ timeout: 10000 });
      
      // Check plan name
      await expect(freePlanCard.getByText('Free')).toBeVisible();
      
      // Check price ($0)
      await expect(freePlanCard.getByText('$0')).toBeVisible();
      
      // Check for feature mentions
      await expect(freePlanCard.getByText(/2 campaigns/i)).toBeVisible();
      await expect(freePlanCard.getByText(/5 AI/i)).toBeVisible();
    });

    test('should display Adventurer plan with correct info', async ({ page }) => {
      await loginTestUser(page);
      await hideEmergentBadge(page);
      await page.goto('/pricing', { waitUntil: 'domcontentloaded' });
      
      const adventurerCard = page.getByTestId('plan-card-adventurer');
      await expect(adventurerCard).toBeVisible({ timeout: 10000 });
      
      // Check plan name
      await expect(adventurerCard.getByText('Adventurer')).toBeVisible();
      
      // Check price ($3.99)
      await expect(adventurerCard.getByText('$3.99')).toBeVisible();
      
      // Check "Most Popular" badge
      await expect(adventurerCard.getByText(/most popular/i)).toBeVisible();
      
      // Check for feature mentions
      await expect(adventurerCard.getByText(/unlimited/i).first()).toBeVisible();
    });

    test('should display current subscription status', async ({ page }) => {
      await loginTestUser(page);
      await hideEmergentBadge(page);
      await page.goto('/pricing', { waitUntil: 'domcontentloaded' });
      
      // Check for current plan section (use more specific text to avoid multiple matches)
      await expect(page.getByText('Current Plan:')).toBeVisible({ timeout: 10000 });
    });

    test('should have back button that navigates to campaigns', async ({ page }) => {
      await loginTestUser(page);
      await hideEmergentBadge(page);
      await page.goto('/pricing', { waitUntil: 'domcontentloaded' });
      
      const backBtn = page.getByTestId('back-btn');
      await expect(backBtn).toBeVisible({ timeout: 10000 });
      await backBtn.click();
      
      // Should navigate back to campaigns
      await page.waitForURL(/\/campaigns/, { timeout: 10000 });
    });
  });

  test.describe('Promo Code Functionality', () => {
    
    test('should display promo code input section', async ({ page }) => {
      await loginTestUser(page);
      await hideEmergentBadge(page);
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

    test('should allow entering promo code', async ({ page }) => {
      await loginTestUser(page);
      await hideEmergentBadge(page);
      await page.goto('/pricing', { waitUntil: 'domcontentloaded' });
      
      const promoInput = page.getByTestId('promo-code-input');
      await expect(promoInput).toBeVisible({ timeout: 10000 });
      
      // Type a test promo code
      await promoInput.fill('TESTCODE123');
      await expect(promoInput).toHaveValue('TESTCODE123');
    });

    test('should show error for empty promo code submission', async ({ page }) => {
      await loginTestUser(page);
      await hideEmergentBadge(page);
      await page.goto('/pricing', { waitUntil: 'domcontentloaded' });
      
      const applyBtn = page.getByTestId('apply-promo-btn');
      await expect(applyBtn).toBeVisible({ timeout: 10000 });
      
      // Click apply without entering code
      await applyBtn.click();
      
      // Should show toast error
      await expect(page.getByText(/enter a promo code/i)).toBeVisible({ timeout: 5000 });
    });

    test('should show error for invalid promo code', async ({ page }) => {
      await loginTestUser(page);
      await hideEmergentBadge(page);
      await page.goto('/pricing', { waitUntil: 'domcontentloaded' });
      
      const promoInput = page.getByTestId('promo-code-input');
      const applyBtn = page.getByTestId('apply-promo-btn');
      
      await expect(promoInput).toBeVisible({ timeout: 10000 });
      
      // Enter invalid promo code
      await promoInput.fill('INVALIDCODE99999');
      await applyBtn.click();
      
      // Should show error toast
      await expect(page.getByText(/invalid promo code/i)).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Premium Badge in Campaign List', () => {
    
    test('should display pricing button in campaign list header', async ({ page }) => {
      await loginTestUser(page);
      await hideEmergentBadge(page);
      
      // Go to campaigns page
      await page.goto('/campaigns', { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('domcontentloaded');
      
      // Check for pricing button
      const pricingBtn = page.getByTestId('pricing-btn');
      await expect(pricingBtn).toBeVisible({ timeout: 10000 });
    });

    test('should navigate to pricing page when clicking pricing button', async ({ page }) => {
      await loginTestUser(page);
      await hideEmergentBadge(page);
      
      await page.goto('/campaigns', { waitUntil: 'domcontentloaded' });
      
      const pricingBtn = page.getByTestId('pricing-btn');
      await expect(pricingBtn).toBeVisible({ timeout: 10000 });
      await pricingBtn.click();
      
      // Should navigate to pricing page
      await page.waitForURL(/\/pricing/, { timeout: 10000 });
      await expect(page.getByText('Choose Your Adventure')).toBeVisible();
    });

    test('should show appropriate badge text based on subscription', async ({ page }) => {
      await loginTestUser(page);
      await hideEmergentBadge(page);
      
      await page.goto('/campaigns', { waitUntil: 'domcontentloaded' });
      
      const pricingBtn = page.getByTestId('pricing-btn');
      await expect(pricingBtn).toBeVisible({ timeout: 10000 });
      
      // For testdm1 user, check if badge shows "Adventurer" or "Upgrade"
      // The text depends on user's subscription status
      const buttonText = await pricingBtn.textContent();
      expect(buttonText?.toLowerCase()).toMatch(/(adventurer|upgrade)/i);
      
      // Take screenshot of campaign list with badge
      await page.screenshot({ path: 'campaign-list-badge.jpeg', quality: 20, fullPage: false });
    });
  });

  test.describe('Checkout Button', () => {
    
    test('should display upgrade button for Adventurer plan', async ({ page }) => {
      await loginTestUser(page);
      await hideEmergentBadge(page);
      await page.goto('/pricing', { waitUntil: 'domcontentloaded' });
      
      const adventurerCard = page.getByTestId('plan-card-adventurer');
      await expect(adventurerCard).toBeVisible({ timeout: 10000 });
      
      // Check for checkout/upgrade button (if user is not already premium)
      // The button might say "Current Plan" if user is already adventurer
      // or "Upgrade Now" if user is on free tier
      const upgradeBtn = page.getByTestId('checkout-btn-adventurer');
      const currentPlanBtn = adventurerCard.getByText(/current plan/i);
      
      // One of these should be visible
      const upgradeVisible = await upgradeBtn.isVisible().catch(() => false);
      const currentVisible = await currentPlanBtn.isVisible().catch(() => false);
      
      expect(upgradeVisible || currentVisible).toBeTruthy();
    });
  });
});

test.describe('Promo Code Full Flow (New User)', () => {
  
  test('should apply promo code and upgrade new user to premium', async ({ page }) => {
    // This test creates a new user and applies a promo code
    const uniqueId = Date.now().toString();
    const newUsername = `TEST_promo_e2e_${uniqueId}`;
    const promoCode = `TESTE2E${uniqueId}`;
    
    // First, create a promo code via API
    // Register a temp user to create the promo code
    const registerResponse = await page.request.post(`${BASE_URL}/api/auth/register`, {
      data: { username: `TEST_promo_creator_${uniqueId}`, password: 'testpass123' }
    });
    
    if (registerResponse.ok()) {
      const { token } = await registerResponse.json();
      
      // Create promo code
      await page.request.post(`${BASE_URL}/api/promo-codes`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { code: promoCode, tier_granted: 'adventurer', uses_remaining: 5 }
      });
    }
    
    // Register the test user via UI
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await dismissToasts(page);
    await hideEmergentBadge(page);
    
    // Switch to register mode
    await page.getByTestId('switch-to-register-btn').click();
    
    // Fill registration form
    await page.getByTestId('register-username-input').fill(newUsername);
    await page.getByTestId('register-password-input').fill('testpass123');
    await page.getByTestId('register-submit-btn').click();
    
    // Wait for redirect to campaigns
    await page.waitForURL(/\/campaigns/, { timeout: 15000 });
    
    // Navigate to pricing
    await page.goto('/pricing', { waitUntil: 'domcontentloaded' });
    await hideEmergentBadge(page);
    
    // Verify user starts on free tier
    await expect(page.getByText(/free/i).first()).toBeVisible({ timeout: 10000 });
    
    // Apply promo code
    const promoInput = page.getByTestId('promo-code-input');
    const applyBtn = page.getByTestId('apply-promo-btn');
    
    await promoInput.fill(promoCode);
    await applyBtn.click();
    
    // Should show success message
    await expect(page.getByText(/adventurer access/i)).toBeVisible({ timeout: 10000 });
    
    // Verify subscription status updated
    await page.reload();
    await hideEmergentBadge(page);
    
    // Current plan should now show Adventurer
    await expect(page.getByText(/adventurer/i).first()).toBeVisible({ timeout: 10000 });
    
    // Take screenshot of successful upgrade
    await page.screenshot({ path: 'promo-upgrade-success.jpeg', quality: 20, fullPage: false });
  });
});
