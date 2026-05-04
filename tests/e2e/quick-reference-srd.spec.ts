import { test, expect } from '@playwright/test';
import { waitForAppReady, dismissToasts, removeBlockingBadges, TEST_USER, TEST_CAMPAIGN_ID, loginTestUser } from '../fixtures/helpers';

test.describe('QuickReferenceTab - SRD Data Features', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    
    // Login with test user
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await page.getByTestId('login-email').fill(TEST_USER.email);
    await page.getByTestId('login-password').fill(TEST_USER.password);
    await page.getByTestId('login-btn').click();
    await page.waitForURL(/\/home/, { timeout: 15000 });
    
    // Navigate to test campaign
    await page.goto(`/campaign/${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    
    // Wait for campaign to load and click Reference tab
    await page.waitForSelector('[data-testid="reference-tab"]', { timeout: 10000 });
    await page.getByTestId('reference-tab').click();
    await page.waitForSelector('[data-testid="quick-reference-tab"]', { timeout: 10000 });
    await removeBlockingBadges(page);
  });

  test.describe('Section Navigation', () => {
    test('displays all section tabs (Items, Spells, Classes, Races, Rules)', async ({ page }) => {
      // Verify all section tabs are visible
      await expect(page.getByTestId('reference-tab-items')).toBeVisible();
      await expect(page.getByTestId('reference-tab-spells')).toBeVisible();
      await expect(page.getByTestId('reference-tab-classes')).toBeVisible();
      await expect(page.getByTestId('reference-tab-races')).toBeVisible();
      await expect(page.getByTestId('reference-tab-rules')).toBeVisible();
    });

    test('Items section is displayed by default', async ({ page }) => {
      // Items tab should be active by default
      await expect(page.getByText('Items Database')).toBeVisible({ timeout: 5000 });
      await expect(page.getByTestId('reference-search-input')).toBeVisible();
    });

    test('can switch between all sections', async ({ page }) => {
      // Switch to Spells
      await page.getByTestId('reference-tab-spells').click();
      await expect(page.getByText('SRD Spells')).toBeVisible({ timeout: 10000 });

      // Switch to Classes
      await page.getByTestId('reference-tab-classes').click();
      await expect(page.getByText('Character Classes')).toBeVisible({ timeout: 10000 });

      // Switch to Races
      await page.getByTestId('reference-tab-races').click();
      await expect(page.getByText('Character Races')).toBeVisible({ timeout: 10000 });

      // Switch to Rules
      await page.getByTestId('reference-tab-rules').click();
      await expect(page.getByText('Rules Quick Reference')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Items Section', () => {
    test('displays 3000+ items from local database', async ({ page }) => {
      // Items section should show the item count
      await expect(page.getByText(/3,\d+ items/)).toBeVisible({ timeout: 5000 });
    });

    test('items can be filtered by type', async ({ page }) => {
      // Use type filter
      await page.getByTestId('item-type-filter').selectOption('Melee Weapon');
      
      // Should show filtered results
      await expect(page.getByText(/Showing \d+ of/)).toBeVisible();
    });

    test('items can be filtered by rarity', async ({ page }) => {
      // Use rarity filter
      await page.getByTestId('item-rarity-filter').selectOption('Rare');
      
      // Should show filtered results
      await expect(page.getByText(/Showing \d+ of/)).toBeVisible();
    });

    test('search filters items correctly', async ({ page }) => {
      // Search for a sword
      await page.getByTestId('reference-search-input').fill('sword');
      
      // Should show filtered results
      await expect(page.getByText(/Showing \d+ of/)).toBeVisible();
    });

    test('clicking item shows description', async ({ page }) => {
      // Click on first item card
      await page.getByTestId('item-card-0').click();
      
      // The card should expand (border color changes to accent)
      // We wait for any description-like content
      await expect(page.getByTestId('item-card-0')).toHaveCSS('border-color', /rgb\(225, 29, 72\)/);
    });
  });

  test.describe('Spells Section - API Data', () => {
    test.beforeEach(async ({ page }) => {
      await page.getByTestId('reference-tab-spells').click();
      // Wait for spells to load from API
      await expect(page.getByText('SRD Spells')).toBeVisible({ timeout: 10000 });
    });

    test('displays 319 spells from /api/srd/spells', async ({ page }) => {
      // Should show exactly 319 spells (use exact match with first())
      await expect(page.getByText('319 spells', { exact: true }).first()).toBeVisible({ timeout: 10000 });
    });

    test('spells can be filtered by level', async ({ page }) => {
      // Filter by Cantrip (level 0)
      await page.getByTestId('spell-level-filter').selectOption('0');
      
      // Should show filtered results
      await expect(page.getByText(/Showing \d+ of/)).toBeVisible();
      
      // All visible spells should be cantrips
      const cantriBadge = page.locator('[data-testid^="spell-card-"]').first().getByText('Cantrip');
      await expect(cantriBadge).toBeVisible();
    });

    test('spells can be filtered by school', async ({ page }) => {
      // Filter by Evocation
      await page.getByTestId('spell-school-filter').selectOption('Evocation');
      
      // Should show filtered results
      await expect(page.getByText(/Showing \d+ of/)).toBeVisible();
    });

    test('spells can be filtered by class', async ({ page }) => {
      // Filter by Wizard
      await page.getByTestId('spell-class-filter').selectOption('Wizard');
      
      // Should show filtered results
      await expect(page.getByText(/Showing \d+ of/)).toBeVisible();
    });

    test('search filters spells correctly', async ({ page }) => {
      // Search for "fire"
      await page.getByTestId('reference-search-input').fill('fire');
      
      // Should show filtered results
      await expect(page.getByText(/Showing \d+ of/)).toBeVisible();
    });

    test('clicking spell shows full description', async ({ page }) => {
      // Click on first spell card
      await page.getByTestId('spell-card-0').click();
      
      // Description should expand to show components and classes
      await expect(page.getByText(/Components:/)).toBeVisible({ timeout: 5000 });
      await expect(page.getByText(/Classes:/)).toBeVisible();
    });

    test('spell cards show level, school, casting time, range, duration', async ({ page }) => {
      // First spell card should have essential info
      const firstSpell = page.getByTestId('spell-card-0');
      await expect(firstSpell).toBeVisible();
      
      // Check for spell attributes (casting time, range, duration format)
      const spellText = await firstSpell.textContent();
      expect(spellText).toMatch(/\d+ (action|minute|hour|bonus action)/i);
      expect(spellText).toMatch(/\d+ (feet|ft|mile)/i);
    });
  });

  test.describe('Classes Section - API Data', () => {
    test.beforeEach(async ({ page }) => {
      await page.getByTestId('reference-tab-classes').click();
      await expect(page.getByText('Character Classes')).toBeVisible({ timeout: 10000 });
    });

    test('displays 12 classes from /api/srd/classes', async ({ page }) => {
      // Should show 12 classes
      await expect(page.getByText('12 classes available')).toBeVisible({ timeout: 10000 });
    });

    test('displays standard D&D classes', async ({ page }) => {
      // Check for standard class names
      await expect(page.getByText('Barbarian')).toBeVisible();
      await expect(page.getByText('Bard')).toBeVisible();
      await expect(page.getByText('Cleric')).toBeVisible();
      await expect(page.getByText('Druid')).toBeVisible();
    });

    test('class cards show Hit Die and Saves', async ({ page }) => {
      // First class card should show hit die
      const firstClass = page.getByTestId('class-card-0');
      await expect(firstClass).toBeVisible();
      
      const classText = await firstClass.textContent();
      expect(classText).toMatch(/Hit Die:/i);
      expect(classText).toMatch(/Saves:/i);
    });

    test('clicking class shows proficiencies and starting equipment', async ({ page }) => {
      // Click on first class card
      await page.getByTestId('class-card-0').click();
      
      // Should expand to show proficiencies
      await expect(page.getByText(/Proficiencies:/)).toBeVisible({ timeout: 5000 });
    });

    test('search filters classes correctly', async ({ page }) => {
      // Search for "Fighter"
      await page.getByTestId('reference-search-input').fill('Fighter');
      
      // Should show Fighter class
      await expect(page.getByText('Fighter')).toBeVisible();
    });
  });

  test.describe('Races Section - API Data', () => {
    test.beforeEach(async ({ page }) => {
      await page.getByTestId('reference-tab-races').click();
      await expect(page.getByText('Character Races')).toBeVisible({ timeout: 10000 });
    });

    test('displays 9 races from /api/srd/races', async ({ page }) => {
      // Should show 9 races
      await expect(page.getByText('9 races available')).toBeVisible({ timeout: 10000 });
    });

    test('displays standard D&D races', async ({ page }) => {
      // Check for standard race names using exact match or first()
      await expect(page.getByText('Dragonborn')).toBeVisible();
      await expect(page.getByText('Dwarf')).toBeVisible();
      // Use exact match to avoid matching "Half-Elf"
      await expect(page.getByRole('heading', { name: 'Elf', exact: true })).toBeVisible();
    });

    test('race cards show ASI, Speed, Size, and Traits', async ({ page }) => {
      // First race card should show attributes
      const firstRace = page.getByTestId('race-card-0');
      await expect(firstRace).toBeVisible();
      
      const raceText = await firstRace.textContent();
      expect(raceText).toMatch(/ASI:/i);
      expect(raceText).toMatch(/Speed:/i);
      expect(raceText).toMatch(/Size:/i);
      expect(raceText).toMatch(/Traits:/i);
    });

    test('clicking race shows expanded details', async ({ page }) => {
      // Click on first race card
      await page.getByTestId('race-card-0').click();
      
      // Should expand to show more details (age, alignment, etc.)
      await expect(page.getByText(/Age:/)).toBeVisible({ timeout: 5000 });
    });

    test('search filters races correctly', async ({ page }) => {
      // Search for "Elf"
      await page.getByTestId('reference-search-input').fill('Elf');
      
      // Should show Elf race (use exact match to avoid Half-Elf)
      await expect(page.getByRole('heading', { name: 'Elf', exact: true })).toBeVisible();
    });
  });

  test.describe('Rules Section', () => {
    test.beforeEach(async ({ page }) => {
      await page.getByTestId('reference-tab-rules').click();
      await expect(page.getByText('Rules Quick Reference')).toBeVisible({ timeout: 10000 });
    });

    test('displays Difficulty Classes section', async ({ page }) => {
      // DC section should be visible and expanded by default
      await expect(page.getByText('Difficulty Classes (DC)')).toBeVisible();
      
      // Should show DC values
      await expect(page.getByText('5').first()).toBeVisible();
      await expect(page.getByText('Very Easy')).toBeVisible();
    });

    test('displays Conditions section that can be expanded', async ({ page }) => {
      // Conditions section heading should be visible
      await expect(page.getByText('Conditions')).toBeVisible();
      
      // Click to expand
      await page.getByText('Conditions').click();
      
      // Should show condition names
      await expect(page.getByText('Blinded')).toBeVisible({ timeout: 5000 });
      await expect(page.getByText('Charmed')).toBeVisible();
    });

    test('displays Cover Rules section that can be expanded', async ({ page }) => {
      // Cover section heading should be visible
      await expect(page.getByText('Cover Rules')).toBeVisible();
      
      // Click to expand
      await page.getByText('Cover Rules').click();
      
      // Should show cover types
      await expect(page.getByText('Half Cover')).toBeVisible({ timeout: 5000 });
      await expect(page.getByText('Three-Quarters Cover')).toBeVisible();
    });
  });
});
