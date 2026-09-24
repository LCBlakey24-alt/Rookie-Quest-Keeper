import { test, expect } from '@playwright/test';

test.skip(!process.env.RQK_E2E_EMAIL || !process.env.RQK_E2E_PASSWORD, 'E2E credentials are not configured; set RQK_E2E_EMAIL and RQK_E2E_PASSWORD.');

test.describe('SRD-Only Items Database Verification', () => {
  const testEmail = (process.env.RQK_E2E_EMAIL || '');
  const testPassword = (process.env.RQK_E2E_PASSWORD || '');
  const campaignId = 'b51ba0e9-5b08-44ed-b3dd-4a97dd2a09f6';

  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
  });

  test('Quick Reference Items tab loads with SRD items', async ({ page }) => {
    // Navigate to campaign dashboard
    await page.getByText('TEST_Campaign_1773389199863').click({ force: true });
    await page.waitForTimeout(2000);

    // Close any modals
    await page.getByRole('button', { name: 'Got it, thanks!' }).click({ force: true }).catch(() => {});
    await page.waitForTimeout(500);

    // Click on Tools
    await page.locator('span:text-is("Tools")').click({ force: true });
    await page.waitForTimeout(1000);

    // Close GM Tools modal
    await page.getByRole('button', { name: 'Got it, thanks!' }).click({ force: true }).catch(() => {});
    await page.waitForTimeout(500);

    // Verify Items tab is visible
    await expect(page.getByText('Items Database')).toBeVisible();
    
    // Verify item count is around 92 (SRD items only)
    const itemCount = page.getByText('92 items', { exact: true });
    await expect(itemCount).toBeVisible();
    const countText = await itemCount.textContent();
    const count = parseInt(countText?.match(/(\d+)/)?.[1] || '0');
    expect(count).toBeLessThan(200); // Much less than the 3000+ copyrighted items
    expect(count).toBeGreaterThan(50); // At least 50 SRD items
  });

  test('No Vecna items in database', async ({ page }) => {
    // Navigate to campaign dashboard
    await page.getByText('TEST_Campaign_1773389199863').click({ force: true });
    await page.waitForTimeout(2000);

    // Close any modals
    await page.getByRole('button', { name: 'Got it, thanks!' }).click({ force: true }).catch(() => {});
    await page.waitForTimeout(500);

    // Click on Tools
    await page.locator('span:text-is("Tools")').click({ force: true });
    await page.waitForTimeout(1000);

    // Close GM Tools modal
    await page.getByRole('button', { name: 'Got it, thanks!' }).click({ force: true }).catch(() => {});
    await page.waitForTimeout(500);

    // Search for "vecna"
    await page.locator('input[placeholder*="Search"]').fill('vecna');
    await page.waitForTimeout(1000);

    // Verify "Showing 0 of X items"
    await expect(page.getByText('Showing 0 of')).toBeVisible();
  });

  test('SRD Potions exist in database', async ({ page }) => {
    // Navigate to campaign dashboard
    await page.getByText('TEST_Campaign_1773389199863').click({ force: true });
    await page.waitForTimeout(2000);

    // Close any modals
    await page.getByRole('button', { name: 'Got it, thanks!' }).click({ force: true }).catch(() => {});
    await page.waitForTimeout(500);

    // Click on Tools
    await page.locator('span:text-is("Tools")').click({ force: true });
    await page.waitForTimeout(1000);

    // Close GM Tools modal
    await page.getByRole('button', { name: 'Got it, thanks!' }).click({ force: true }).catch(() => {});
    await page.waitForTimeout(500);

    // Search for "Potion of Healing"
    await page.locator('input[placeholder*="Search"]').fill('Potion of Healing');
    await page.waitForTimeout(1000);

    // Verify Potion of Healing appears
    await expect(page.getByText('Potion of Healing', { exact: false }).first()).toBeVisible();
  });

  test('GM Screen loads without errors', async ({ page }) => {
    // Navigate directly to GM Screen
    await page.goto(`/gm-screen/${campaignId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Verify GM Screen header
    await expect(page.getByText('TEST_CAMPAIGN')).toBeVisible();

    // Verify all tabs are visible
    await expect(page.getByText('Combat', { exact: true })).toBeVisible();
    await expect(page.getByText('Location', { exact: true })).toBeVisible();
    await expect(page.getByText('NPCs', { exact: true })).toBeVisible();
    await expect(page.getByText('Monsters', { exact: true })).toBeVisible();
    await expect(page.getByText('Tables', { exact: true })).toBeVisible();
    await expect(page.getByText('Loot', { exact: true })).toBeVisible();
    await expect(page.getByText('Dice', { exact: true })).toBeVisible();
    await expect(page.getByText('Party', { exact: true })).toBeVisible();
    await expect(page.getByText('Notes', { exact: true })).toBeVisible();
  });

  test('Legendary SRD items exist', async ({ page }) => {
    // Navigate to campaign dashboard
    await page.getByText('TEST_Campaign_1773389199863').click({ force: true });
    await page.waitForTimeout(2000);

    // Close any modals
    await page.getByRole('button', { name: 'Got it, thanks!' }).click({ force: true }).catch(() => {});
    await page.waitForTimeout(500);

    // Click on Tools
    await page.locator('span:text-is("Tools")').click({ force: true });
    await page.waitForTimeout(1000);

    // Close GM Tools modal
    await page.getByRole('button', { name: 'Got it, thanks!' }).click({ force: true }).catch(() => {});
    await page.waitForTimeout(500);

    // Filter by Legendary rarity
    await page.locator('select').nth(1).selectOption('Legendary');
    await page.waitForTimeout(1000);

    // Verify legendary SRD items exist (Staff of the Magi is in SRD)
    await expect(page.getByText('Staff of the Magi', { exact: false })).toBeVisible();
  });
});
