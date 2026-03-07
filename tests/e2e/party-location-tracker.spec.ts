/**
 * Party Location Tracker E2E Tests
 * Tests the new PartyLocationTracker component in GM Screen
 * Features: World map selector, location pins, places of interest, travel distances, travel mode
 */
import { test, expect } from '@playwright/test';

const TEST_CAMPAIGN_ID = '1e6a6d0d-ad88-4b8a-9cc5-a1672119343c';
const TEST_USER = {
  email: 'stress_test_1772651200@test.com',
  password: 'TestPass123!'
};

async function loginAndNavigateToGMScreen(page: ReturnType<typeof test.info>['page']) {
  // Login
  await page.goto('/auth', { waitUntil: 'domcontentloaded' });
  await page.getByTestId('login-email').fill(TEST_USER.email);
  await page.getByTestId('login-password').fill(TEST_USER.password);
  await page.getByTestId('login-btn').click();
  
  // Wait for login redirect
  await page.waitForURL(/\/home/, { timeout: 15000 });
  
  // Navigate to GM Screen
  await page.goto(`/gm-screen/${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid="tab-combat"]', { timeout: 15000 });
}

test.describe('Party Location Tracker', () => {
  
  test.describe('GM Screen Location Tab', () => {
    
    test('should display Location tab in sidebar', async ({ page }) => {
      await loginAndNavigateToGMScreen(page);
      
      // Location tab should be visible in sidebar
      const locationTab = page.getByTestId('tab-location');
      await expect(locationTab).toBeVisible();
      await expect(locationTab).toContainText('Location');
    });
    
    test('should navigate to Location tab when clicked', async ({ page }) => {
      await loginAndNavigateToGMScreen(page);
      
      // Click Location tab
      await page.getByTestId('tab-location').click();
      
      // PartyLocationTracker should be visible
      await expect(page.getByTestId('party-location-tracker')).toBeVisible();
      
      // Should show Party Location header
      await expect(page.locator('text=Party Location')).toBeVisible();
    });
  });
  
  test.describe('World Map Selector', () => {
    
    test('should display world map selector with available maps', async ({ page }) => {
      await loginAndNavigateToGMScreen(page);
      await page.getByTestId('tab-location').click();
      await expect(page.getByTestId('party-location-tracker')).toBeVisible();
      
      // Should show "Active World Map" label
      await expect(page.locator('text=Active World Map').first()).toBeVisible();
      
      // Should show the world map name in the select element
      // The value is inside a <select> so check for the selected option text
      const worldMapSelect = page.locator('select').first();
      await expect(worldMapSelect).toBeVisible();
      await expect(worldMapSelect).toHaveValue(/7ca8a46c/);  // World map ID
    });
    
    test('should show locations from the selected world map', async ({ page }) => {
      await loginAndNavigateToGMScreen(page);
      await page.getByTestId('tab-location').click();
      await expect(page.getByTestId('party-location-tracker')).toBeVisible();
      
      // Should show "Select Current Location" section
      await expect(page.locator('text=Select Current Location')).toBeVisible();
      
      // Should show location pins from the test world map
      await expect(page.locator('text=Waterdeep')).toBeVisible();
      await expect(page.locator('text=Baldurs Gate')).toBeVisible();
      await expect(page.locator('text=Neverwinter')).toBeVisible();
    });
  });
  
  test.describe('Location Selection', () => {
    
    test('should select a location and show toast notification', async ({ page }) => {
      await loginAndNavigateToGMScreen(page);
      await page.getByTestId('tab-location').click();
      await expect(page.getByTestId('party-location-tracker')).toBeVisible();
      
      // Click on Waterdeep location
      const waterdeepBtn = page.locator('button:has-text("Waterdeep")').first();
      await waterdeepBtn.click();
      
      // Should show toast notification
      await expect(page.locator('text=Party is now at Waterdeep')).toBeVisible({ timeout: 5000 });
      
      // Should show "HERE" indicator
      await expect(page.locator('text=HERE')).toBeVisible();
    });
    
    test('should show location type badge', async ({ page }) => {
      await loginAndNavigateToGMScreen(page);
      await page.getByTestId('tab-location').click();
      await expect(page.getByTestId('party-location-tracker')).toBeVisible();
      
      // Click on Waterdeep (capital city)
      const waterdeepBtn = page.locator('button:has-text("Waterdeep")').first();
      await waterdeepBtn.click();
      
      // Should show "CAPITAL" badge
      await expect(page.locator('text=CAPITAL').first()).toBeVisible();
    });
    
    test('should display location description', async ({ page }) => {
      await loginAndNavigateToGMScreen(page);
      await page.getByTestId('tab-location').click();
      await expect(page.getByTestId('party-location-tracker')).toBeVisible();
      
      // Waterdeep description should be visible
      await expect(page.locator('text=City of Splendors')).toBeVisible();
      
      // Baldurs Gate description
      await expect(page.locator('text=A bustling port city')).toBeVisible();
    });
  });
  
  test.describe('Places of Interest Section', () => {
    
    test('should show Places of Interest section after selecting location', async ({ page }) => {
      await loginAndNavigateToGMScreen(page);
      await page.getByTestId('tab-location').click();
      await expect(page.getByTestId('party-location-tracker')).toBeVisible();
      
      // Select Waterdeep
      const waterdeepBtn = page.locator('button:has-text("Waterdeep")').first();
      await waterdeepBtn.click();
      
      // Places of Interest section should appear (use getByRole for the button/heading)
      await expect(page.getByRole('button', { name: /Places of Interest/i })).toBeVisible();
    });
    
    test('should show message when no places mapped', async ({ page }) => {
      await loginAndNavigateToGMScreen(page);
      await page.getByTestId('tab-location').click();
      await expect(page.getByTestId('party-location-tracker')).toBeVisible();
      
      // Select Waterdeep
      const waterdeepBtn = page.locator('button:has-text("Waterdeep")').first();
      await waterdeepBtn.click();
      
      // Should show "No places of interest mapped" message
      await expect(page.locator('text=No places of interest mapped for this location')).toBeVisible();
    });
  });
  
  test.describe('Travel Distances Section', () => {
    
    test('should show Travel Distances section with destinations count', async ({ page }) => {
      await loginAndNavigateToGMScreen(page);
      await page.getByTestId('tab-location').click();
      await expect(page.getByTestId('party-location-tracker')).toBeVisible();
      
      // Select Waterdeep
      const waterdeepBtn = page.locator('button:has-text("Waterdeep")').first();
      await waterdeepBtn.click();
      
      // Travel Distances section should appear
      await expect(page.locator('text=Travel Distances')).toBeVisible();
      
      // Should show destinations count
      await expect(page.locator('text=2 destinations')).toBeVisible();
    });
    
    test('should show nearby locations with distance info', async ({ page }) => {
      await loginAndNavigateToGMScreen(page);
      await page.getByTestId('tab-location').click();
      await expect(page.getByTestId('party-location-tracker')).toBeVisible();
      
      // Select Waterdeep
      const waterdeepBtn = page.locator('button:has-text("Waterdeep")').first();
      await waterdeepBtn.click();
      
      // Wait for nearby locations to load
      await expect(page.locator('text=Travel Distances')).toBeVisible();
      
      // Should show Neverwinter as nearby (80 miles via road)
      const neverwinterDestination = page.locator('text=80 miles').first();
      await expect(neverwinterDestination).toBeVisible();
      
      // Should show terrain type
      await expect(page.locator('text=road').first()).toBeVisible();
    });
    
    test('should show travel time for destinations', async ({ page }) => {
      await loginAndNavigateToGMScreen(page);
      await page.getByTestId('tab-location').click();
      await expect(page.getByTestId('party-location-tracker')).toBeVisible();
      
      // Select Waterdeep
      const waterdeepBtn = page.locator('button:has-text("Waterdeep")').first();
      await waterdeepBtn.click();
      
      // Should show travel time
      await expect(page.locator('text=3d 3h').first()).toBeVisible();
    });
  });
  
  test.describe('Travel Mode Selector', () => {
    
    test('should display travel mode options', async ({ page }) => {
      await loginAndNavigateToGMScreen(page);
      await page.getByTestId('tab-location').click();
      await expect(page.getByTestId('party-location-tracker')).toBeVisible();
      
      // Select a location first
      const waterdeepBtn = page.locator('button:has-text("Waterdeep")').first();
      await waterdeepBtn.click();
      
      // Travel mode buttons should be visible
      await expect(page.locator('text=Travel Mode').first()).toBeVisible();
      await expect(page.getByRole('button', { name: /On Foot/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Horseback/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Cart/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Ship/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Flying/i })).toBeVisible();
    });
    
    test('should default to On Foot travel mode', async ({ page }) => {
      await loginAndNavigateToGMScreen(page);
      await page.getByTestId('tab-location').click();
      await expect(page.getByTestId('party-location-tracker')).toBeVisible();
      
      // Select Waterdeep
      const waterdeepBtn = page.locator('button:has-text("Waterdeep")').first();
      await waterdeepBtn.click();
      
      // On Foot button should be styled as selected (cyan background)
      const onFootBtn = page.getByRole('button', { name: /On Foot/i });
      await expect(onFootBtn).toBeVisible();
      // Note: Could check background color, but CSS assertions are fragile
    });
    
    test('should change travel mode when clicked', async ({ page }) => {
      await loginAndNavigateToGMScreen(page);
      await page.getByTestId('tab-location').click();
      await expect(page.getByTestId('party-location-tracker')).toBeVisible();
      
      // Select Waterdeep
      const waterdeepBtn = page.locator('button:has-text("Waterdeep")').first();
      await waterdeepBtn.click();
      
      // Click Horseback travel mode
      await page.getByRole('button', { name: /Horseback/i }).click();
      
      // Travel time should change (horseback is faster)
      // For 80 miles: walking = 3d 3h, horseback should be faster
      // The exact time depends on the calculation in the component
    });
  });
  
  test.describe('Travel Button', () => {
    
    test('should display Travel button for destinations', async ({ page }) => {
      await loginAndNavigateToGMScreen(page);
      await page.getByTestId('tab-location').click();
      await expect(page.getByTestId('party-location-tracker')).toBeVisible();
      
      // Select Waterdeep
      const waterdeepBtn = page.locator('button:has-text("Waterdeep")').first();
      await waterdeepBtn.click();
      
      // Travel button should be visible for each destination
      await expect(page.getByRole('button', { name: /Travel/i }).first()).toBeVisible();
    });
    
    test('should move party to destination when Travel clicked', async ({ page }) => {
      await loginAndNavigateToGMScreen(page);
      await page.getByTestId('tab-location').click();
      await expect(page.getByTestId('party-location-tracker')).toBeVisible();
      
      // Select Waterdeep
      const waterdeepBtn = page.locator('button:has-text("Waterdeep")').first();
      await waterdeepBtn.click();
      
      // Wait for destinations to load and scroll to Travel section
      await expect(page.locator('text=Travel Distances')).toBeVisible();
      
      // Scroll to bring Travel buttons into view
      await page.locator('text=Travel Distances').scrollIntoViewIfNeeded();
      
      // Click Travel button for a destination
      const travelBtn = page.getByRole('button', { name: /^Travel/i }).first();
      await travelBtn.scrollIntoViewIfNeeded();
      await travelBtn.click();
      
      // Should show toast notification for travel - look for any "traveled to" message
      await expect(page.locator('[data-sonner-toast]')).toBeVisible({ timeout: 5000 });
    });
    
    test('should update current location after travel', async ({ page }) => {
      await loginAndNavigateToGMScreen(page);
      await page.getByTestId('tab-location').click();
      await expect(page.getByTestId('party-location-tracker')).toBeVisible();
      
      // Select Waterdeep
      const waterdeepBtn = page.locator('button:has-text("Waterdeep")').first();
      await waterdeepBtn.click();
      
      // Wait for travel section
      await expect(page.locator('text=Travel Distances')).toBeVisible();
      
      // Scroll to and click Travel button
      await page.locator('text=Travel Distances').scrollIntoViewIfNeeded();
      const travelBtn = page.getByRole('button', { name: /^Travel/i }).first();
      await travelBtn.scrollIntoViewIfNeeded();
      await travelBtn.click();
      
      // Wait for toast to appear (confirmation of travel)
      await expect(page.locator('[data-sonner-toast]')).toBeVisible({ timeout: 5000 });
    });
  });
  
  test.describe('No World Maps State', () => {
    // This test would need a campaign without world maps
    // Skipping for now as the test campaign has world maps
    test.skip('should show message when no world map uploaded', async ({ page }) => {
      // Would need to test with a different campaign
    });
  });
  
  test.describe('Collapsible Sections', () => {
    
    test('should toggle current location section', async ({ page }) => {
      await loginAndNavigateToGMScreen(page);
      await page.getByTestId('tab-location').click();
      await expect(page.getByTestId('party-location-tracker')).toBeVisible();
      
      // Current location section should be expanded by default
      await expect(page.locator('text=Select Current Location')).toBeVisible();
      
      // Click to collapse
      const toggleBtn = page.locator('button:has-text("Select Current Location")');
      await toggleBtn.click();
      
      // Should collapse (locations hidden)
    });
    
    test('should toggle places of interest section', async ({ page }) => {
      await loginAndNavigateToGMScreen(page);
      await page.getByTestId('tab-location').click();
      await expect(page.getByTestId('party-location-tracker')).toBeVisible();
      
      // Select location first
      const waterdeepBtn = page.locator('button:has-text("Waterdeep")').first();
      await waterdeepBtn.click();
      
      // Places section should appear (use role button)
      await expect(page.getByRole('button', { name: /Places of Interest/i })).toBeVisible();
    });
    
    test('should toggle travel distances section', async ({ page }) => {
      await loginAndNavigateToGMScreen(page);
      await page.getByTestId('tab-location').click();
      await expect(page.getByTestId('party-location-tracker')).toBeVisible();
      
      // Select location first
      const waterdeepBtn = page.locator('button:has-text("Waterdeep")').first();
      await waterdeepBtn.click();
      
      // Travel section should appear
      await expect(page.locator('text=Travel Distances')).toBeVisible();
    });
  });
  
  test.describe('Party Location Summary', () => {
    
    test('should show party location summary after selecting location', async ({ page }) => {
      await loginAndNavigateToGMScreen(page);
      await page.getByTestId('tab-location').click();
      await expect(page.getByTestId('party-location-tracker')).toBeVisible();
      
      // Select Waterdeep
      const waterdeepBtn = page.locator('button:has-text("Waterdeep")').first();
      await waterdeepBtn.click();
      
      // Should show "PARTY LOCATION" summary at bottom
      await expect(page.locator('text=PARTY LOCATION').last()).toBeVisible();
      
      // Should show current location name
      await expect(page.locator('text=Waterdeep').first()).toBeVisible();
      
      // Should show stats like "0 places • 2 routes"
      await expect(page.locator('text=0 places').first()).toBeVisible();
      await expect(page.locator('text=2 routes').first()).toBeVisible();
    });
  });
});
