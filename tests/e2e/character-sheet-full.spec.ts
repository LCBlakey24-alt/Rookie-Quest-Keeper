import { test, expect } from '@playwright/test';

/**
 * Character Sheet Full Tests - NEW Feature
 * Tests the new All-in-One Player Character Sheet with tabbed interface
 * Tabs: Overview, Abilities & Skills, Spells, Features & Feats, Equipment, Notes & Bio
 */

const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';
const TEST_USER = {
  email: 'stress_test_1772651200@test.com',
  password: 'TestPass123!'
};
const TEST_CHARACTER_ID = '5c200c1f-d584-4b3d-a3a2-e1b49b404e8d';

test.describe('Character Sheet Full - Tab Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await page.getByTestId('login-email').fill(TEST_USER.email);
    await page.getByTestId('login-password').fill(TEST_USER.password);
    await page.getByTestId('login-btn').click();
    await page.waitForURL(/\/(home|campaigns)/, { timeout: 15000 });
    
    // Navigate to character sheet
    await page.goto(`/characters/${TEST_CHARACTER_ID}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('character-sheet-full')).toBeVisible({ timeout: 10000 });
  });

  test('should display character sheet with correct character info', async ({ page }) => {
    // Verify character name and level info
    await expect(page.getByRole('heading', { name: /TEST_Elara_Wizard/i })).toBeVisible();
    await expect(page.getByText('Level 5 Elf Wizard (School of Evocation)')).toBeVisible();
  });

  test('should display all six navigation tabs', async ({ page }) => {
    // Verify all tabs are visible
    await expect(page.getByTestId('tab-overview')).toBeVisible();
    await expect(page.getByTestId('tab-abilities')).toBeVisible();
    await expect(page.getByTestId('tab-spells')).toBeVisible();
    await expect(page.getByTestId('tab-features')).toBeVisible();
    await expect(page.getByTestId('tab-equipment')).toBeVisible();
    await expect(page.getByTestId('tab-notes')).toBeVisible();
  });

  test('should navigate between tabs correctly', async ({ page }) => {
    // Click Abilities tab
    await page.getByTestId('tab-abilities').click();
    await expect(page.getByTestId('tab-abilities')).toHaveCSS('background', /gradient/);
    
    // Click Spells tab
    await page.getByTestId('tab-spells').click();
    await expect(page.getByTestId('spell-search')).toBeVisible();
    
    // Click Features tab
    await page.getByTestId('tab-features').click();
    await expect(page.getByText(/Class Features/i)).toBeVisible();
    
    // Click Equipment tab
    await page.getByTestId('tab-equipment').click();
    await expect(page.getByText(/Currency/i)).toBeVisible();
    
    // Click Notes tab  
    await page.getByTestId('tab-notes').click();
    await expect(page.getByRole('heading', { name: 'Personality' })).toBeVisible();
    
    // Click back to Overview tab
    await page.getByTestId('tab-overview').click();
    await expect(page.getByText(/Ability Scores/i)).toBeVisible();
  });

  test('should display quick stats bar (HP, AC, Init, Speed, Prof)', async ({ page }) => {
    await expect(page.getByTestId('hp-display')).toBeVisible();
    await expect(page.getByTestId('ac-display')).toBeVisible();
    await expect(page.getByTestId('initiative-display')).toBeVisible();
    await expect(page.getByTestId('speed-display')).toBeVisible();
    await expect(page.getByTestId('prof-display')).toBeVisible();
    
    // Check specific values
    await expect(page.getByTestId('hp-display')).toContainText('9/9');
    await expect(page.getByTestId('ac-display')).toContainText('12');
    await expect(page.getByTestId('speed-display')).toContainText('30 ft');
    await expect(page.getByTestId('prof-display')).toContainText('+3');
  });
});

test.describe('Character Sheet Full - Ability Scores & Skills', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await page.getByTestId('login-email').fill(TEST_USER.email);
    await page.getByTestId('login-password').fill(TEST_USER.password);
    await page.getByTestId('login-btn').click();
    await page.waitForURL(/\/(home|campaigns)/, { timeout: 15000 });
    await page.goto(`/characters/${TEST_CHARACTER_ID}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('character-sheet-full')).toBeVisible({ timeout: 10000 });
  });

  test('should display all six ability scores with modifiers', async ({ page }) => {
    // Check ability score blocks
    await expect(page.getByTestId('ability-strength')).toBeVisible();
    await expect(page.getByTestId('ability-dexterity')).toBeVisible();
    await expect(page.getByTestId('ability-constitution')).toBeVisible();
    await expect(page.getByTestId('ability-intelligence')).toBeVisible();
    await expect(page.getByTestId('ability-wisdom')).toBeVisible();
    await expect(page.getByTestId('ability-charisma')).toBeVisible();
    
    // Check specific values (Wizard character)
    await expect(page.getByTestId('ability-strength')).toContainText('8');
    await expect(page.getByTestId('ability-strength')).toContainText('-1');
    await expect(page.getByTestId('ability-intelligence')).toContainText('18');
    await expect(page.getByTestId('ability-intelligence')).toContainText('+4');
  });

  test('should display saving throw proficiencies', async ({ page }) => {
    // INT and WIS are proficient saving throws for this wizard
    const intAbility = page.getByTestId('ability-intelligence');
    const wisAbility = page.getByTestId('ability-wisdom');
    
    // Check SAVE values are present
    await expect(intAbility).toContainText('SAVE');
    await expect(wisAbility).toContainText('SAVE');
  });

  test('should display skills section with proficiency indicators', async ({ page }) => {
    // Check proficient skills (arcana, history, investigation)
    await expect(page.getByTestId('skill-arcana')).toBeVisible();
    await expect(page.getByTestId('skill-history')).toBeVisible();
    await expect(page.getByTestId('skill-investigation')).toBeVisible();
    
    // These should show +7 (4 INT mod + 3 Prof)
    await expect(page.getByTestId('skill-arcana')).toContainText('+7');
    await expect(page.getByTestId('skill-history')).toContainText('+7');
    await expect(page.getByTestId('skill-investigation')).toContainText('+7');
  });

  test('should display non-proficient skills with correct modifiers', async ({ page }) => {
    // Check athletics (STR based, not proficient)
    const athleticsSkill = page.getByTestId('skill-athletics');
    await expect(athleticsSkill).toBeVisible();
    await expect(athleticsSkill).toContainText('-1'); // 8 STR = -1 mod
    
    // Check perception (WIS based, not proficient)
    const perceptionSkill = page.getByTestId('skill-perception');
    await expect(perceptionSkill).toBeVisible();
    await expect(perceptionSkill).toContainText('+1'); // 13 WIS = +1 mod
  });
});

test.describe('Character Sheet Full - Spells Tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await page.getByTestId('login-email').fill(TEST_USER.email);
    await page.getByTestId('login-password').fill(TEST_USER.password);
    await page.getByTestId('login-btn').click();
    await page.waitForURL(/\/(home|campaigns)/, { timeout: 15000 });
    await page.goto(`/characters/${TEST_CHARACTER_ID}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('character-sheet-full')).toBeVisible({ timeout: 10000 });
    
    // Navigate to Spells tab
    await page.getByTestId('tab-spells').click();
    await expect(page.getByTestId('spell-search')).toBeVisible({ timeout: 5000 });
  });

  test('should display spellcasting stats', async ({ page }) => {
    // Check spellcasting ability is displayed
    await expect(page.getByText(/Intelligence/i).first()).toBeVisible();
    await expect(page.getByText(/SPELL SAVE DC/i)).toBeVisible();
    await expect(page.getByText(/SPELL ATTACK/i)).toBeVisible();
    
    // Spell Save DC should be 8 + 3 (prof) + 4 (INT mod) = 15
    await expect(page.getByText('15').first()).toBeVisible();
    // Spell Attack should be +7
    await expect(page.getByText('+7').first()).toBeVisible();
  });

  test('should show class-specific spells from SRD', async ({ page }) => {
    // Wizard-specific cantrips should be visible
    await expect(page.getByTestId('spell-acid-splash')).toBeVisible();
    await expect(page.getByTestId('spell-fire-bolt')).toBeVisible();
    await expect(page.getByTestId('spell-light')).toBeVisible();
    
    // Wizard-specific leveled spells
    await expect(page.getByTestId('spell-magic-missile')).toBeVisible();
    await expect(page.getByTestId('spell-shield')).toBeVisible();
  });

  test('should filter spells by search', async ({ page }) => {
    await page.getByTestId('spell-search').fill('fire');
    await page.waitForTimeout(500);
    
    // Fire spells should be visible
    await expect(page.getByTestId('spell-fire-bolt')).toBeVisible();
    
    // Non-fire spells should be hidden
    await expect(page.getByTestId('spell-acid-splash')).not.toBeVisible();
  });

  test('should filter spells by level', async ({ page }) => {
    // Select 1st level filter
    await page.getByTestId('spell-level-filter').selectOption('1');
    await page.waitForTimeout(500);
    
    // 1st level spells should be visible
    await expect(page.getByTestId('spell-magic-missile')).toBeVisible();
    
    // Cantrips should be hidden
    await expect(page.getByTestId('spell-fire-bolt')).not.toBeVisible();
  });

  test('should expand spell details on click', async ({ page }) => {
    // Click on a spell to expand it
    const fireBolt = page.getByTestId('spell-fire-bolt');
    await fireBolt.click();
    
    // Spell details should be visible
    await expect(page.getByText(/CASTING TIME/i).first()).toBeVisible();
    await expect(page.getByText(/RANGE/i).first()).toBeVisible();
  });
});

test.describe('Character Sheet Full - Features & Feats Tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await page.getByTestId('login-email').fill(TEST_USER.email);
    await page.getByTestId('login-password').fill(TEST_USER.password);
    await page.getByTestId('login-btn').click();
    await page.waitForURL(/\/(home|campaigns)/, { timeout: 15000 });
    await page.goto(`/characters/${TEST_CHARACTER_ID}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('character-sheet-full')).toBeVisible({ timeout: 10000 });
    
    // Navigate to Features tab
    await page.getByTestId('tab-features').click();
    await expect(page.getByText(/Class Features/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('should display class features section with character class', async ({ page }) => {
    await expect(page.getByText(/Class Features \(Wizard\)/i)).toBeVisible();
  });

  test('should show class features from SRD based on level', async ({ page }) => {
    // Level 5 wizard should have Arcane Recovery
    await expect(page.getByTestId('feature-arcane-recovery')).toBeVisible();
  });

  test('should display racial traits section', async ({ page }) => {
    await expect(page.getByText(/Racial Traits \(Elf\)/i)).toBeVisible();
  });

  test('should display feats section', async ({ page }) => {
    await expect(page.getByText(/Feats/i).first()).toBeVisible();
  });

  test('should expand feature details on click', async ({ page }) => {
    // Click on Arcane Recovery to expand
    const arcaneRecovery = page.getByTestId('feature-arcane-recovery');
    await arcaneRecovery.click();
    
    // Details should be visible
    await expect(page.getByText(/description|recover|spell slots/i).first()).toBeVisible();
  });
});

test.describe('Character Sheet Full - Edit Mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await page.getByTestId('login-email').fill(TEST_USER.email);
    await page.getByTestId('login-password').fill(TEST_USER.password);
    await page.getByTestId('login-btn').click();
    await page.waitForURL(/\/(home|campaigns)/, { timeout: 15000 });
    await page.goto(`/characters/${TEST_CHARACTER_ID}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('character-sheet-full')).toBeVisible({ timeout: 10000 });
  });

  test('should toggle edit mode with Edit button', async ({ page }) => {
    // Initially in view mode, Edit button visible
    await expect(page.getByTestId('edit-btn')).toBeVisible();
    
    // Click Edit button
    await page.getByTestId('edit-btn').click();
    
    // Save and Cancel buttons should appear
    await expect(page.getByTestId('save-btn')).toBeVisible();
    await expect(page.getByTestId('cancel-edit-btn')).toBeVisible();
    
    // Edit button should be hidden
    await expect(page.getByTestId('edit-btn')).not.toBeVisible();
  });

  test('should cancel edit mode without saving', async ({ page }) => {
    await page.getByTestId('edit-btn').click();
    await expect(page.getByTestId('cancel-edit-btn')).toBeVisible();
    
    // Cancel edit
    await page.getByTestId('cancel-edit-btn').click();
    
    // Should return to view mode
    await expect(page.getByTestId('edit-btn')).toBeVisible();
    await expect(page.getByTestId('save-btn')).not.toBeVisible();
  });

  test('should show editable ability score inputs in edit mode', async ({ page }) => {
    await page.getByTestId('edit-btn').click();
    
    // Ability score blocks should have inputs
    const strengthBlock = page.getByTestId('ability-strength');
    const input = strengthBlock.locator('input[type="number"]');
    await expect(input).toBeVisible();
  });

  test('should show skill proficiency toggles in edit mode', async ({ page }) => {
    await page.getByTestId('edit-btn').click();
    
    // Skills should have toggle checkboxes
    const arcanaSkill = page.getByTestId('skill-arcana');
    const checkbox = arcanaSkill.locator('button').first();
    await expect(checkbox).toBeVisible();
  });

  test('should show editable HP fields in edit mode', async ({ page }) => {
    await page.getByTestId('edit-btn').click();
    
    // HP display should have input fields
    const hpDisplay = page.getByTestId('hp-display');
    const inputs = hpDisplay.locator('input[type="number"]');
    await expect(inputs.first()).toBeVisible();
  });
});

test.describe('Character Sheet Full - Back Navigation', () => {
  test('should navigate back to player dashboard', async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await page.getByTestId('login-email').fill(TEST_USER.email);
    await page.getByTestId('login-password').fill(TEST_USER.password);
    await page.getByTestId('login-btn').click();
    await page.waitForURL(/\/(home|campaigns)/, { timeout: 15000 });
    await page.goto(`/characters/${TEST_CHARACTER_ID}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('character-sheet-full')).toBeVisible({ timeout: 10000 });
    
    // Click back button
    await page.getByTestId('back-btn').click();
    
    // Should navigate to player dashboard
    await page.waitForURL(/\/player/, { timeout: 10000 });
  });
});
