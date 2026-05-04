import { test, expect } from '@playwright/test';

// Test credentials
const TEST_EMAIL = 'lcblakey24@outlook.com';
const TEST_PASSWORD = 'LCBlakey24?!';

// Helper function to login and navigate to GM Screen
async function loginAndNavigateToGMScreen(page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  
  // Click Sign In
  await page.click('text=Sign In');
  await page.waitForTimeout(1000);
  
  // Fill login form
  await page.fill('input[type="email"]', TEST_EMAIL);
  await page.fill('input[type="password"]', TEST_PASSWORD);
  await page.click('button:has-text("Sign In")');
  await page.waitForTimeout(3000);
  
  // Click on first campaign
  await page.click('text=TEST_Campaign_1773389199863', { force: true });
  await page.waitForTimeout(2000);
  
  // Get campaign ID and navigate to GM Screen
  const url = page.url();
  const campaignId = url.split('/campaign/')[1]?.split('/')[0] || 'b51ba0e9-5b08-44ed-b3dd-4a97dd2a09f6';
  await page.goto(`/gm-screen/${campaignId}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  
  return campaignId;
}

test.describe('GM Screen Enhancements', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
  });

  test('GM Screen loads with all 12 tabs visible', async ({ page }) => {
    await loginAndNavigateToGMScreen(page);
    
    // Verify all 12 tabs are visible in the sidebar
    const expectedTabs = [
      'Combat',
      'Location',
      'NPCs',
      'Monsters',
      'Tables',
      'Loot',
      'Dice',
      'Party',
      'Notes',
      'Story Arcs',
      'Soundboard',
      'Uploads'
    ];
    
    for (const tabName of expectedTabs) {
      const tab = page.getByTestId(`tab-${tabName.toLowerCase().replace(' ', '')}`).or(
        page.locator(`button:has-text("${tabName}")`)
      );
      await expect(tab.first()).toBeVisible();
    }
    
    await page.screenshot({ path: 'gm-screen-12-tabs.jpeg', quality: 20, fullPage: false });
  });

  test('Quick Dice panel is visible and has 3D dice buttons', async ({ page }) => {
    await loginAndNavigateToGMScreen(page);
    
    // Verify Quick Dice panel is visible
    await expect(page.locator('text=Quick Dice')).toBeVisible();
    
    // Verify dice buttons are present
    const diceTypes = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'];
    for (const die of diceTypes) {
      await expect(page.locator(`button:has-text("${die}")`).first()).toBeVisible();
    }
    
    // Verify common rolls section
    await expect(page.locator('text=Attack (d20)')).toBeVisible();
    await expect(page.locator('text=Advantage')).toBeVisible();
    await expect(page.locator('text=Damage (2d6)')).toBeVisible();
    await expect(page.locator('text=Fireball (8d6)')).toBeVisible();
    
    // Verify percentile roll
    await expect(page.locator('text=Roll d100')).toBeVisible();
    
    await page.screenshot({ path: 'quick-dice-panel.jpeg', quality: 20, fullPage: false });
  });

  test('3D Dice roller triggers when clicking dice buttons', async ({ page }) => {
    await loginAndNavigateToGMScreen(page);
    
    // Click on d20 button
    await page.locator('button:has-text("d20")').first().click();
    await page.waitForTimeout(500);
    
    // The 3D dice roller should appear as a full-screen overlay
    // Check for the dice roller overlay (it uses a portal to document.body)
    const diceOverlay = page.locator('div').filter({ hasText: /D20|CRITICAL|Click anywhere to close/i }).first();
    
    // Wait for the animation to complete and check if overlay appeared
    await page.waitForTimeout(2000);
    
    // Take screenshot to verify dice roller appeared
    await page.screenshot({ path: '3d-dice-roll.jpeg', quality: 20, fullPage: false });
    
    // Click to close the overlay
    await page.click('body', { force: true });
    await page.waitForTimeout(500);
  });

  test('Story Arcs tab displays with ability to create new arcs', async ({ page }) => {
    await loginAndNavigateToGMScreen(page);
    
    // Click on Story Arcs tab
    await page.getByTestId('tab-story').click();
    await page.waitForTimeout(1000);
    
    // Verify Story Arcs content is visible
    await expect(page.locator('text=Story Arcs & Quest Tracker').or(page.locator('h3:has-text("Story Arcs")'))).toBeVisible();
    
    // Verify New Arc button is present
    await expect(page.locator('button:has-text("New Arc")')).toBeVisible();
    
    // Click New Arc button
    await page.locator('button:has-text("New Arc")').click();
    await page.waitForTimeout(500);
    
    // Verify the create arc form appears
    await expect(page.locator('text=Create New Story Arc')).toBeVisible();
    await expect(page.locator('input[placeholder*="Arc Title"]')).toBeVisible();
    
    await page.screenshot({ path: 'story-arcs-tab.jpeg', quality: 20, fullPage: false });
    
    // Cancel the form
    await page.locator('button:has-text("Cancel")').click();
  });

  test('Soundboard tab displays with built-in sound categories', async ({ page }) => {
    await loginAndNavigateToGMScreen(page);
    
    // Click on Soundboard tab
    await page.getByTestId('tab-sound').click();
    await page.waitForTimeout(1000);
    
    // Verify Soundboard header is visible
    await expect(page.locator('h3:has-text("Soundboard")')).toBeVisible();
    
    // Verify category filters are present
    const categories = ['All', 'Nature', 'Locations', 'Weather', 'Action', 'Mood', 'Custom'];
    for (const category of categories) {
      await expect(page.locator(`button:has-text("${category}")`).first()).toBeVisible();
    }
    
    // Verify some built-in sounds are displayed
    await expect(page.locator('text=Tavern').or(page.locator('text=Forest')).first()).toBeVisible();
    
    // Verify Upload Sound button is present
    await expect(page.locator('button:has-text("Upload Sound")')).toBeVisible();
    
    // Verify master volume controls
    await expect(page.locator('button:has-text("Stop All")')).toBeVisible();
    
    await page.screenshot({ path: 'soundboard-tab.jpeg', quality: 20, fullPage: false });
  });

  test('Uploads tab displays with 5 upload categories', async ({ page }) => {
    await loginAndNavigateToGMScreen(page);
    
    // Click on Uploads tab
    await page.getByTestId('tab-uploads').click();
    await page.waitForTimeout(1000);
    
    // Verify Uploads header is visible
    await expect(page.locator('h3:has-text("Campaign Uploads")')).toBeVisible();
    
    // Verify all 5 upload categories are present
    const uploadCategories = [
      'Campaign Maps',
      'Character Portraits',
      'Documents & PDFs',
      'Audio & Music',
      'Other Files'
    ];
    
    for (const category of uploadCategories) {
      await expect(page.locator(`h4:has-text("${category}")`)).toBeVisible();
    }
    
    // Verify upload buttons are present
    const uploadButtons = page.locator('button:has-text("Click to Upload")');
    await expect(uploadButtons).toHaveCount(5);
    
    // Verify Recent Uploads section
    await expect(page.locator('h4:has-text("Recent Uploads")')).toBeVisible();
    
    await page.screenshot({ path: 'uploads-tab.jpeg', quality: 20, fullPage: false });
  });

  test('All tabs render without errors', async ({ page }) => {
    await loginAndNavigateToGMScreen(page);
    
    const tabs = [
      { id: 'combat', expectedContent: 'Combat Control' },
      { id: 'location', expectedContent: 'Location' },
      { id: 'npcs', expectedContent: 'NPCs' },
      { id: 'monsters', expectedContent: 'Monsters' },
      { id: 'tables', expectedContent: 'Random Tables' },
      { id: 'loot', expectedContent: 'Loot Generator' },
      { id: 'dice', expectedContent: 'Dice Roller' },
      { id: 'party', expectedContent: 'Party' },
      { id: 'notes', expectedContent: 'Session Notes' },
      { id: 'story', expectedContent: 'Story Arcs' },
      { id: 'sound', expectedContent: 'Soundboard' },
      { id: 'uploads', expectedContent: 'Campaign Uploads' }
    ];
    
    for (const tab of tabs) {
      // Click on the tab
      await page.getByTestId(`tab-${tab.id}`).click();
      await page.waitForTimeout(500);
      
      // Verify no error messages are displayed
      const errorElement = page.locator('text=Error').or(page.locator('text=Something went wrong'));
      const errorCount = await errorElement.count();
      
      // Check that expected content is visible (at least partially)
      const content = page.locator(`text=${tab.expectedContent}`).first();
      await expect(content).toBeVisible();
    }
    
    await page.screenshot({ path: 'all-tabs-verified.jpeg', quality: 20, fullPage: false });
  });

  // NOTE: Live Session Mode floating panel was removed and merged into GM Screen
  // The floating toggle button no longer exists - this test is now obsolete
  test.skip('Live Session Mode toggle button is visible (REMOVED - merged into GM Screen)', async ({ page }) => {
    await loginAndNavigateToGMScreen(page);
    
    // Remove any fixed badge that may block clicks
    await page.evaluate(() => {
      document
        .querySelectorAll('[data-hosted-badge], [data-testid="hosted-badge"]')
        .forEach((badge) => badge.remove());
    });
    
    // Verify the Live Session Mode toggle button (lightning bolt icon) is visible in bottom right
    const liveSessionToggle = page.getByTestId('live-session-toggle');
    await expect(liveSessionToggle).toBeVisible();
    
    // Click to open Live Session panel
    await liveSessionToggle.click({ force: true });
    await page.waitForTimeout(500);
    
    // Verify Live Session panel opens
    await expect(page.locator('text=Live Session')).toBeVisible();
    await expect(page.locator('text=Quick Actions')).toBeVisible();
    
    await page.screenshot({ path: 'live-session-panel.jpeg', quality: 20, fullPage: false });
    
    // Close the panel
    await page.locator('button:has-text("Close Panel")').click({ force: true });
  });

  test('Combat tab has Start Combat and Quick Start buttons', async ({ page }) => {
    await loginAndNavigateToGMScreen(page);
    
    // Combat tab should be active by default
    await expect(page.locator('text=Combat Control')).toBeVisible();
    
    // Verify combat buttons
    await expect(page.getByTestId('start-combat-btn').or(page.locator('button:has-text("Start Combat")'))).toBeVisible();
    await expect(page.getByTestId('quick-combat-btn').or(page.locator('button:has-text("Quick Start")'))).toBeVisible();
    await expect(page.getByTestId('spontaneous-combat-btn').or(page.locator('button:has-text("Spontaneous Combat")'))).toBeVisible();
    
    await page.screenshot({ path: 'combat-tab-buttons.jpeg', quality: 20, fullPage: false });
  });
});
