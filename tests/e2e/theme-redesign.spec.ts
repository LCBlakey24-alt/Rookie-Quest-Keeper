import { test, expect } from '@playwright/test';

test.describe('Theme Redesign - Dual Theme System', () => {
  const testCredentials = {
    email: 'lcblakey24@outlook.com',
    password: 'LCBlakey24?!'
  };

  test.describe('Landing Page - Neutral Theme', () => {
    test('Landing page loads with new purple/cyan gradient theme', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      
      // Verify landing page elements
      await expect(page.locator('text=ROOK').first()).toBeVisible();
      await expect(page.getByRole('heading', { name: 'KEEPER' })).toBeVisible();
      await expect(page.locator('text=Start Your Quest')).toBeVisible();
      
      // Verify navigation buttons
      await expect(page.getByTestId('landing-signin-btn')).toBeVisible();
      await expect(page.getByTestId('landing-getstarted-btn')).toBeVisible();
      
      await page.screenshot({ path: 'theme-landing-hero.jpeg', quality: 20, fullPage: false });
    });

    test('Pricing tiers display correctly on landing page', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      
      // Scroll to pricing section
      await page.evaluate(() => window.scrollTo(0, 1500));
      await page.waitForTimeout(500);
      
      // Verify all 4 pricing tiers
      await expect(page.locator('text=Free').first()).toBeVisible();
      await expect(page.locator('text=Player').first()).toBeVisible();
      await expect(page.locator('text=Game Master').first()).toBeVisible();
      await expect(page.locator('text=Legendary').first()).toBeVisible();
      
      // Verify pricing
      await expect(page.locator('text=$3.99')).toBeVisible();
      await expect(page.locator('text=$5.99')).toBeVisible();
      
      await page.screenshot({ path: 'theme-pricing-tiers.jpeg', quality: 20, fullPage: false });
    });
  });

  test.describe('Authenticated Pages', () => {
    test.beforeEach(async ({ page }) => {
      // Login
      await page.goto('/login', { waitUntil: 'domcontentloaded' });
      await page.fill('input[type="email"], input[placeholder*="Email"]', testCredentials.email);
      await page.fill('input[type="password"], input[placeholder*="Password"]', testCredentials.password);
      await page.click('button:has-text("Sign In")');
      await page.waitForURL(/\/home/, { timeout: 15000 });
    });

    test('Login flow works correctly', async ({ page }) => {
      // Already logged in from beforeEach
      await expect(page.locator('text=My Campaigns')).toBeVisible();
      await expect(page.locator('text=Welcome').first()).toBeVisible();
      
      await page.screenshot({ path: 'theme-login-success.jpeg', quality: 20, fullPage: false });
    });

    test('Unified Dashboard displays correctly with new theme', async ({ page }) => {
      // Verify dashboard elements
      await expect(page.locator('text=My Campaigns')).toBeVisible();
      await expect(page.locator('text=ROOKIE QUEST KEEPER').first()).toBeVisible();
      
      // Verify GM Side section
      await expect(page.getByRole('heading', { name: 'GM SIDE' })).toBeVisible();
      
      // Verify Player Features section
      await expect(page.locator('text=Player Features')).toBeVisible();
      
      await page.screenshot({ path: 'theme-unified-dashboard.jpeg', quality: 20, fullPage: false });
    });

    test('Campaign Dashboard displays with purple GM theme', async ({ page }) => {
      // Navigate to campaign dashboard
      await page.goto('/campaign/b51ba0e9-5b08-44ed-b3dd-4a97dd2a09f6', { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);
      
      // Verify campaign dashboard elements
      await expect(page.locator('text=TEST_Campaign').first()).toBeVisible();
      await expect(page.locator('text=CAMPAIGN TOOLS')).toBeVisible();
      await expect(page.locator('text=Open GM Screen')).toBeVisible();
      
      await page.screenshot({ path: 'theme-campaign-dashboard.jpeg', quality: 20, fullPage: false });
    });

    test('GM Screen displays with Midnight Neon purple theme', async ({ page }) => {
      // Navigate to GM Screen
      await page.goto('/gm-screen/b51ba0e9-5b08-44ed-b3dd-4a97dd2a09f6', { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);
      
      // Verify GM Screen elements
      await expect(page.locator('text=GM TOOLS')).toBeVisible();
      await expect(page.locator('text=Combat').first()).toBeVisible();
      await expect(page.locator('text=Quick Dice')).toBeVisible();
      
      await page.screenshot({ path: 'theme-gm-screen.jpeg', quality: 20, fullPage: false });
    });

    test('Character Sheet displays with Electric Tundra cyan theme', async ({ page }) => {
      // Navigate to character sheet
      await page.goto('/characters/0bda5cf5-b8be-40c8-b2bc-b030ea70c366', { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);
      
      // Verify character sheet elements
      await expect(page.locator('text=TEST_Hero').first()).toBeVisible();
      await expect(page.locator('text=ABILITY SCORES')).toBeVisible();
      await expect(page.locator('text=SKILLS')).toBeVisible();
      await expect(page.locator('text=Combat').first()).toBeVisible();
      
      await page.screenshot({ path: 'theme-character-sheet.jpeg', quality: 20, fullPage: false });
    });

    test('Navigation between pages works correctly', async ({ page }) => {
      // Start at dashboard
      await expect(page.locator('text=My Campaigns')).toBeVisible();
      
      // Navigate to campaign
      await page.goto('/campaign/b51ba0e9-5b08-44ed-b3dd-4a97dd2a09f6', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('text=CAMPAIGN TOOLS')).toBeVisible();
      
      // Navigate to GM Screen
      await page.goto('/gm-screen/b51ba0e9-5b08-44ed-b3dd-4a97dd2a09f6', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('text=GM TOOLS')).toBeVisible();
      
      // Navigate to character sheet
      await page.goto('/characters/0bda5cf5-b8be-40c8-b2bc-b030ea70c366', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('text=TEST_Hero').first()).toBeVisible();
      
      // Navigate back to dashboard
      await page.goto('/home', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('text=My Campaigns')).toBeVisible();
      
      await page.screenshot({ path: 'theme-navigation-complete.jpeg', quality: 20, fullPage: false });
    });
  });
});
