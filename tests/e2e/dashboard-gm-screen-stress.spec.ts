import { test, expect, Page } from '@playwright/test';

test.beforeEach(() => {
  test.skip(!process.env.RQK_E2E_EMAIL || !process.env.RQK_E2E_PASSWORD, 'Requires RQK_E2E_EMAIL and RQK_E2E_PASSWORD');
});

/**
 * ROOK Stress Test - Dashboard & GM Screen
 * Tests navigation, campaign creation, and GM Screen functionality
 */

const TEST_USER = {
  email: (process.env.RQK_E2E_EMAIL || ''),
  password: (process.env.RQK_E2E_PASSWORD || '')
};

async function loginUser(page: Page) {
  await page.goto('/auth', { waitUntil: 'domcontentloaded' });
  await page.getByTestId('login-email').fill(TEST_USER.email);
  await page.getByTestId('login-password').fill(TEST_USER.password);
  await page.getByTestId('login-btn').click();
  await page.waitForURL(/\/home/, { timeout: 15000 });
}

async function dismissToasts(page: Page) {
  await page.addLocatorHandler(
    page.locator('[data-sonner-toast]').first(),
    async (toast) => {
      const close = toast.locator('[data-close], button[aria-label="Close"]');
      await close.first().click({ timeout: 1000 }).catch(() => {});
    },
    { times: 20, noWaitAfter: true }
  );
}

test.describe('Auth Flow', () => {
  test('can login with valid credentials', async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    
    // Auth page should show login form
    await expect(page.getByTestId('login-email')).toBeVisible();
    await expect(page.getByTestId('login-password')).toBeVisible();
    await expect(page.getByTestId('login-btn')).toBeVisible();
    
    // Login
    await page.getByTestId('login-email').fill(TEST_USER.email);
    await page.getByTestId('login-password').fill(TEST_USER.password);
    await page.getByTestId('login-btn').click();
    
    // Should redirect to home
    await page.waitForURL(/\/home/, { timeout: 15000 });
    await expect(page.getByText(/my characters/i)).toBeVisible({ timeout: 10000 });
  });

  test('auth page displays Fantasy Sunset theme', async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    
    // ROOK logo should be visible
    await expect(page.getByText(/rook/i).first()).toBeVisible();
    
    // Welcome message
    await expect(page.getByText(/welcome back/i)).toBeVisible();
  });
});

test.describe('Dashboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await loginUser(page);
  });

  test('dashboard displays Player and GM sections', async ({ page }) => {
    // Player side
    await expect(page.getByText(/my characters/i)).toBeVisible({ timeout: 10000 });
    
    // GM side
    await expect(page.getByText(/my campaigns/i)).toBeVisible({ timeout: 10000 });
  });

  test('new character button is visible and clickable', async ({ page }) => {
    await expect(page.getByTestId('new-character-btn')).toBeVisible({ timeout: 10000 });
    await page.getByTestId('new-character-btn').click();
    
    // Should navigate to character builder - use heading to avoid matching button
    await expect(page.getByRole('heading', { name: /create character/i })).toBeVisible({ timeout: 10000 });
  });

  test('new campaign button is visible', async ({ page }) => {
    await expect(page.getByTestId('new-campaign-btn')).toBeVisible({ timeout: 10000 });
  });

  test('can navigate to character sheet from dashboard', async ({ page }) => {
    const charCard = page.locator('[data-testid^="character-"]').first();
    
    if (await charCard.isVisible({ timeout: 5000 })) {
      await charCard.click();
      // Should show character sheet
      await expect(page.getByText(/ability scores/i)).toBeVisible({ timeout: 10000 });
    }
  });
});

test.describe('Campaign Creation', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await loginUser(page);
  });

  test('can create a new campaign', async ({ page }) => {
    // Navigate to campaigns
    await page.goto('/campaigns', { waitUntil: 'domcontentloaded' });
    
    // Click Create Campaign
    await page.getByRole('button', { name: /create campaign/i }).first().click();
    
    // Fill in campaign details
    const uniqueName = `TEST_Campaign_${Date.now()}`;
    await page.getByPlaceholder(/campaign name/i).fill(uniqueName);
    await page.getByPlaceholder(/description/i).fill('Test campaign');
    
    // Submit
    await page.locator('button:has-text("Create Campaign")').nth(1).click();
    
    // Should show success
    await expect(page.getByText(/campaign created/i)).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Campaign Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await loginUser(page);
  });

  test('campaign dashboard has sidebar with all tabs', async ({ page }) => {
    // Navigate to campaigns
    await page.goto('/campaigns', { waitUntil: 'domcontentloaded' });
    
    // Open first campaign if exists
    const openBtn = page.getByRole('button', { name: /open campaign/i }).first();
    if (await openBtn.isVisible({ timeout: 5000 })) {
      await openBtn.click();
      
      // Should show campaign dashboard with sidebar
      await expect(page.getByText(/world/i)).toBeVisible({ timeout: 10000 });
      await expect(page.getByText(/combat/i)).toBeVisible();
    }
  });

  test('can navigate to GM Screen from campaign dashboard', async ({ page }) => {
    await page.goto('/campaigns', { waitUntil: 'domcontentloaded' });
    
    const openBtn = page.getByRole('button', { name: /open campaign/i }).first();
    if (await openBtn.isVisible({ timeout: 5000 })) {
      await openBtn.click();
      
      // Click Open GM Screen button
      const gmScreenBtn = page.getByRole('button', { name: /open gm screen/i });
      if (await gmScreenBtn.isVisible({ timeout: 5000 })) {
        await gmScreenBtn.click();
        
        // Should navigate to GM Screen
        await expect(page.getByText(/combat control/i)).toBeVisible({ timeout: 15000 });
      }
    }
  });
});

test.describe('GM Screen Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await loginUser(page);
  });

  test('GM Screen loads with Combat Control panel', async ({ page }) => {
    // Get campaign ID first
    await page.goto('/campaigns', { waitUntil: 'domcontentloaded' });
    
    const openBtn = page.getByRole('button', { name: /open campaign/i }).first();
    if (await openBtn.isVisible({ timeout: 5000 })) {
      await openBtn.click();
      
      // Get the campaign ID from the URL
      await page.waitForURL(/\/campaign\//, { timeout: 10000 });
      const url = page.url();
      const campaignId = url.match(/campaign\/([^/]+)/)?.[1];
      
      if (campaignId) {
        // Navigate to GM Screen
        await page.goto(`/gm-screen/${campaignId}`, { waitUntil: 'domcontentloaded' });
        
        // Should show Combat Control
        await expect(page.getByText(/combat control/i)).toBeVisible({ timeout: 15000 });
      }
    }
  });

  test('GM Screen has all GM Tools tabs', async ({ page }) => {
    await page.goto('/campaigns', { waitUntil: 'domcontentloaded' });
    
    const openBtn = page.getByRole('button', { name: /open campaign/i }).first();
    if (await openBtn.isVisible({ timeout: 5000 })) {
      await openBtn.click();
      await page.waitForURL(/\/campaign\//, { timeout: 10000 });
      const url = page.url();
      const campaignId = url.match(/campaign\/([^/]+)/)?.[1];
      
      if (campaignId) {
        await page.goto(`/gm-screen/${campaignId}`, { waitUntil: 'domcontentloaded' });
        
        // Check sidebar tabs
        await expect(page.getByText(/combat/i).first()).toBeVisible({ timeout: 10000 });
        await expect(page.getByText(/location/i)).toBeVisible();
        await expect(page.getByText(/npcs/i)).toBeVisible();
        await expect(page.getByText(/dice/i)).toBeVisible();
        await expect(page.getByText(/monsters/i)).toBeVisible();
      }
    }
  });

  test('GM Screen has combat start options', async ({ page }) => {
    await page.goto('/campaigns', { waitUntil: 'domcontentloaded' });
    
    const openBtn = page.getByRole('button', { name: /open campaign/i }).first();
    if (await openBtn.isVisible({ timeout: 5000 })) {
      await openBtn.click();
      await page.waitForURL(/\/campaign\//, { timeout: 10000 });
      const url = page.url();
      const campaignId = url.match(/campaign\/([^/]+)/)?.[1];
      
      if (campaignId) {
        await page.goto(`/gm-screen/${campaignId}`, { waitUntil: 'domcontentloaded' });
        
        // Check combat options
        await expect(page.getByText(/start combat/i)).toBeVisible({ timeout: 10000 });
        await expect(page.getByText(/quick start/i)).toBeVisible();
        await expect(page.getByTestId('spontaneous-combat-btn')).toBeVisible();
      }
    }
  });

  test('GM Screen Name Generator tab works', async ({ page }) => {
    await page.goto('/campaigns', { waitUntil: 'domcontentloaded' });
    
    const openBtn = page.getByRole('button', { name: /open campaign/i }).first();
    if (await openBtn.isVisible({ timeout: 5000 })) {
      await openBtn.click();
      await page.waitForURL(/\/campaign\//, { timeout: 10000 });
      const url = page.url();
      const campaignId = url.match(/campaign\/([^/]+)/)?.[1];
      
      if (campaignId) {
        await page.goto(`/gm-screen/${campaignId}`, { waitUntil: 'domcontentloaded' });
        
        // Click Names tab
        const namesTab = page.getByText(/names/i);
        if (await namesTab.isVisible({ timeout: 5000 })) {
          await namesTab.click();
          
          // Should show name generator UI
          await expect(page.getByTestId('generate-name-btn')).toBeVisible({ timeout: 10000 });
        }
      }
    }
  });
});

test.describe('UI Theme Verification', () => {
  test('landing page has Fantasy Sunset theme', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    
    // ROOK branding - use heading to avoid matching footer
    await expect(page.getByRole('heading', { name: /rookie quest/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('heading', { name: /keeper/i })).toBeVisible();
    
    // Start button
    await expect(page.getByText(/start your quest/i)).toBeVisible();
  });

  test('dashboard has consistent theme styling', async ({ page }) => {
    await dismissToasts(page);
    await loginUser(page);
    
    // Header should have app name
    await expect(page.getByText(/rookie quest keeper/i)).toBeVisible({ timeout: 10000 });
    
    // Should have themed sections
    await expect(page.getByText(/my characters/i)).toBeVisible();
    await expect(page.getByText(/my campaigns/i)).toBeVisible();
  });
});
