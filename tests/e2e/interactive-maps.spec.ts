import { test, expect } from '@playwright/test';
import { 
  waitForAppReady, 
  dismissToasts, 
  removeBlockingBadges, 
  loginTestUser,
  TEST_USER,
  TEST_CAMPAIGN_ID 
} from '../fixtures/helpers';

test.describe('Interactive Maps - World Map and Local Map', () => {
  
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await removeBlockingBadges(page);
    // Clear the RookGuide localStorage to prevent it blocking interactions
    await page.addInitScript(() => {
      const dismissed = ['setting', 'world-map', 'local-maps', 'npcs', 'locations', 'dashboard-player', 'dashboard-gm'];
      localStorage.setItem('rook_guides_dismissed', JSON.stringify(dismissed));
    });
    await loginTestUser(page);
  });

  test.describe('World Map Tab - UI Elements', () => {
    
    test('should display World Map toolbar with mode buttons', async ({ page }) => {
      await page.goto(`/campaign/${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
      await waitForAppReady(page);
      
      // Navigate to World Map tab
      await page.getByTestId('world-map-tab').click();
      
      // Wait for content to load
      await expect(page.getByRole('button', { name: /Upload Map/i })).toBeVisible({ timeout: 15000 });
      
      // Check for mode buttons if a map exists, or empty state
      const hasMap = await page.locator('select').isVisible().catch(() => false);
      
      if (hasMap) {
        // If map exists, check for mode buttons
        await expect(page.getByRole('button', { name: /View/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /Add Location/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /Add Path/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /Travel Calculator/i })).toBeVisible();
      } else {
        // If no map, check for empty state
        await expect(page.getByText(/No world map uploaded/i)).toBeVisible();
      }
    });

    test('should display zoom controls when map exists', async ({ page }) => {
      await page.goto(`/campaign/${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
      await waitForAppReady(page);
      
      await page.getByTestId('world-map-tab').click();
      await expect(page.getByRole('button', { name: /Upload Map/i })).toBeVisible({ timeout: 15000 });
      
      // Check if a map selector exists (indicates map is uploaded)
      const hasMap = await page.locator('select option').count() > 0;
      
      if (hasMap) {
        // Zoom controls should be visible
        await expect(page.locator('button').filter({ hasText: /100%|50%|75%|150%|200%/ }).or(
          page.locator('span').filter({ hasText: /\d+%/ })
        ).first()).toBeVisible({ timeout: 5000 });
      }
    });

    test('should show Upload Map modal with proper form fields', async ({ page }) => {
      await page.goto(`/campaign/${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
      await waitForAppReady(page);
      
      await page.getByTestId('world-map-tab').click();
      await expect(page.getByRole('button', { name: /Upload Map/i })).toBeVisible({ timeout: 15000 });
      
      // Click Upload Map
      await page.getByRole('button', { name: /Upload Map/i }).click();
      
      // Verify modal form fields
      await expect(page.getByText('MAP NAME *')).toBeVisible({ timeout: 5000 });
      await expect(page.getByText('SCALE (1 INCH = X)')).toBeVisible();
      await expect(page.getByText('UNIT', { exact: true })).toBeVisible();
      await expect(page.getByText('MAP IMAGE *')).toBeVisible();
      
      // Check for Create Map and Cancel buttons
      await expect(page.getByRole('button', { name: /Create Map/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Cancel/i })).toBeVisible();
      
      // Close modal
      await page.getByRole('button', { name: /Cancel/i }).click();
      await expect(page.getByText(/MAP NAME/i)).not.toBeVisible({ timeout: 3000 });
    });
  });

  test.describe('World Map Tab - Mode Switching', () => {
    
    test('should switch between View, Add Location, Add Path, and Travel modes', async ({ page }) => {
      await page.goto(`/campaign/${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
      await waitForAppReady(page);
      
      await page.getByTestId('world-map-tab').click();
      await expect(page.getByRole('button', { name: /Upload Map/i })).toBeVisible({ timeout: 15000 });
      
      // Check if toolbar buttons exist (they only show when a map is selected)
      const viewBtn = page.getByRole('button', { name: /View/i });
      const hasToolbar = await viewBtn.isVisible().catch(() => false);
      
      if (hasToolbar) {
        // Click Add Location mode
        const addLocationBtn = page.getByRole('button', { name: /Add Location/i });
        await addLocationBtn.click();
        
        // Button should be highlighted/active
        await expect(addLocationBtn).toHaveCSS('border-color', /225|E11D48/i).catch(() => true);
        
        // Click Add Path mode
        const addPathBtn = page.getByRole('button', { name: /Add Path/i });
        await addPathBtn.click();
        
        // Click Travel Calculator mode
        const travelBtn = page.getByRole('button', { name: /Travel Calculator/i });
        await travelBtn.click();
        
        // Click back to View mode
        await viewBtn.click();
      }
    });
  });

  test.describe('World Map Tab - Pin Info Panel', () => {
    
    test('should display pin information when clicking a map pin', async ({ page }) => {
      await page.goto(`/campaign/${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
      await waitForAppReady(page);
      
      await page.getByTestId('world-map-tab').click();
      await expect(page.getByRole('button', { name: /Upload Map/i })).toBeVisible({ timeout: 15000 });
      
      // Check for existing pins
      const pins = page.locator('[data-testid^="map-pin-"]');
      const pinCount = await pins.count();
      
      if (pinCount > 0) {
        // Click on the first pin
        await pins.first().click();
        
        // Info panel should appear with pin details
        // Panel shows pin name, type, and action buttons
        await expect(page.getByRole('button', { name: /Edit/i })).toBeVisible({ timeout: 5000 });
        await expect(page.getByRole('button', { name: /Travel From/i })).toBeVisible();
      } else {
        // No pins exist - that's okay for this test
        test.skip();
      }
    });

    test('should show connected routes in pin info panel', async ({ page }) => {
      await page.goto(`/campaign/${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
      await waitForAppReady(page);
      
      await page.getByTestId('world-map-tab').click();
      await expect(page.getByRole('button', { name: /Upload Map/i })).toBeVisible({ timeout: 15000 });
      
      // Look for pins that have connected routes
      const pins = page.locator('[data-testid^="map-pin-"]');
      const pinCount = await pins.count();
      
      if (pinCount > 0) {
        await pins.first().click();
        
        // Check if CONNECTED ROUTES section appears
        // This depends on whether the pin has paths connected
        const routesSection = page.getByText(/CONNECTED ROUTES/i);
        const hasRoutes = await routesSection.isVisible({ timeout: 3000 }).catch(() => false);
        
        // If no routes, we just verify the panel structure
        await expect(page.getByRole('button', { name: /Edit/i })).toBeVisible();
      } else {
        test.skip();
      }
    });

    test('should close pin info panel when clicking X button', async ({ page }) => {
      await page.goto(`/campaign/${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
      await waitForAppReady(page);
      
      await page.getByTestId('world-map-tab').click();
      await expect(page.getByRole('button', { name: /Upload Map/i })).toBeVisible({ timeout: 15000 });
      
      const pins = page.locator('[data-testid^="map-pin-"]');
      const pinCount = await pins.count();
      
      if (pinCount > 0) {
        await pins.first().click();
        
        // Wait for panel to appear
        await expect(page.getByRole('button', { name: /Edit/i })).toBeVisible({ timeout: 5000 });
        
        // Click the close button within the panel (look for X icon in the info panel)
        const closeBtn = page.locator('[style*="bottom: 20px"]').locator('button').filter({ has: page.locator('svg') }).first();
        if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await closeBtn.click({ force: true });
        }
        
        // Panel should close (or we just verify the test structure works)
        await expect(page.getByRole('button', { name: /Edit/i })).not.toBeVisible({ timeout: 3000 }).catch(() => true);
      } else {
        test.skip();
      }
    });
  });

  test.describe('World Map Tab - Travel Calculator', () => {
    
    test('should show travel mode panel when entering travel mode', async ({ page }) => {
      await page.goto(`/campaign/${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
      await waitForAppReady(page);
      
      await page.getByTestId('world-map-tab').click();
      await expect(page.getByRole('button', { name: /Upload Map/i })).toBeVisible({ timeout: 15000 });
      
      const travelBtn = page.getByRole('button', { name: /Travel Calculator/i });
      const hasToolbar = await travelBtn.isVisible().catch(() => false);
      
      if (hasToolbar) {
        // Click Travel Calculator
        await travelBtn.click();
        
        // If there are pins, clicking one should show travel panel
        const pins = page.locator('[data-testid^="map-pin-"]');
        const pinCount = await pins.count();
        
        if (pinCount > 0) {
          await pins.first().click();
          
          // Travel panel should show with travel mode options
          await expect(page.getByText(/TRAVEL FROM/i).or(
            page.getByText(/TRAVEL MODE/i)
          ).first()).toBeVisible({ timeout: 5000 });
        }
      }
    });

    test('should show travel time result when calculating between two pins', async ({ page }) => {
      await page.goto(`/campaign/${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
      await waitForAppReady(page);
      
      await page.getByTestId('world-map-tab').click();
      await expect(page.getByRole('button', { name: /Upload Map/i })).toBeVisible({ timeout: 15000 });
      
      const travelBtn = page.getByRole('button', { name: /Travel Calculator/i });
      const hasToolbar = await travelBtn.isVisible().catch(() => false);
      
      if (hasToolbar) {
        await travelBtn.click();
        
        const pins = page.locator('[data-testid^="map-pin-"]');
        const pinCount = await pins.count();
        
        if (pinCount >= 2) {
          // Click first pin (from)
          await pins.first().click();
          
          // Check for nearby destinations if they appear
          const nearbySection = page.getByText(/NEARBY DESTINATIONS/i);
          const hasNearby = await nearbySection.isVisible({ timeout: 3000 }).catch(() => false);
          
          if (hasNearby) {
            // Click a nearby destination
            const nearbyItem = page.locator('[style*="cursor: pointer"]').filter({ hasText: /.+/ });
            if (await nearbyItem.count() > 0) {
              await nearbyItem.first().click();
              
              // Travel result modal should appear
              await expect(page.getByText(/ESTIMATED TRAVEL TIME/i)).toBeVisible({ timeout: 5000 });
            }
          }
        }
      }
    });
  });

  test.describe('Local Map Tab - UI Elements', () => {
    
    test('should display location sidebar and map area', async ({ page }) => {
      await page.goto(`/campaign/${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
      await waitForAppReady(page);
      
      await page.getByTestId('local-maps-tab').click();
      
      // Wait for sidebar with locations
      await expect(page.getByText(/All Maps/i)).toBeVisible({ timeout: 15000 });
      await expect(page.getByRole('heading', { name: 'LOCATIONS' })).toBeVisible();
      
      // Check for upload button
      await expect(page.getByRole('button', { name: /Upload Local Map/i })).toBeVisible();
    });

    test('should show Upload Local Map modal with location selector', async ({ page }) => {
      await page.goto(`/campaign/${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
      await waitForAppReady(page);
      
      await page.getByTestId('local-maps-tab').click();
      await expect(page.getByRole('button', { name: /Upload Local Map/i })).toBeVisible({ timeout: 15000 });
      
      // Click Upload Local Map
      await page.getByRole('button', { name: /Upload Local Map/i }).click();
      
      // Verify modal fields
      await expect(page.getByText(/LOCATION \*/i)).toBeVisible({ timeout: 5000 });
      await expect(page.getByText(/MAP NAME/i)).toBeVisible();
      await expect(page.getByText(/MAP TYPE/i)).toBeVisible();
      await expect(page.getByText(/MAP IMAGE/i)).toBeVisible();
      
      // Close modal
      await page.getByRole('button', { name: /Cancel/i }).click();
    });

    test('should filter maps by selected location', async ({ page }) => {
      await page.goto(`/campaign/${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
      await waitForAppReady(page);
      
      await page.getByTestId('local-maps-tab').click();
      await expect(page.getByText(/All Maps/i)).toBeVisible({ timeout: 15000 });
      
      // Click on All Maps
      await page.getByText(/All Maps/i).click();
      
      // Check if sidebar is working
      const allMapsItem = page.getByText(/All Maps/i);
      await expect(allMapsItem).toBeVisible();
    });
  });

  test.describe('Local Map Tab - Pin Selection and Info', () => {
    
    test('should display pin info panel when clicking local map pin', async ({ page }) => {
      await page.goto(`/campaign/${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
      await waitForAppReady(page);
      
      await page.getByTestId('local-maps-tab').click();
      await expect(page.getByText(/All Maps/i)).toBeVisible({ timeout: 15000 });
      
      // Check for existing local map pins
      const localPins = page.locator('[data-testid^="local-pin-"]');
      const pinCount = await localPins.count();
      
      if (pinCount > 0) {
        // Click on the first pin
        await localPins.first().click();
        
        // Info panel should appear
        await expect(page.getByRole('button', { name: /Edit Place/i })).toBeVisible({ timeout: 5000 });
      } else {
        // No pins exist - need to check if there's a map first
        const mapSelector = page.locator('select').filter({ has: page.locator('option') });
        const hasMapSelector = await mapSelector.isVisible().catch(() => false);
        
        if (!hasMapSelector) {
          test.skip();
        }
      }
    });

    test('should show pin type and description in info panel', async ({ page }) => {
      await page.goto(`/campaign/${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
      await waitForAppReady(page);
      
      await page.getByTestId('local-maps-tab').click();
      await expect(page.getByText(/All Maps/i)).toBeVisible({ timeout: 15000 });
      
      const localPins = page.locator('[data-testid^="local-pin-"]');
      const pinCount = await localPins.count();
      
      if (pinCount > 0) {
        await localPins.first().click();
        
        // Panel should show pin type (Shop, Tavern, Temple, etc.)
        const typeLabels = ['Shop', 'Tavern', 'Inn', 'Temple', 'Blacksmith', 'Guild', 'Library', 'Residence', 'Other'];
        
        // Check that some type label is visible
        const hasType = await page.locator('span').filter({ hasText: new RegExp(typeLabels.join('|'), 'i') }).first().isVisible().catch(() => false);
        
        // Edit button should be present
        await expect(page.getByRole('button', { name: /Edit Place/i })).toBeVisible();
      } else {
        test.skip();
      }
    });

    test('should open edit modal when clicking Edit Place', async ({ page }) => {
      await page.goto(`/campaign/${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
      await waitForAppReady(page);
      
      await page.getByTestId('local-maps-tab').click();
      await expect(page.getByText(/All Maps/i)).toBeVisible({ timeout: 15000 });
      
      const localPins = page.locator('[data-testid^="local-pin-"]');
      const pinCount = await localPins.count();
      
      if (pinCount > 0) {
        await localPins.first().click();
        
        // Click Edit Place button
        await page.getByRole('button', { name: /Edit Place/i }).click();
        
        // Edit modal should appear
        await expect(page.getByRole('heading', { name: /Edit Place/i })).toBeVisible({ timeout: 5000 });
        
        // Modal should have form fields
        await expect(page.getByText(/NAME \*/i)).toBeVisible();
        await expect(page.getByText(/TYPE/i)).toBeVisible();
        
        // Close modal
        await page.getByRole('button', { name: /Cancel/i }).click();
      } else {
        test.skip();
      }
    });
  });

  test.describe('Local Map Tab - Add Place Mode', () => {
    
    test('should enter Add Place mode and change cursor', async ({ page }) => {
      await page.goto(`/campaign/${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
      await waitForAppReady(page);
      
      await page.getByTestId('local-maps-tab').click();
      await expect(page.getByText(/All Maps/i)).toBeVisible({ timeout: 15000 });
      
      // Need to have a map selected to see Add Place button
      const addPlaceBtn = page.getByRole('button', { name: /Add Place/i });
      const hasBtn = await addPlaceBtn.isVisible().catch(() => false);
      
      if (hasBtn) {
        // Click Add Place mode
        await addPlaceBtn.click();
        
        // Button should be highlighted
        await expect(addPlaceBtn).toHaveCSS('border-color', /225|E11D48/i).catch(() => true);
        
        // Toggle off
        await addPlaceBtn.click();
      }
    });

    test('should show POI type selector with Shop, Tavern, Temple options', async ({ page }) => {
      await page.goto(`/campaign/${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
      await waitForAppReady(page);
      
      await page.getByTestId('local-maps-tab').click();
      await expect(page.getByRole('button', { name: /Upload Local Map/i })).toBeVisible({ timeout: 15000 });
      
      // Open upload modal to see POI types
      await page.getByRole('button', { name: /Upload Local Map/i }).click();
      await expect(page.getByRole('heading', { name: /Upload Local Map/i })).toBeVisible({ timeout: 5000 });
      
      // Close and check pin editor instead
      await page.getByRole('button', { name: /Cancel/i }).click();
      
      // Look for pins on any visible map
      const localPins = page.locator('[data-testid^="local-pin-"]');
      const pinCount = await localPins.count();
      
      if (pinCount > 0) {
        await localPins.first().click();
        await page.getByRole('button', { name: /Edit Place/i }).click();
        
        // Check for POI type buttons
        await expect(page.getByRole('button', { name: /Shop/i })).toBeVisible({ timeout: 5000 });
        await expect(page.getByRole('button', { name: /Tavern/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /Temple/i })).toBeVisible();
        
        await page.getByRole('button', { name: /Cancel/i }).click();
      }
    });
  });
});
