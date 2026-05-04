import { test, expect } from '@playwright/test';
import { waitForAppReady, dismissToasts, removeBlockingBadges, TEST_USER, TEST_CAMPAIGN_ID, loginUser } from '../fixtures/helpers';

test.describe('Locations and Places of Interest', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    
    // Login with test user
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await page.getByTestId('login-email').fill(TEST_USER.email);
    await page.getByTestId('login-password').fill(TEST_USER.password);
    await page.getByTestId('login-btn').click();
    await page.waitForURL(/\/campaigns/, { timeout: 15000 });
    
    // Navigate to test campaign
    await page.goto(`/campaign/${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await removeBlockingBadges(page);
    
    // Navigate to Locations tab
    await page.getByTestId('locations-tab').click();
    await expect(page.getByText('Locations')).toBeVisible();
  });

  test('Locations tab displays existing locations', async ({ page }) => {
    // Verify Locations heading is visible
    await expect(page.getByRole('heading', { name: 'Locations', exact: true })).toBeVisible();
    
    // Verify Add Location button is visible
    await expect(page.getByTestId('add-location-btn')).toBeVisible();
    
    // Verify existing location (Waterdeep) is displayed
    await expect(page.getByText('Waterdeep')).toBeVisible();
    // Location type 'City' - use exact match to avoid matching 'City of Splendors'
    await expect(page.getByText('City', { exact: true }).first()).toBeVisible();
  });

  test('Expand location to see places of interest', async ({ page }) => {
    // Find Waterdeep location card and click toggle
    const waterdeepCard = page.locator('[data-testid^="location-card-"]').filter({ hasText: 'Waterdeep' });
    await expect(waterdeepCard).toBeVisible();
    
    // Click the toggle places button
    const toggleButton = waterdeepCard.locator('[data-testid^="toggle-places-"]').first();
    await toggleButton.click();
    
    // Verify places of interest are now visible (Waterdeep has 2 places)
    await expect(page.getByText('The Yawning Portal')).toBeVisible();
    await expect(page.getByText('Aurora\'s Whole Realms Catalogue')).toBeVisible();
  });

  test('Add new location dialog opens correctly', async ({ page }) => {
    // Click Add Location button
    await page.getByTestId('add-location-btn').click();
    
    // Verify dialog appears with form fields
    await expect(page.getByTestId('location-name-input')).toBeVisible();
    await expect(page.getByTestId('location-type-input')).toBeVisible();
    await expect(page.getByTestId('location-description-input')).toBeVisible();
    await expect(page.getByTestId('location-submit-btn')).toBeVisible();
  });

  test('Add a new location', async ({ page }) => {
    const uniqueName = `TEST_Location_${Date.now()}`;
    
    // Click Add Location button
    await page.getByTestId('add-location-btn').click();
    
    // Fill in form
    await page.getByTestId('location-name-input').fill(uniqueName);
    await page.getByTestId('location-type-input').fill('Dungeon');
    await page.getByTestId('location-description-input').fill('A dark and mysterious test dungeon');
    
    // Submit
    await page.getByTestId('location-submit-btn').click();
    
    // Verify location was added
    await expect(page.getByText(uniqueName)).toBeVisible({ timeout: 5000 });
    
    // Cleanup - delete the test location
    const locationCard = page.locator('[data-testid^="location-card-"]').filter({ hasText: uniqueName });
    const deleteBtn = locationCard.locator('[data-testid^="delete-location-btn-"]');
    page.on('dialog', dialog => dialog.accept());
    await deleteBtn.click();
  });

  test('Add Place of Interest dialog opens correctly', async ({ page }) => {
    // Find Waterdeep location and click Add Place button
    const waterdeepCard = page.locator('[data-testid^="location-card-"]').filter({ hasText: 'Waterdeep' });
    const addPlaceBtn = waterdeepCard.locator('[data-testid^="add-place-btn-"]');
    await addPlaceBtn.click();
    
    // Verify place dialog appears with form fields
    await expect(page.getByTestId('place-name-input')).toBeVisible();
    await expect(page.getByTestId('place-type-select')).toBeVisible();
    await expect(page.getByTestId('place-owner-input')).toBeVisible();
    await expect(page.getByTestId('place-description-input')).toBeVisible();
    await expect(page.getByTestId('place-services-input')).toBeVisible();
    await expect(page.getByTestId('place-submit-btn')).toBeVisible();
  });

  test('Add a new place of interest to location', async ({ page }) => {
    const uniquePlaceName = `TEST_Tavern_${Date.now()}`;
    
    // Find Waterdeep location and click Add Place button
    const waterdeepCard = page.locator('[data-testid^="location-card-"]').filter({ hasText: 'Waterdeep' });
    const addPlaceBtn = waterdeepCard.locator('[data-testid^="add-place-btn-"]');
    await addPlaceBtn.click();
    
    // Fill in place form
    await page.getByTestId('place-name-input').fill(uniquePlaceName);
    await page.getByTestId('place-type-select').selectOption('tavern');
    await page.getByTestId('place-owner-input').fill('Test Barkeep');
    await page.getByTestId('place-description-input').fill('A cozy test tavern');
    await page.getByTestId('place-services-input').fill('Ale, Food, Rooms');
    
    // Submit
    await page.getByTestId('place-submit-btn').click();
    
    // Expand places and verify it was added
    const toggleButton = waterdeepCard.locator('[data-testid^="toggle-places-"]').first();
    await toggleButton.click();
    
    await expect(page.getByText(uniquePlaceName)).toBeVisible({ timeout: 5000 });
    
    // Cleanup - delete the test place
    const placeCard = page.locator('[data-testid^="place-card-"]').filter({ hasText: uniquePlaceName });
    const deletePlaceBtn = placeCard.locator('[data-testid^="delete-place-btn-"]');
    page.on('dialog', dialog => dialog.accept());
    await deletePlaceBtn.click();
  });

  test('Unseen Servant panel visible in Locations tab', async ({ page }) => {
    // Verify Unseen Servant panel is visible (renamed from AI Assistant)
    await expect(page.getByText('Unseen Servant')).toBeVisible();
    
    // Verify generation controls with new testids
    await expect(page.getByTestId('unseen-servant-location-prompt')).toBeVisible();
    await expect(page.getByTestId('summon-location-btn')).toBeVisible();
  });
});
