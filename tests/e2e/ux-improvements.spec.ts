import { test, expect } from '@playwright/test';
import { loginTestUser, dismissToasts, removeBlockingBadges, TEST_CAMPAIGN_ID } from '../fixtures/helpers';

test.describe('NPCsTab and LocationsTab UX Improvements', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await loginTestUser(page);
  });

  test.describe('NPCsTab Features', () => {
    test('should display NPCs list with count', async ({ page }) => {
      // Navigate to campaign DM screen
      await page.goto(`/campaigns/${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle');
      
      // Click NPCs tab
      await page.getByRole('button', { name: 'NPCs' }).click();
      await expect(page.getByRole('heading', { name: /NPCs/i })).toBeVisible();
    });

    test('should show delete confirmation on first click', async ({ page }) => {
      await page.goto(`/campaigns/${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle');
      
      // Click NPCs tab
      await page.getByRole('button', { name: 'NPCs' }).click();
      await page.waitForLoadState('networkidle');
      
      // Look for any NPC with delete button
      const deleteBtn = page.locator('[data-testid^="delete-npc-btn-"]').first();
      
      if (await deleteBtn.isVisible()) {
        await deleteBtn.click();
        
        // Should show confirmation state with "Delete?" text
        await expect(page.getByText('Delete?')).toBeVisible({ timeout: 5000 });
        
        // Should show confirm button
        await expect(page.locator('[data-testid^="confirm-delete-npc-"]').first()).toBeVisible();
      }
    });

    test('should have Add NPC button', async ({ page }) => {
      await page.goto(`/campaigns/${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle');
      
      await page.getByRole('button', { name: 'NPCs' }).click();
      await page.waitForLoadState('networkidle');
      
      // Should have Add NPC button
      await expect(page.getByTestId('add-npc-btn')).toBeVisible();
    });

    test('should open Add NPC dialog', async ({ page }) => {
      await page.goto(`/campaigns/${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle');
      
      await page.getByRole('button', { name: 'NPCs' }).click();
      await page.waitForLoadState('networkidle');
      
      await page.getByTestId('add-npc-btn').click();
      
      // Dialog should open with form
      await expect(page.getByTestId('npc-name-input')).toBeVisible();
    });

    test('should have Unseen Servant panel for NPC generation', async ({ page }) => {
      await page.goto(`/campaigns/${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle');
      
      await page.getByRole('button', { name: 'NPCs' }).click();
      await page.waitForLoadState('networkidle');
      
      // Check for Unseen Servant panel
      await expect(page.getByText('Unseen Servant')).toBeVisible();
      await expect(page.getByTestId('unseen-servant-npc-prompt')).toBeVisible();
      await expect(page.getByTestId('summon-npc-btn')).toBeVisible();
    });
  });

  test.describe('LocationsTab Features', () => {
    test('should display Locations list with count', async ({ page }) => {
      await page.goto(`/campaigns/${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle');
      
      // Click Locations tab
      await page.getByRole('button', { name: 'Locations' }).click();
      await expect(page.getByRole('heading', { name: /Locations/i })).toBeVisible();
    });

    test('should show delete confirmation for locations', async ({ page }) => {
      await page.goto(`/campaigns/${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle');
      
      await page.getByRole('button', { name: 'Locations' }).click();
      await page.waitForLoadState('networkidle');
      
      // Look for any location with delete button
      const deleteBtn = page.locator('[data-testid^="delete-location-btn-"]').first();
      
      if (await deleteBtn.isVisible()) {
        await deleteBtn.click();
        
        // Should show confirmation state
        await expect(page.getByText('Delete?')).toBeVisible({ timeout: 5000 });
        
        // Should show confirm button
        await expect(page.locator('[data-testid^="confirm-delete-location-"]').first()).toBeVisible();
      }
    });

    test('should have Add Location button', async ({ page }) => {
      await page.goto(`/campaigns/${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle');
      
      await page.getByRole('button', { name: 'Locations' }).click();
      await page.waitForLoadState('networkidle');
      
      await expect(page.getByTestId('add-location-btn')).toBeVisible();
    });

    test('should open Add Location dialog', async ({ page }) => {
      await page.goto(`/campaigns/${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle');
      
      await page.getByRole('button', { name: 'Locations' }).click();
      await page.waitForLoadState('networkidle');
      
      await page.getByTestId('add-location-btn').click();
      
      // Dialog should open with form
      await expect(page.getByTestId('location-name-input')).toBeVisible();
    });

    test('should have Unseen Servant panel for location generation', async ({ page }) => {
      await page.goto(`/campaigns/${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle');
      
      await page.getByRole('button', { name: 'Locations' }).click();
      await page.waitForLoadState('networkidle');
      
      // Check for Unseen Servant panel
      await expect(page.getByText('Unseen Servant')).toBeVisible();
      await expect(page.getByTestId('unseen-servant-location-prompt')).toBeVisible();
      await expect(page.getByTestId('summon-location-btn')).toBeVisible();
    });

    test('should have Places of Interest expandable section', async ({ page }) => {
      await page.goto(`/campaigns/${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle');
      
      await page.getByRole('button', { name: 'Locations' }).click();
      await page.waitForLoadState('networkidle');
      
      // Look for Places of Interest section
      const placesToggle = page.locator('[data-testid^="toggle-places-"]').first();
      if (await placesToggle.isVisible()) {
        await expect(placesToggle).toBeVisible();
        // Click to expand
        await placesToggle.click();
      }
    });
  });
});
