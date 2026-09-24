import { test, expect, Page } from '@playwright/test';

test.beforeEach(() => {
  test.skip(!process.env.RQK_E2E_EMAIL || !process.env.RQK_E2E_PASSWORD, 'Requires RQK_E2E_EMAIL and RQK_E2E_PASSWORD');
});

/**
 * Level Up Modal and Spells Tab Tests
 * Tests for character leveling system with ASI/Feat selection 
 * and spells prepared/known tab functionality
 */

// Test user credentials
const TEST_USER = {
  email: (process.env.RQK_E2E_EMAIL || ''),
  password: (process.env.RQK_E2E_PASSWORD || '')
};

// Existing test character from leveltest user (Level 4 Fighter)
const TEST_CHARACTER_ID = 'b60137c0-6e05-44f2-9821-6715d46fd1e7';
// Level 3 fighter for ASI level up testing
const TEST_CHARACTER_LVL3 = '33822918-0ca1-4b33-a527-2970868cff43';

// Helper to login
async function loginUser(page: Page) {
  await page.goto('/auth', { waitUntil: 'domcontentloaded' });
  await page.getByTestId('login-email').fill(TEST_USER.email);
  await page.getByTestId('login-password').fill(TEST_USER.password);
  await page.getByTestId('login-btn').click();
  await page.waitForURL(/\/home/, { timeout: 15000 });
}

test.describe('Level Up Modal UI Tests', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
  });

  test('should display Level Up button on character sheet', async ({ page }) => {
    await page.goto(`/characters/${TEST_CHARACTER_ID}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('character-sheet-full')).toBeVisible({ timeout: 10000 });
    
    // Level Up button should be visible for characters below level 20
    const levelUpBtn = page.getByTestId('level-up-btn');
    await expect(levelUpBtn).toBeVisible();
    await expect(levelUpBtn).toContainText('Level Up');
  });

  test('should open Level Up modal when clicking Level Up button', async ({ page }) => {
    await page.goto(`/characters/${TEST_CHARACTER_ID}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('character-sheet-full')).toBeVisible({ timeout: 10000 });
    
    // Click Level Up button
    await page.getByTestId('level-up-btn').click();
    
    // Modal should appear
    const modal = page.getByTestId('level-up-modal');
    await expect(modal).toBeVisible({ timeout: 5000 });
    
    // Modal should show character name and level progression
    await expect(modal.locator('text=Level Up!')).toBeVisible();
  });

  test('should display HP rolling options in modal', async ({ page }) => {
    await page.goto(`/characters/${TEST_CHARACTER_ID}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('character-sheet-full')).toBeVisible({ timeout: 10000 });
    
    await page.getByTestId('level-up-btn').click();
    await expect(page.getByTestId('level-up-modal')).toBeVisible();
    
    // HP rolling options should be visible
    const rollHpBtn = page.getByTestId('roll-hp-btn');
    const avgHpBtn = page.getByTestId('average-hp-btn');
    
    await expect(rollHpBtn).toBeVisible();
    await expect(avgHpBtn).toBeVisible();
    
    // Fighter has d10, so button should mention d10
    await expect(rollHpBtn).toContainText('d10');
  });

  test('should roll HP when clicking Roll button', async ({ page }) => {
    await page.goto(`/characters/${TEST_CHARACTER_ID}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('character-sheet-full')).toBeVisible({ timeout: 10000 });
    
    await page.getByTestId('level-up-btn').click();
    await expect(page.getByTestId('level-up-modal')).toBeVisible();
    
    // Click roll HP button
    await page.getByTestId('roll-hp-btn').click();
    
    // Wait for roll animation to complete and result to show
    // Result should display (Rolled: X)
    await expect(page.locator('text=Rolled:')).toBeVisible({ timeout: 3000 });
  });

  test('should show ASI/Feat choice at step 2 for ASI level', async ({ page }) => {
    // Use level 3 character (level up to 4 is ASI level)
    await page.goto(`/characters/${TEST_CHARACTER_LVL3}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('character-sheet-full')).toBeVisible({ timeout: 10000 });
    
    await page.getByTestId('level-up-btn').click();
    await expect(page.getByTestId('level-up-modal')).toBeVisible();
    
    // Level 4 is ASI level - should show ASI notice
    await expect(page.locator('text=Ability Score Improvement!')).toBeVisible();
    
    // Click next to proceed to ASI/Feat selection
    await page.getByTestId('next-step-btn').click();
    
    // Should see ASI and Feat toggle buttons
    await expect(page.getByTestId('choose-asi-btn')).toBeVisible();
    await expect(page.getByTestId('choose-feat-btn')).toBeVisible();
  });

  test('should allow selecting +1 to two different abilities', async ({ page }) => {
    await page.goto(`/characters/${TEST_CHARACTER_LVL3}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('character-sheet-full')).toBeVisible({ timeout: 10000 });
    
    await page.getByTestId('level-up-btn').click();
    await expect(page.getByTestId('level-up-modal')).toBeVisible();
    
    // Go to ASI selection step
    await page.getByTestId('next-step-btn').click();
    
    // Click ASI tab
    await page.getByTestId('choose-asi-btn').click();
    
    // Select Strength (+1)
    await page.getByTestId('asi-strength').click();
    
    // Select Dexterity (+1)
    await page.getByTestId('asi-dexterity').click();
    
    // Verify selections are displayed
    await expect(page.locator('text=+1 Strength')).toBeVisible();
    await expect(page.locator('text=+1 Dexterity')).toBeVisible();
    
    // Confirm choice button should be enabled
    const confirmBtn = page.getByTestId('confirm-choice-btn');
    await expect(confirmBtn).toBeEnabled();
  });

  test('should allow selecting +2 to one ability', async ({ page }) => {
    await page.goto(`/characters/${TEST_CHARACTER_LVL3}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('character-sheet-full')).toBeVisible({ timeout: 10000 });
    
    await page.getByTestId('level-up-btn').click();
    await expect(page.getByTestId('level-up-modal')).toBeVisible();
    
    // Go to ASI selection step
    await page.getByTestId('next-step-btn').click();
    await page.getByTestId('choose-asi-btn').click();
    
    // Select Strength twice (+2)
    await page.getByTestId('asi-strength').click();
    await page.getByTestId('asi-strength').click();
    
    // Should show +2 indicator on the button
    await expect(page.getByTestId('asi-strength').locator('text=+2')).toBeVisible();
  });

  test('should allow selecting a Feat instead of ASI', async ({ page }) => {
    await page.goto(`/characters/${TEST_CHARACTER_LVL3}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('character-sheet-full')).toBeVisible({ timeout: 10000 });
    
    await page.getByTestId('level-up-btn').click();
    await expect(page.getByTestId('level-up-modal')).toBeVisible();
    
    // Go to Feat selection step
    await page.getByTestId('next-step-btn').click();
    await page.getByTestId('choose-feat-btn').click();
    
    // Feat list should be visible - Alert is a common feat
    const alertFeat = page.getByTestId('feat-alert');
    await expect(alertFeat).toBeVisible();
    
    // Click Alert feat
    await alertFeat.click();
    
    // Confirm button should be enabled after feat selection
    await expect(page.getByTestId('confirm-choice-btn')).toBeEnabled();
  });

  test('should show confirmation summary before leveling up', async ({ page }) => {
    await page.goto(`/characters/${TEST_CHARACTER_LVL3}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('character-sheet-full')).toBeVisible({ timeout: 10000 });
    
    await page.getByTestId('level-up-btn').click();
    await expect(page.getByTestId('level-up-modal')).toBeVisible();
    
    // Use average HP
    await page.getByTestId('average-hp-btn').click();
    
    // Go to ASI, select abilities
    await page.getByTestId('next-step-btn').click();
    await page.getByTestId('choose-asi-btn').click();
    await page.getByTestId('asi-strength').click();
    await page.getByTestId('asi-dexterity').click();
    
    // Go to confirmation
    await page.getByTestId('confirm-choice-btn').click();
    
    // Verify confirmation screen shows summary - use modal-scoped locators
    const modal = page.getByTestId('level-up-modal');
    await expect(page.getByRole('heading', { name: 'Confirm Level Up' })).toBeVisible();
    await expect(modal.locator('text=Hit Points')).toBeVisible();
    await expect(modal.getByText('Ability Scores')).toBeVisible();
  });
});

test.describe('Level Up for Non-ASI Levels', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
  });

  test('should skip ASI step for non-ASI level (level 4 to 5)', async ({ page }) => {
    // Level 4 character leveling to 5 (non-ASI level)
    await page.goto(`/characters/${TEST_CHARACTER_ID}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('character-sheet-full')).toBeVisible({ timeout: 10000 });
    
    await page.getByTestId('level-up-btn').click();
    await expect(page.getByTestId('level-up-modal')).toBeVisible();
    
    // Level 5 is not an ASI level - should NOT show ASI notice
    await expect(page.locator('text=Ability Score Improvement!')).toBeHidden();
    
    // Next button should go directly to confirmation
    const nextBtn = page.getByTestId('next-step-btn');
    await expect(nextBtn).toContainText('Confirm Level Up');
  });
});

test.describe('Spells Prepared/Known Tab Tests', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
  });

  test('should display spells tab on character sheet', async ({ page }) => {
    await page.goto(`/characters/${TEST_CHARACTER_ID}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('character-sheet-full')).toBeVisible({ timeout: 10000 });
    
    // Find Spells tab button
    const spellsTab = page.getByRole('button', { name: /Spells/i });
    await expect(spellsTab).toBeVisible();
  });

  test('should switch to Spells tab and show prepared/known sub-tabs', async ({ page }) => {
    await page.goto(`/characters/${TEST_CHARACTER_ID}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('character-sheet-full')).toBeVisible({ timeout: 10000 });
    
    // Click Spells tab
    await page.getByRole('button', { name: /Spells/i }).click();
    
    // Should see the prepared/known sub-tabs
    await expect(page.getByTestId('spells-tab-prepared')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('spells-tab-known')).toBeVisible();
  });

  test('should switch between Prepared and Known spell tabs', async ({ page }) => {
    await page.goto(`/characters/${TEST_CHARACTER_ID}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('character-sheet-full')).toBeVisible({ timeout: 10000 });
    
    // Click Spells tab
    await page.getByRole('button', { name: /Spells/i }).click();
    await expect(page.getByTestId('spells-tab-prepared')).toBeVisible({ timeout: 5000 });
    
    // Prepared tab should be default - has active styling
    const preparedTab = page.getByTestId('spells-tab-prepared');
    await expect(preparedTab).toContainText('PREPARED SPELLS');
    
    // Click Known tab
    await page.getByTestId('spells-tab-known').click();
    
    // Known tab content should be visible
    await expect(page.getByTestId('spells-tab-known')).toContainText('ALL KNOWN SPELLS');
  });

  test('should display spell search and level filter', async ({ page }) => {
    await page.goto(`/characters/${TEST_CHARACTER_ID}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('character-sheet-full')).toBeVisible({ timeout: 10000 });
    
    // Navigate to Spells tab
    await page.getByRole('button', { name: /Spells/i }).click();
    await expect(page.getByTestId('spells-tab-prepared')).toBeVisible({ timeout: 5000 });
    
    // Spell search should be visible
    const searchInput = page.getByTestId('spell-search');
    await expect(searchInput).toBeVisible();
    
    // Level filter dropdown should be visible
    const levelFilter = page.getByTestId('spell-level-filter');
    await expect(levelFilter).toBeVisible();
  });

  test('should show empty state for no prepared spells', async ({ page }) => {
    await page.goto(`/characters/${TEST_CHARACTER_ID}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('character-sheet-full')).toBeVisible({ timeout: 10000 });
    
    // Navigate to Spells tab
    await page.getByRole('button', { name: /Spells/i }).click();
    await expect(page.getByTestId('spells-tab-prepared')).toBeVisible({ timeout: 5000 });
    
    // Fighter doesn't have spells - should show empty state
    await expect(page.locator('text=No Spells Prepared')).toBeVisible({ timeout: 5000 });
  });

  test('should filter spells by level in Known tab', async ({ page }) => {
    await page.goto(`/characters/${TEST_CHARACTER_ID}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('character-sheet-full')).toBeVisible({ timeout: 10000 });
    
    // Navigate to Spells tab
    await page.getByRole('button', { name: /Spells/i }).click();
    await expect(page.getByTestId('spells-tab-prepared')).toBeVisible({ timeout: 5000 });
    
    // Go to Known spells
    await page.getByTestId('spells-tab-known').click();
    
    // Filter by Cantrips (level 0)
    const levelFilter = page.getByTestId('spell-level-filter');
    await levelFilter.selectOption('0');
    
    // Verify filter is applied
    await expect(levelFilter).toHaveValue('0');
  });
});

test.describe('Modal Close Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
  });

  test('should close modal when clicking X button', async ({ page }) => {
    await page.goto(`/characters/${TEST_CHARACTER_ID}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('character-sheet-full')).toBeVisible({ timeout: 10000 });
    
    await page.getByTestId('level-up-btn').click();
    await expect(page.getByTestId('level-up-modal')).toBeVisible();
    
    // Click the X close button in the modal header
    await page.getByTestId('level-up-modal').locator('button').first().click();
    
    // Modal should close
    await expect(page.getByTestId('level-up-modal')).toBeHidden({ timeout: 3000 });
  });
});
