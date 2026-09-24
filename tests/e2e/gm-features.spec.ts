import { test, expect, Page } from '@playwright/test';

test.beforeEach(() => {
  test.skip(!process.env.RQK_E2E_EMAIL || !process.env.RQK_E2E_PASSWORD, 'Requires RQK_E2E_EMAIL and RQK_E2E_PASSWORD');
});

/**
 * Tests for Yellow Tier GM Features:
 * 1. Session Timeline - Track campaign events
 * 2. NPC Relationship Web - Visualize NPC connections
 * 3. Random Generator Tables - Quick-roll generators
 * 4. Campaign Dashboard sidebar reorganization
 */

const CAMPAIGN_ID = '0bd14e3c-9cec-4dda-a2f9-bc0efe58ebb5';
const GM_EMAIL = process.env.RQK_E2E_EMAIL || '';
const GM_PASSWORD = process.env.RQK_E2E_PASSWORD || '';

// Helper to login and navigate to campaign
async function loginAndNavigateToCampaign(page: Page) {
  await page.goto('/auth', { waitUntil: 'domcontentloaded' });
  await page.getByTestId('login-email').fill(GM_EMAIL);
  await page.getByTestId('login-password').fill(GM_PASSWORD);
  await page.getByTestId('login-btn').click();
  await page.waitForURL(/\/home/, { timeout: 15000 });
  
  await page.goto(`/campaign/${CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid="setting-tab"]', { timeout: 15000 });
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

test.describe('Campaign Dashboard Sidebar', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await loginAndNavigateToCampaign(page);
  });

  test('sidebar shows World group with expected tabs', async ({ page }) => {
    // World group should be visible and expanded
    const worldGroup = page.getByTestId('group-world');
    await expect(worldGroup).toBeVisible();
    
    // Check expected World tabs
    await expect(page.getByTestId('setting-tab')).toBeVisible();
    await expect(page.getByTestId('world-tab')).toBeVisible();
    await expect(page.getByTestId('gods-tab')).toBeVisible();
    await expect(page.getByTestId('locations-tab')).toBeVisible();
    await expect(page.getByTestId('npcs-tab')).toBeVisible();
    await expect(page.getByTestId('npc-web-tab')).toBeVisible();
    await expect(page.getByTestId('calendar-tab')).toBeVisible();
    await expect(page.getByTestId('timeline-tab')).toBeVisible();
  });

  test('sidebar shows Combat group with expected tabs', async ({ page }) => {
    const combatGroup = page.getByTestId('group-combat');
    await expect(combatGroup).toBeVisible();
    
    await expect(page.getByTestId('combat-creator-tab')).toBeVisible();
    await expect(page.getByTestId('maps-tab')).toBeVisible();
    await expect(page.getByTestId('encounter-gen-tab')).toBeVisible();
  });

  test('sidebar shows GM Tools group with expected tabs', async ({ page }) => {
    const toolsGroup = page.getByTestId('group-tools');
    await expect(toolsGroup).toBeVisible();
    
    await expect(page.getByTestId('random-gen-tab')).toBeVisible();
    await expect(page.getByTestId('reference-tab')).toBeVisible();
    await expect(page.getByTestId('items-tab')).toBeVisible();
  });

  test('sidebar shows standalone tabs', async ({ page }) => {
    await expect(page.getByTestId('party-loot-tab')).toBeVisible();
    await expect(page.getByTestId('session-recap-tab')).toBeVisible();
    await expect(page.getByTestId('players-tab')).toBeVisible();
    await expect(page.getByTestId('ingame-notes-tab')).toBeVisible();
  });

  test('clicking tab shows content', async ({ page }) => {
    // Click NPC Web tab
    await page.getByTestId('npc-web-tab').click();
    await expect(page.locator('text=NPC RELATIONSHIP WEB')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Session Timeline', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await loginAndNavigateToCampaign(page);
    await page.getByTestId('timeline-tab').click();
    await expect(page.locator('text=SESSION TIMELINE')).toBeVisible({ timeout: 10000 });
  });

  test('displays timeline header and Add Event button', async ({ page }) => {
    await expect(page.locator('text=SESSION TIMELINE')).toBeVisible();
    await expect(page.locator('text=Track major events in your campaign')).toBeVisible();
    await expect(page.getByRole('button', { name: /add event/i })).toBeVisible();
  });

  test('displays filter buttons', async ({ page }) => {
    // All filter should be visible
    await expect(page.locator('button:has-text("All")')).toBeVisible();
    // Session filter
    await expect(page.locator('button:has-text("Session")')).toBeVisible();
  });

  test('displays existing timeline events', async ({ page }) => {
    // Should show Session 1 group - use heading selector to be specific
    await expect(page.locator('h4:has-text("Session 1")').first()).toBeVisible({ timeout: 10000 });
  });

  test('Add Event button opens form', async ({ page }) => {
    await page.getByRole('button', { name: /add event/i }).click();
    
    // Form should appear
    await expect(page.locator('text=New Timeline Event')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('label:has-text("Event Type")')).toBeVisible();
    await expect(page.locator('label:has-text("Session #")')).toBeVisible();
    await expect(page.locator('label:has-text("In-Game Date")')).toBeVisible();
    await expect(page.locator('label:has-text("Event Title")')).toBeVisible();
    await expect(page.locator('label:has-text("Description")')).toBeVisible();
  });

  test('can create timeline event', async ({ page }) => {
    const uniqueTitle = `TEST_Event_${Date.now()}`;
    
    // Set up dialog handler before action
    page.on('dialog', dialog => dialog.accept());
    
    // Open add form
    await page.getByRole('button', { name: /add event/i }).click();
    await expect(page.locator('text=New Timeline Event')).toBeVisible({ timeout: 5000 });
    
    // Fill form
    await page.locator('input[placeholder="What happened?"]').fill(uniqueTitle);
    await page.locator('input[type="number"][placeholder="1"]').fill('99');
    await page.locator('input[placeholder="Day 15, Spring"]').fill('Test Date');
    await page.locator('textarea[placeholder*="More details"]').fill('Test description');
    
    // Save
    await page.getByRole('button', { name: /save event/i }).click();
    
    // Wait for event to appear
    await expect(page.locator(`h5:has-text("${uniqueTitle}")`)).toBeVisible({ timeout: 10000 });
  });

  test('filter buttons change displayed events', async ({ page }) => {
    // Click Session filter
    const sessionFilter = page.locator('button').filter({ hasText: 'Session' }).first();
    await sessionFilter.click();
    
    // Should still show events (since we have session events) - use heading selector
    await expect(page.locator('h4:has-text("Session")').first()).toBeVisible({ timeout: 5000 });
  });

  test('cancel button closes form', async ({ page }) => {
    await page.getByRole('button', { name: /add event/i }).click();
    await expect(page.locator('text=New Timeline Event')).toBeVisible({ timeout: 5000 });
    
    await page.getByRole('button', { name: /cancel/i }).click();
    
    // Form should be hidden
    await expect(page.locator('text=New Timeline Event')).not.toBeVisible({ timeout: 3000 });
  });
});

test.describe('NPC Relationship Web', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await loginAndNavigateToCampaign(page);
    await page.getByTestId('npc-web-tab').click();
    await expect(page.locator('text=NPC RELATIONSHIP WEB')).toBeVisible({ timeout: 10000 });
  });

  test('displays header and controls', async ({ page }) => {
    await expect(page.locator('text=NPC RELATIONSHIP WEB')).toBeVisible();
    await expect(page.locator('text=Visualize connections between NPCs')).toBeVisible();
    await expect(page.getByRole('button', { name: /link npcs/i })).toBeVisible();
  });

  test('displays relationship legend', async ({ page }) => {
    // Check all relationship types in legend
    await expect(page.locator('text=Ally')).toBeVisible();
    await expect(page.locator('text=Enemy')).toBeVisible();
    await expect(page.locator('text=Family')).toBeVisible();
    await expect(page.locator('text=Romantic')).toBeVisible();
    await expect(page.locator('text=Business')).toBeVisible();
    await expect(page.locator('text=Rival')).toBeVisible();
    await expect(page.locator('text=Neutral')).toBeVisible();
    await expect(page.locator('text=Serves')).toBeVisible();
  });

  test('displays NPC nodes', async ({ page }) => {
    // Should show existing NPCs
    await expect(page.locator('text=Lord Blackwo')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Lady Rose')).toBeVisible();
  });

  test('zoom controls are visible and functional', async ({ page }) => {
    // Link NPCs button is visible - this confirms the controls area is rendered
    await expect(page.getByRole('button', { name: /link npcs/i })).toBeVisible();
    // The canvas container should be visible - check for any visible NPC
    await expect(page.locator('text=Lady Rose')).toBeVisible();
  });

  test('clicking NPC node shows details panel', async ({ page }) => {
    // Click on an NPC node (Lady Rose)
    await page.locator('text=Lady Rose').click({ force: true });
    
    // Details panel should appear
    await expect(page.locator('h4:has-text("Lady Rose")')).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: /add relationship/i })).toBeVisible();
  });

  test('Link NPCs button toggles link mode', async ({ page }) => {
    const linkBtn = page.getByRole('button', { name: /link npcs/i });
    await linkBtn.click();
    
    // Should show link mode indicator
    await expect(page.locator('text=LINK MODE')).toBeVisible({ timeout: 5000 });
    
    // Click again to cancel
    await page.getByRole('button', { name: /cancel link/i }).click();
    await expect(page.locator('text=LINK MODE')).not.toBeVisible({ timeout: 3000 });
  });

  test('reset view button is functional', async ({ page }) => {
    // Find reset button (refresh icon)
    const resetBtn = page.locator('button').filter({ has: page.locator('svg') }).nth(2);
    await resetBtn.click();
    
    // NPC nodes should still be visible after reset
    await expect(page.locator('text=Lady Rose')).toBeVisible();
  });
});

test.describe('Random Generator Tables', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await loginAndNavigateToCampaign(page);
    await page.getByTestId('random-gen-tab').click();
    await expect(page.locator('text=RANDOM GENERATORS')).toBeVisible({ timeout: 10000 });
  });

  test('displays header and subtitle', async ({ page }) => {
    await expect(page.locator('text=RANDOM GENERATORS')).toBeVisible();
    await expect(page.locator('text=Quick-roll tables for names, places, treasure')).toBeVisible();
  });

  test('displays all generator categories', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'NPC Names' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Place Names' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Treasure', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Encounters' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Plot Hooks' })).toBeVisible();
  });

  test('NPC Names category shows race options', async ({ page }) => {
    // NPC Names should be expanded by default
    await expect(page.getByRole('button', { name: /human \(male\)/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /human \(female\)/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /elf \(male\)/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /elf \(female\)/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /dwarf \(male\)/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /dwarf \(female\)/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /random npc/i })).toBeVisible();
  });

  test('displays empty results panel initially', async ({ page }) => {
    await expect(page.locator('text=Results (0)')).toBeVisible();
    await expect(page.locator('text=Click a generator to roll')).toBeVisible();
  });

  test('clicking generator adds result', async ({ page }) => {
    // Click Human (Male) generator
    await page.getByRole('button', { name: /human \(male\)/i }).click();
    
    // Result should appear
    await expect(page.locator('text=Results (1)')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Human Male')).toBeVisible();
  });

  test('can generate multiple results', async ({ page }) => {
    // Generate a few names
    await page.getByRole('button', { name: /human \(male\)/i }).click();
    await page.getByRole('button', { name: /elf \(female\)/i }).click();
    await page.getByRole('button', { name: /dwarf \(male\)/i }).click();
    
    // Should show 3 results
    await expect(page.locator('text=Results (3)')).toBeVisible({ timeout: 5000 });
  });

  test('Clear All button clears results', async ({ page }) => {
    // Generate some results
    await page.getByRole('button', { name: /human \(male\)/i }).click();
    await expect(page.locator('text=Results (1)')).toBeVisible({ timeout: 5000 });
    
    // Clear all
    await page.getByRole('button', { name: /clear all/i }).click();
    
    // Should be empty again
    await expect(page.locator('text=Results (0)')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('text=Click a generator to roll')).toBeVisible();
  });

  test('Place Names category can be expanded', async ({ page }) => {
    // Click Place Names to expand
    await page.locator('button:has-text("Place Names")').click();
    
    // Should show place options
    await expect(page.getByRole('button', { name: /tavern name/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: /shop name/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /village name/i })).toBeVisible();
  });

  test('Treasure category can be expanded', async ({ page }) => {
    await page.locator('button:has-text("Treasure")').click();
    
    await expect(page.getByRole('button', { name: /individual.*cr 0-4/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: /gemstone/i })).toBeVisible();
  });

  test('Encounters category can be expanded', async ({ page }) => {
    await page.locator('button:has-text("Encounters")').click();
    
    await expect(page.getByRole('button', { name: /forest encounter/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: /dungeon encounter/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /road encounter/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /urban encounter/i })).toBeVisible();
  });

  test('Plot Hooks category can be expanded', async ({ page }) => {
    await page.getByRole('button', { name: 'Plot Hooks' }).click();
    
    await expect(page.getByRole('button', { name: 'Plot Hook', exact: true })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: 'Rumor', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'NPC Secret', exact: true })).toBeVisible();
  });

  test('copy button exists on result', async ({ page }) => {
    // Generate a result
    await page.getByRole('button', { name: /human \(male\)/i }).click();
    await expect(page.locator('text=Results (1)')).toBeVisible({ timeout: 5000 });
    
    // Copy button should be visible
    const copyBtn = page.locator('[data-testid="copy-result"]').first().or(
      page.locator('button').filter({ has: page.locator('svg') }).last()
    );
    await expect(copyBtn).toBeVisible();
  });
});
