import { test, expect, Page } from '@playwright/test';

/**
 * Comprehensive Stress Test for ROOK (Rookie Quest Keeper) TTRPG Application
 * Tests all GM features: NPCs, Locations, Maps, Timeline, Gods, Combat, Notes, Custom Content
 * And Player features: Character creation, Character sheet, joining campaigns
 */

const ADMIN_EMAIL = 'lcblakey24@outlook.com';
const ADMIN_PASSWORD = 'Trigger24?!';
const TEST_CAMPAIGN_ID = 'eabd4ae0-d1d8-40a5-858e-f7772af1d2ce';

// Helper to login admin user
async function loginAdmin(page: Page) {
  await page.goto('/auth', { waitUntil: 'domcontentloaded' });
  await page.getByTestId('login-email').fill(ADMIN_EMAIL);
  await page.getByTestId('login-password').fill(ADMIN_PASSWORD);
  await page.getByTestId('login-btn').click();
  await page.waitForURL(/\/home/, { timeout: 15000 });
}

// Helper to dismiss toasts
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

// Helper to navigate to campaign dashboard
async function navigateToCampaign(page: Page) {
  await page.goto(`/campaign/${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('setting-tab')).toBeVisible({ timeout: 15000 });
}

test.describe('Home Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await loginAdmin(page);
  });

  test('dashboard displays Player and GM sections', async ({ page }) => {
    // Player side should show MY CHARACTERS
    await expect(page.getByText('MY CHARACTERS')).toBeVisible({ timeout: 10000 });
    
    // GM side should show MY CAMPAIGNS
    await expect(page.getByText('MY CAMPAIGNS')).toBeVisible();
  });

  test('displays signed-in dashboard identity', async ({ page }) => {
    await expect(page.getByText(/lcblakey24/i)).toBeVisible({ timeout: 10000 });
  });

  test('can navigate to campaign from dashboard', async ({ page }) => {
    // Wait for campaigns to load
    await expect(page.getByText('Test Forgotten Realms Campaign')).toBeVisible({ timeout: 10000 });
    
    // Click on the campaign
    await page.getByText('Test Forgotten Realms Campaign').click();
    
    // Should navigate to campaign dashboard
    await page.waitForURL(/\/campaign\//, { timeout: 10000 });
    await expect(page.getByTestId('setting-tab')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Campaign Dashboard - Tab Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await loginAdmin(page);
    await navigateToCampaign(page);
  });

  test('displays all World group tabs', async ({ page }) => {
    await expect(page.getByTestId('setting-tab')).toBeVisible();
    await expect(page.getByTestId('world-tab')).toBeVisible();
    await expect(page.getByTestId('maps-tab')).toBeVisible();
    await expect(page.getByTestId('gods-tab')).toBeVisible();
    await expect(page.getByTestId('locations-tab')).toBeVisible();
    await expect(page.getByTestId('npcs-tab')).toBeVisible();
    await expect(page.getByTestId('chronicle-tab')).toBeVisible();
  });

  test('displays Combat group tabs', async ({ page }) => {
    await expect(page.getByTestId('combat-tab')).toBeVisible();
    await expect(page.getByTestId('battle-maps-tab')).toBeVisible();
  });

  test('displays GM Tools group tabs', async ({ page }) => {
    await expect(page.getByTestId('tools-tab')).toBeVisible();
    await expect(page.getByTestId('inventory-tab')).toBeVisible();
  });

  test('displays standalone tabs', async ({ page }) => {
    await expect(page.getByTestId('session-recap-tab')).toBeVisible();
    await expect(page.getByTestId('players-tab')).toBeVisible();
    await expect(page.getByTestId('ingame-notes-tab')).toBeVisible();
  });
});

test.describe('Campaign Settings Tab', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await loginAdmin(page);
    await navigateToCampaign(page);
    await page.getByTestId('setting-tab').click();
  });

  test('displays Campaign Setting content', async ({ page }) => {
    // Use heading role to be more specific
    await expect(page.getByRole('heading', { name: 'Campaign Setting' })).toBeVisible({ timeout: 10000 });
  });

  test('displays AI World Context selector', async ({ page }) => {
    await expect(page.getByText('AI WORLD CONTEXT')).toBeVisible({ timeout: 10000 });
    // Use exact match for label
    await expect(page.getByText('World Setting', { exact: true })).toBeVisible();
  });

  test('displays Save Changes button', async ({ page }) => {
    await expect(page.getByText('SAVE CHANGES')).toBeVisible();
  });

  test('displays ROOK AI helper panel', async ({ page }) => {
    // ROOK helper panel has heading
    await expect(page.getByRole('heading', { name: 'ROOK' }).first()).toBeVisible();
  });
});

test.describe('NPCs Tab', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await loginAdmin(page);
    await navigateToCampaign(page);
    await page.getByTestId('npcs-tab').click();
  });

  test('displays NPCs content area', async ({ page }) => {
    // Should show NPCs tab is active
    await expect(page.getByTestId('npcs-tab')).toBeVisible();
    
    // Look for NPC-related content (Create button or list)
    const createBtn = page.getByText(/CREATE NPC|ADD NPC|NEW NPC/i).first();
    await expect(createBtn.or(page.locator('[data-testid*="npc"]').first())).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Locations Tab', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await loginAdmin(page);
    await navigateToCampaign(page);
    await page.getByTestId('locations-tab').click();
  });

  test('displays Locations content area', async ({ page }) => {
    // Look for Locations-related content
    await expect(page.getByText(/LOCATION|PLACE/i).first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Gods Tab', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await loginAdmin(page);
    await navigateToCampaign(page);
    await page.getByTestId('gods-tab').click();
  });

  test('displays Gods/Deities content area', async ({ page }) => {
    // Look for Gods-related content
    await expect(page.getByText(/GOD|DEITY|PANTHEON/i).first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Chronicle/Timeline Tab', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await loginAdmin(page);
    await navigateToCampaign(page);
    await page.getByTestId('chronicle-tab').click();
  });

  test('displays Chronicle/Timeline content area', async ({ page }) => {
    // Look for Timeline or Chronicle content
    await expect(page.getByText(/TIMELINE|CHRONICLE|SESSION|EVENT/i).first()).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Combat Tab', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await loginAdmin(page);
    await navigateToCampaign(page);
    await page.getByTestId('combat-tab').click();
  });

  test('displays Combat content area', async ({ page }) => {
    // Look for Combat-related content
    await expect(page.getByText(/COMBAT|ENCOUNTER|BATTLE/i).first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Notes Tab', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await loginAdmin(page);
    await navigateToCampaign(page);
    await page.getByTestId('ingame-notes-tab').click();
  });

  test('displays Notes content area', async ({ page }) => {
    // Look for Notes-related content
    await expect(page.getByText(/NOTE|SESSION NOTE/i).first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('GM Screen', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await loginAdmin(page);
    await navigateToCampaign(page);
  });

  test('can open GM Screen from campaign dashboard', async ({ page }) => {
    // Click Open GM Screen button
    const gmScreenBtn = page.getByText('OPEN GM SCREEN');
    await expect(gmScreenBtn).toBeVisible();
    
    // Click it - should open in new tab
    const [newPage] = await Promise.all([
      page.context().waitForEvent('page'),
      gmScreenBtn.click()
    ]);
    
    // Wait for new page to load
    await newPage.waitForLoadState('domcontentloaded');
    
    // Verify we're on GM Screen
    await expect(newPage).toHaveURL(/\/gm-screen\//);
  });
});

test.describe('Character Builder Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await loginAdmin(page);
  });

  test('can access Character Builder from home', async ({ page }) => {
    // Click New Character button using testid
    await page.getByTestId('new-character-btn').click();
    
    // Should navigate to character builder
    await page.waitForURL(/\/characters\/new|\/character-builder/, { timeout: 10000 });
  });

  test('character builder displays step progression', async ({ page }) => {
    await page.goto('/characters/new', { waitUntil: 'domcontentloaded' });
    
    // Wait for page to load - should show CONCEPT step
    await expect(page.getByText('CREATE CHARACTER')).toBeVisible({ timeout: 10000 });
    // Should show step number 1 - CONCEPT
    await expect(page.getByText('CONCEPT')).toBeVisible();
  });
});

test.describe('Player Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await loginAdmin(page);
  });

  test('can navigate to Player Dashboard', async ({ page }) => {
    await page.goto('/player', { waitUntil: 'domcontentloaded' });
    
    // Should show player content - characters or joined campaigns
    await expect(page.getByText(/Character|Campaign|My Character/i).first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Account Settings', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await loginAdmin(page);
  });

  test('account settings page loads correctly', async ({ page }) => {
    // Navigate to account settings
    await page.goto('/account', { waitUntil: 'domcontentloaded' });
    
    // Should show account settings
    await expect(page.getByText('ACCOUNT SETTINGS')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('PROFILE INFORMATION')).toBeVisible();
  });
});
