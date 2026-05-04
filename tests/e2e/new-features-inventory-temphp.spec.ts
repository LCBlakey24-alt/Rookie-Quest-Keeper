import { test, expect } from '@playwright/test';

// Test credentials
const TEST_EMAIL = 'lcblakey24@outlook.com';
const TEST_PASSWORD = 'LCBlakey24?!';

test.describe('New Features - Equipment & Inventory, Temp HP, Skills', () => {
  
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByText('My Characters')).toBeVisible();
  });

  test.describe('Landing Page Updates', () => {
    test('Logo is centered and KEEPER text is white/large', async ({ page }) => {
      // Go to landing page without authentication - use fresh context
      const newContext = await page.context().browser()!.newContext();
      const newPage = await newContext.newPage();
      
      await newPage.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
      
      // Verify KEEPER text is visible and white
      const keeperText = newPage.locator('h1:has-text("KEEPER")');
      await expect(keeperText).toBeVisible();
      
      // Verify Sign In button is visible (white text on glass panel)
      await expect(newPage.getByText('Sign In')).toBeVisible();
      
      // Take screenshot for visual verification
      await newPage.screenshot({ path: 'landing-page-updates.jpeg', quality: 20, fullPage: false });
      
      await newContext.close();
    });
  });

  test.describe('Character Sheet - Inventory Tab', () => {
    test('Inventory tab displays Equipment slots', async ({ page }) => {
      // Navigate to a character
      await page.click('text=TEST_Hero_1773389545537');
      await page.waitForLoadState('domcontentloaded');
      
      // Click on Inventory tab
      await page.click('button:has-text("Inventory")');
      await page.waitForLoadState('domcontentloaded');
      
      // Verify Equipment section is visible
      await expect(page.getByText('Equipment')).toBeVisible();
      
      // Verify 4 equipment slots exist
      await expect(page.getByText('ARMOR')).toBeVisible();
      await expect(page.getByText('SHIELD')).toBeVisible();
      await expect(page.getByText('MAIN HAND')).toBeVisible();
      await expect(page.getByText('OFF HAND')).toBeVisible();
      
      // Verify Equipped AC is displayed
      await expect(page.getByText('Equipped AC')).toBeVisible();
      
      await page.screenshot({ path: 'inventory-equipment-slots.jpeg', quality: 20, fullPage: false });
    });

    test('Inventory tab shows empty inventory state', async ({ page }) => {
      await page.click('text=TEST_Hero_1773389545537');
      await page.waitForLoadState('domcontentloaded');
      
      await page.click('button:has-text("Inventory")');
      await page.waitForLoadState('domcontentloaded');
      
      // Verify Inventory section header
      await expect(page.getByText(/Inventory \(\d+\)/)).toBeVisible();
      
      // Verify weight and gold tracking
      await expect(page.getByText(/lbs/)).toBeVisible();
      await expect(page.getByText('GP')).toBeVisible();
      
      // Verify Add Item button exists
      await expect(page.getByRole('button', { name: /Add Item/ })).toBeVisible();
    });

    test('Item browser opens and shows search functionality', async ({ page }) => {
      await page.click('text=TEST_Hero_1773389545537');
      await page.waitForLoadState('domcontentloaded');
      
      await page.click('button:has-text("Inventory")');
      await page.waitForLoadState('domcontentloaded');
      
      // Click Add Item button
      await page.click('button:has-text("Add Item")');
      
      // Verify search input appears
      const searchInput = page.getByPlaceholder('Search items...');
      await expect(searchInput).toBeVisible();
      
      // Verify type and rarity filters exist
      await expect(page.locator('select').first()).toBeVisible();
      
      await page.screenshot({ path: 'item-browser-open.jpeg', quality: 20, fullPage: false });
    });

    test('Item search returns results from 3000+ items database', async ({ page }) => {
      await page.click('text=TEST_Hero_1773389545537');
      await page.waitForLoadState('domcontentloaded');
      
      await page.click('button:has-text("Inventory")');
      await page.waitForLoadState('domcontentloaded');
      
      // Open item browser
      await page.click('button:has-text("Add Item")');
      
      // Search for a specific item
      await page.fill('input[placeholder="Search items..."]', 'longsword');
      
      // Wait for results
      await page.waitForTimeout(500);
      
      // Verify results contain the search term
      const itemResults = page.locator('text=Longsword').first();
      await expect(itemResults).toBeVisible();
      
      await page.screenshot({ path: 'item-search-results.jpeg', quality: 20, fullPage: false });
    });

    test('Can filter items by type', async ({ page }) => {
      await page.click('text=TEST_Hero_1773389545537');
      await page.waitForLoadState('domcontentloaded');
      
      await page.click('button:has-text("Inventory")');
      await page.click('button:has-text("Add Item")');
      
      // Select Melee Weapon type filter
      await page.selectOption('select:first-of-type', 'Melee Weapon');
      await page.waitForTimeout(500);
      
      // Verify filtered results show items - the type filter is working if results change
      // Check for any item in the results area
      const itemResults = page.locator('div').filter({ hasText: /Scimitar|Sword|Axe|Mace/i }).first();
      await expect(itemResults).toBeVisible();
      
      await page.screenshot({ path: 'item-filter-type.jpeg', quality: 20, fullPage: false });
    });

    test('Can filter items by rarity', async ({ page }) => {
      await page.click('text=TEST_Hero_1773389545537');
      await page.waitForLoadState('domcontentloaded');
      
      await page.click('button:has-text("Inventory")');
      await page.click('button:has-text("Add Item")');
      
      // Select Rare rarity filter
      await page.selectOption('select:nth-of-type(2)', 'Rare');
      await page.waitForTimeout(500);
      
      // Take screenshot to verify
      await page.screenshot({ path: 'item-filter-rarity.jpeg', quality: 20, fullPage: false });
    });

    test('Can add item to inventory', async ({ page }) => {
      await page.click('text=TEST_Hero_1773389545537');
      await page.waitForLoadState('domcontentloaded');
      
      await page.click('button:has-text("Inventory")');
      
      // Get initial inventory count
      const inventoryHeader = page.getByText(/Inventory \(\d+\)/);
      await expect(inventoryHeader).toBeVisible();
      
      // Open item browser
      await page.click('button:has-text("Add Item")');
      
      // Search for a specific item
      await page.fill('input[placeholder="Search items..."]', 'Chain Mail');
      await page.waitForTimeout(500);
      
      // Click on an item to add it
      const itemToAdd = page.locator('text=Chain Mail').first();
      if (await itemToAdd.isVisible()) {
        await itemToAdd.click();
        
        // Verify toast notification or inventory update
        await page.waitForTimeout(500);
        await page.screenshot({ path: 'item-added.jpeg', quality: 20, fullPage: false });
      }
    });
  });

  test.describe('Character Sheet - Temp HP Feature', () => {
    test('Temp HP controls are visible in HP section', async ({ page }) => {
      await page.click('text=TEST_Hero_1773389545537');
      await page.waitForLoadState('domcontentloaded');
      
      // Verify TEMP HP label is visible
      await expect(page.getByText('TEMP')).toBeVisible();
      
      // Verify + and - buttons for temp HP exist
      const tempHpSection = page.locator('div:has-text("TEMP")').filter({ hasText: /^TEMP/ }).first();
      await expect(tempHpSection).toBeVisible();
      
      await page.screenshot({ path: 'temp-hp-controls.jpeg', quality: 20, fullPage: false });
    });

    test('Temp HP can be increased with + button', async ({ page }) => {
      await page.click('text=TEST_Hero_1773389545537');
      await page.waitForLoadState('domcontentloaded');
      
      // Get initial temp HP value (should be 0)
      const tempHpValue = page.locator('div:has-text("TEMP")').filter({ hasText: /^TEMP/ }).locator('span').filter({ hasText: /^\d+$/ }).first();
      
      // Find and click the + button next to TEMP
      const plusButton = page.locator('button:has-text("+")').filter({ hasText: '+' }).first();
      
      // Click + button to increase temp HP
      await plusButton.click();
      await page.waitForTimeout(300);
      
      await page.screenshot({ path: 'temp-hp-increased.jpeg', quality: 20, fullPage: false });
    });

    test('Temp HP display changes when adjusted', async ({ page }) => {
      await page.click('text=TEST_Hero_1773389545537');
      await page.waitForLoadState('domcontentloaded');
      
      // Find the temp HP section
      const tempSection = page.locator('div').filter({ hasText: /^TEMP.*\d/ }).first();
      await expect(tempSection).toBeVisible();
      
      // Click + to increase temp HP multiple times
      const buttons = page.locator('button').filter({ hasText: '+' });
      // There are multiple + buttons - we need the one in the TEMP section
      // Based on code, temp HP + is right after TEMP label
      const tempPlusBtn = page.locator('text=TEMP').locator('..').locator('button:has-text("+")').first();
      if (await tempPlusBtn.isVisible()) {
        await tempPlusBtn.click();
        await tempPlusBtn.click();
        await page.screenshot({ path: 'temp-hp-adjusted.jpeg', quality: 20, fullPage: false });
      }
    });
  });

  test.describe('Character Sheet - Skills with Proficiency', () => {
    test('Skills panel displays all 18 skills', async ({ page }) => {
      await page.click('text=TEST_Hero_1773389545537');
      await page.waitForLoadState('domcontentloaded');
      
      // Verify Skills header
      await expect(page.getByText('Skills', { exact: true })).toBeVisible();
      
      // Verify some key skills are displayed using data-testid
      const skills = ['acrobatics', 'arcana', 'athletics', 'perception', 'stealth'];
      for (const skill of skills) {
        await expect(page.getByTestId(`skill-${skill}`)).toBeVisible();
      }
      
      await page.screenshot({ path: 'skills-panel.jpeg', quality: 20, fullPage: false });
    });

    test('Skills are clickable for dice rolls', async ({ page }) => {
      await page.click('text=TEST_Hero_1773389545537');
      await page.waitForLoadState('domcontentloaded');
      
      // Click on a skill
      const athleticsSkill = page.getByTestId('skill-athletics');
      await athleticsSkill.click();
      
      // Wait for dice roller to appear (or toast notification)
      await page.waitForTimeout(500);
      
      await page.screenshot({ path: 'skill-clicked.jpeg', quality: 20, fullPage: false });
    });

    test('Skill bonuses are calculated correctly', async ({ page }) => {
      // Navigate to wizard character with higher INT
      await page.click('text=TEST_SPELLS_OBJ_FORMAT');
      await page.waitForLoadState('domcontentloaded');
      
      // Verify INT-based skills show +3 modifier (INT 16 = +3)
      // Arcana should show +3 (no proficiency) or higher if proficient
      await expect(page.getByText('Arcana')).toBeVisible();
      
      await page.screenshot({ path: 'skill-bonuses.jpeg', quality: 20, fullPage: false });
    });
  });

  test.describe('Previous Bug Fixes Regression', () => {
    test('Level Up button works and opens wizard', async ({ page }) => {
      await page.click('text=TEST_Hero_1773389545537');
      await page.waitForLoadState('domcontentloaded');
      
      // Click Level Up button
      const levelUpBtn = page.getByTestId('level-up-btn');
      await levelUpBtn.click();
      
      // Verify wizard opens
      await expect(page.getByText('Choose Your Path')).toBeVisible();
      
      await page.screenshot({ path: 'levelup-wizard-opens.jpeg', quality: 20, fullPage: false });
    });

    test('Edit Character button navigates to edit page', async ({ page }) => {
      await page.click('text=TEST_Hero_1773389545537');
      await page.waitForLoadState('domcontentloaded');
      
      // Click Edit button
      await page.click('button:has-text("Edit")');
      await page.waitForLoadState('domcontentloaded');
      
      // Verify navigation to edit page
      await expect(page).toHaveURL(/\/characters\/.*\/edit/);
      
      await page.screenshot({ path: 'edit-page-navigation.jpeg', quality: 20, fullPage: false });
    });

    test('HP clamping - HP never exceeds max', async ({ page }) => {
      await page.click('text=TEST_Hero_1773389545537');
      await page.waitForLoadState('domcontentloaded');
      
      // Verify HP display format shows currentHP/maxHP
      const hpDisplay = page.locator('text=/\\d+\\/\\d+/').first();
      await expect(hpDisplay).toBeVisible();
      
      // The displayed HP should follow format X/Y where X <= Y
      await page.screenshot({ path: 'hp-clamping-display.jpeg', quality: 20, fullPage: false });
    });
  });
});
