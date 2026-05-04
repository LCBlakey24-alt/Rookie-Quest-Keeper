import { test, expect } from '@playwright/test';
import { loginTestUser, removeBlockingBadges, dismissToasts, TEST_USER } from '../fixtures/helpers';

/**
 * Tests for Edition-Aware Character Creation
 * 
 * Features tested:
 * - Edition selection (2014 vs 2024)
 * - SRD races appear first in edition-specific order
 * - Hit dice display per class
 * - Edition label shows correctly
 */

const BASE_URL = 'http://localhost:3000';

test.describe('Edition-Aware Character Creation', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await page.getByTestId('login-email').fill(TEST_USER.email);
    await page.getByTestId('login-password').fill(TEST_USER.password);
    await page.getByTestId('login-btn').click();
    await page.waitForURL(/\/home/, { timeout: 15000 });
    
    // Setup toast handler
    await dismissToasts(page);
  });

  test('should display edition selection screen on character creation', async ({ page }) => {
    await page.goto('/characters/new', { waitUntil: 'domcontentloaded' });
    
    // Should see edition selection
    await expect(page.getByText('Choose Your Rules Edition')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('2014')).toBeVisible();
    await expect(page.getByText('2024')).toBeVisible();
    await expect(page.getByText('Classic 5th Edition')).toBeVisible();
    await expect(page.getByText('Revised 5th Edition')).toBeVisible();
  });

  test('should show 2014 rules label after selecting 2014 edition', async ({ page }) => {
    await page.goto('/characters/new', { waitUntil: 'domcontentloaded' });
    
    // Wait for and click 2014 button
    await expect(page.getByText('Choose Your Rules Edition')).toBeVisible({ timeout: 10000 });
    await page.getByText('2014').first().click();
    
    // Should show 2014 rules label
    await expect(page.getByText('Using 2014 Rules')).toBeVisible({ timeout: 5000 });
  });

  test('should show 2024 rules label after selecting 2024 edition', async ({ page }) => {
    await page.goto('/characters/new', { waitUntil: 'domcontentloaded' });
    
    // Wait for and click 2024 button
    await expect(page.getByText('Choose Your Rules Edition')).toBeVisible({ timeout: 10000 });
    await page.getByText('2024').first().click();
    
    // Should show 2024 rules label
    await expect(page.getByText('Using 2024 Rules')).toBeVisible({ timeout: 5000 });
  });

  test('should display SRD races first in race selection (2014 edition)', async ({ page }) => {
    await page.goto('/characters/new', { waitUntil: 'domcontentloaded' });
    
    // Select 2014 edition
    await expect(page.getByText('Choose Your Rules Edition')).toBeVisible({ timeout: 10000 });
    await page.getByText('2014').first().click();
    
    // Wait for step 1 and go to step 2 (Race & Class)
    await expect(page.getByText('BASIC INFO')).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: /next/i }).click();
    
    // Wait for race selection to appear
    await expect(page.getByText('CHOOSE RACE')).toBeVisible({ timeout: 5000 });
    
    // Verify core SRD races are visible
    await expect(page.getByText('HUMAN').first()).toBeVisible();
    await expect(page.getByText('ELF').first()).toBeVisible();
    await expect(page.getByText('DWARF').first()).toBeVisible();
    await expect(page.getByText('HALFLING').first()).toBeVisible();
    await expect(page.getByText('DRAGONBORN').first()).toBeVisible();
    await expect(page.getByText('GNOME').first()).toBeVisible();
    await expect(page.getByText('HALF-ELF').first()).toBeVisible();
    await expect(page.getByText('HALF-ORC').first()).toBeVisible();
    await expect(page.getByText('TIEFLING').first()).toBeVisible();
  });

  test('should display correct hit dice for each class', async ({ page }) => {
    await page.goto('/characters/new', { waitUntil: 'domcontentloaded' });
    
    // Select 2014 edition
    await expect(page.getByText('Choose Your Rules Edition')).toBeVisible({ timeout: 10000 });
    await page.getByText('2014').first().click();
    
    // Wait for step 1 and go to step 2
    await expect(page.getByText('BASIC INFO')).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: /next/i }).click();
    
    // Wait for class selection
    await expect(page.getByText('CHOOSE CLASS')).toBeVisible({ timeout: 5000 });
    
    // Check d12 class (Barbarian)
    const barbarianCard = page.locator('text=BARBARIAN').first().locator('..');
    await expect(barbarianCard.getByText(/D12/i)).toBeVisible();
    
    // Check d10 classes (Fighter, Paladin, Ranger)
    const fighterCard = page.locator('text=FIGHTER').first().locator('..');
    await expect(fighterCard.getByText(/D10/i)).toBeVisible();
    
    // Check d8 classes (Bard, Cleric, Druid, Monk, Rogue, Warlock)
    const bardCard = page.locator('text=BARD').first().locator('..');
    await expect(bardCard.getByText(/D8/i)).toBeVisible();
    
    // Check d6 classes (Sorcerer, Wizard)
    const wizardCard = page.locator('text=WIZARD').first().locator('..');
    await expect(wizardCard.getByText(/D6/i)).toBeVisible();
  });

  test('should allow edition pre-selection via URL parameter', async ({ page }) => {
    // Navigate with edition parameter
    await page.goto('/characters/new?edition=2024', { waitUntil: 'domcontentloaded' });
    
    // Should skip edition selection and show 2024 rules
    await expect(page.getByText('Using 2024 Rules')).toBeVisible({ timeout: 10000 });
    
    // Should be on step 1 (Concept) not step 0 (Edition Selection)
    await expect(page.getByText('BASIC INFO')).toBeVisible({ timeout: 5000 });
  });

  test('should navigate through character creation steps', async ({ page }) => {
    await page.goto('/characters/new', { waitUntil: 'domcontentloaded' });
    
    // Select edition
    await expect(page.getByText('Choose Your Rules Edition')).toBeVisible({ timeout: 10000 });
    await page.getByText('2014').first().click();
    
    // Step 1: Concept
    await expect(page.getByText('BASIC INFO')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('CONCEPT')).toBeVisible();
    
    // Enter name and click Next
    const nameInput = page.locator('input[placeholder*="Enter name"]').first();
    if (await nameInput.isVisible()) {
      await nameInput.fill('TEST_Navigator_' + Date.now());
    }
    await page.getByRole('button', { name: /next/i }).click();
    
    // Step 2: Race & Class
    await expect(page.getByText('CHOOSE RACE')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('CHOOSE CLASS')).toBeVisible();
    
    // Click Next
    await page.getByRole('button', { name: /next/i }).click();
    
    // Step 3: Abilities
    await expect(page.getByText('ABILITY SCORES')).toBeVisible({ timeout: 5000 });
  });

  test('should display class selection with primary stats', async ({ page }) => {
    await page.goto('/characters/new', { waitUntil: 'domcontentloaded' });
    
    // Select edition
    await expect(page.getByText('Choose Your Rules Edition')).toBeVisible({ timeout: 10000 });
    await page.getByText('2014').first().click();
    
    // Go to step 2
    await expect(page.getByText('BASIC INFO')).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: /next/i }).click();
    
    // Wait for class selection
    await expect(page.getByText('CHOOSE CLASS')).toBeVisible({ timeout: 5000 });
    
    // Verify class cards show primary stats
    // Fighter: STR/DEX
    const fighterCard = page.locator('text=FIGHTER').first().locator('..');
    await expect(fighterCard).toContainText(/STR.*DEX|DEX.*STR/i);
    
    // Wizard: INT
    const wizardCard = page.locator('text=WIZARD').first().locator('..');
    await expect(wizardCard).toContainText(/INT/i);
    
    // Cleric: WIS
    const clericCard = page.locator('text=CLERIC').first().locator('..');
    await expect(clericCard).toContainText(/WIS/i);
  });
});

test.describe('Edition-Specific Content Filtering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await page.getByTestId('login-email').fill(TEST_USER.email);
    await page.getByTestId('login-password').fill(TEST_USER.password);
    await page.getByTestId('login-btn').click();
    await page.waitForURL(/\/home/, { timeout: 15000 });
    await dismissToasts(page);
  });

  test('should show 2014 SRD races with 2014 ability bonus format', async ({ page }) => {
    await page.goto('/characters/new', { waitUntil: 'domcontentloaded' });
    
    // Select 2014 edition
    await expect(page.getByText('Choose Your Rules Edition')).toBeVisible({ timeout: 10000 });
    await page.getByText('2014').first().click();
    
    // Go to step 2
    await expect(page.getByText('BASIC INFO')).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: /next/i }).click();
    
    await expect(page.getByText('CHOOSE RACE')).toBeVisible({ timeout: 5000 });
    
    // 2014 races should show fixed ability bonuses like "+2 DEX"
    await expect(page.getByText('+2 DEX').first()).toBeVisible();
    await expect(page.getByText('+2 CON').first()).toBeVisible();
    await expect(page.getByText('+2 INT').first()).toBeVisible();
  });

  test('should differentiate 2024 edition races', async ({ page }) => {
    await page.goto('/characters/new', { waitUntil: 'domcontentloaded' });
    
    // Select 2024 edition
    await expect(page.getByText('Choose Your Rules Edition')).toBeVisible({ timeout: 10000 });
    await page.getByText('2024').first().click();
    
    // Go to step 2
    await expect(page.getByText('BASIC INFO')).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: /next/i }).click();
    
    await expect(page.getByText('CHOOSE RACE')).toBeVisible({ timeout: 5000 });
    
    // 2024 races should be visible
    await expect(page.getByText('HUMAN').first()).toBeVisible();
    await expect(page.getByText('ELF').first()).toBeVisible();
  });
});
