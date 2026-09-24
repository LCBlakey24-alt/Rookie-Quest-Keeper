import { test, expect, Page } from '@playwright/test';

test.beforeEach(() => {
  test.skip(!process.env.RQK_E2E_EMAIL || !process.env.RQK_E2E_PASSWORD, 'Requires RQK_E2E_EMAIL and RQK_E2E_PASSWORD');
});

/**
 * Tests for LevelUpModal with multiclass support
 * Features:
 * - Mode selection (Level Up vs Multiclass)
 * - Regular level-up flow with HP roll/average
 * - Multiclass flow with class selection
 * - ASI/Feat selection at ASI levels
 */

// Test credentials
const TEST_USER = {
  email: (process.env.RQK_E2E_EMAIL || ''),
  password: (process.env.RQK_E2E_PASSWORD || '')
};

// Character used for testing (TEST_ELARA_WIZARD)
const CHARACTER_NAME = 'TEST_ELARA_WIZARD';

async function loginUser(page: Page) {
  await page.goto('/auth', { waitUntil: 'domcontentloaded' });
  await page.getByTestId('login-email').fill(TEST_USER.email);
  await page.getByTestId('login-password').fill(TEST_USER.password);
  await page.getByTestId('login-btn').click();
  await page.waitForURL(/\/home/, { timeout: 15000 });
}

async function navigateToCharacterSheet(page: Page) {
  // Click on the test character
  await expect(page.locator(`text=${CHARACTER_NAME}`)).toBeVisible({ timeout: 10000 });
  await page.locator(`text=${CHARACTER_NAME}`).click();
  
  // Dismiss the dice tip modal if present
  const gotItBtn = page.getByRole('button', { name: 'GOT IT!' });
  if (await gotItBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await gotItBtn.click();
  }
  
  // Wait for character sheet to load
  await expect(page.getByRole('button', { name: /LEVEL UP/i })).toBeVisible({ timeout: 10000 });
}

async function openLevelUpModal(page: Page) {
  await page.getByRole('button', { name: /LEVEL UP/i }).click();
  await expect(page.getByTestId('level-up-modal')).toBeVisible({ timeout: 5000 });
}

test.describe('LevelUpModal - Mode Selection', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    await navigateToCharacterSheet(page);
    await openLevelUpModal(page);
  });

  test('displays mode selection with Level Up and Multiclass options', async ({ page }) => {
    // Should show "Choose Your Path" heading
    await expect(page.getByRole('heading', { name: 'Choose Your Path' })).toBeVisible();
    
    // Should show Level Up current class button
    const levelUpBtn = page.getByTestId('choose-levelup-btn');
    await expect(levelUpBtn).toBeVisible();
    await expect(levelUpBtn).toContainText('Level Up');
    
    // Should show Multiclass button
    const multiclassBtn = page.getByTestId('choose-multiclass-btn');
    await expect(multiclassBtn).toBeVisible();
    await expect(multiclassBtn).toContainText('Multiclass');
  });

  test('Level Up button shows current class name', async ({ page }) => {
    const levelUpBtn = page.getByTestId('choose-levelup-btn');
    // Should show the character's current class (Wizard)
    await expect(levelUpBtn).toContainText('Wizard');
  });

  test('close button dismisses modal', async ({ page }) => {
    await page.getByTestId('close-modal-btn').click();
    await expect(page.getByTestId('level-up-modal')).not.toBeVisible();
  });
});

test.describe('LevelUpModal - Regular Level Up Flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    await navigateToCharacterSheet(page);
    await openLevelUpModal(page);
    // Choose regular level up
    await page.getByTestId('choose-levelup-btn').click();
  });

  test('shows HP roll options with d6 for Wizard', async ({ page }) => {
    // Should show Level Benefits heading
    await expect(page.getByRole('heading', { name: /Level \d+ Benefits/i })).toBeVisible();
    
    // Should show Hit Points section
    await expect(page.locator('h4:has-text("Hit Points")')).toBeVisible();
    
    // Should show Roll D6 button (Wizard uses d6)
    await expect(page.getByTestId('roll-hp-btn')).toContainText('Roll d6');
    
    // Should show Use Average button
    await expect(page.getByTestId('average-hp-btn')).toBeVisible();
  });

  test('Roll HP button triggers dice roll animation', async ({ page }) => {
    await page.getByTestId('roll-hp-btn').click();
    
    // After rolling, a result should appear showing the roll
    await expect(page.locator('text=Rolled:')).toBeVisible({ timeout: 5000 });
  });

  test('Use Average HP sets average value', async ({ page }) => {
    await page.getByTestId('average-hp-btn').click();
    
    // Should proceed to next step without showing a roll result
    // The button should be visible for confirmation
    await expect(page.getByTestId('next-step-btn')).toBeVisible();
  });

  test('Back button returns to mode selection', async ({ page }) => {
    await page.getByRole('button', { name: 'Back' }).click();
    
    // Should show mode selection again
    await expect(page.getByRole('heading', { name: 'Choose Your Path' })).toBeVisible();
  });
});

test.describe('LevelUpModal - Multiclass Flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    await navigateToCharacterSheet(page);
    await openLevelUpModal(page);
  });

  test('clicking Multiclass shows class selection', async ({ page }) => {
    // Click multiclass button
    await page.getByTestId('choose-multiclass-btn').click();
    
    // Should show "Choose New Class" heading
    await expect(page.getByRole('heading', { name: 'Choose New Class' })).toBeVisible();
  });

  test('displays available classes with requirements', async ({ page }) => {
    await page.getByTestId('choose-multiclass-btn').click();
    
    // Wait for class list to load
    await expect(page.getByRole('heading', { name: 'Choose New Class' })).toBeVisible();
    
    // Should show Cleric as one of the classes
    await expect(page.getByTestId('multiclass-cleric')).toBeVisible();
    
    // Should show requirement text somewhere in the list
    await expect(page.getByTestId('multiclass-cleric')).toContainText('Requires');
  });

  test('classes with unmet requirements are disabled', async ({ page }) => {
    await page.getByTestId('choose-multiclass-btn').click();
    
    // Barbarian requires STR 13+ which the Wizard doesn't have
    const barbarianBtn = page.getByTestId('multiclass-barbarian');
    await expect(barbarianBtn).toBeVisible();
    
    // Check if it's dimmed/disabled (opacity or disabled attribute)
    const opacity = await barbarianBtn.evaluate(el => 
      window.getComputedStyle(el).opacity
    );
    expect(parseFloat(opacity)).toBeLessThan(1);
  });

  test('eligible classes can be selected', async ({ page }) => {
    await page.getByTestId('choose-multiclass-btn').click();
    
    // Cleric requires WIS 13+ - check if character meets requirements
    // The Wizard has WIS 14, so Cleric should be selectable
    const clericBtn = page.getByTestId('multiclass-cleric');
    await expect(clericBtn).toBeVisible();
    
    // Click to select
    await clericBtn.click();
    
    // Continue button should now be enabled
    await expect(page.getByTestId('confirm-multiclass-selection-btn')).toBeEnabled();
  });

  test('selecting a class and continuing shows confirmation', async ({ page }) => {
    await page.getByTestId('choose-multiclass-btn').click();
    
    // Select Cleric
    await page.getByTestId('multiclass-cleric').click();
    
    // Click continue
    await page.getByTestId('confirm-multiclass-selection-btn').click();
    
    // Should show confirmation screen - use more specific selector
    await expect(page.getByRole('heading', { name: 'Confirm Multiclass' })).toBeVisible();
    await expect(page.locator('h4:has-text("Adding Cleric")')).toBeVisible();
  });

  test('multiclass confirmation shows what will be gained', async ({ page }) => {
    await page.getByTestId('choose-multiclass-btn').click();
    await page.getByTestId('multiclass-cleric').click();
    await page.getByTestId('confirm-multiclass-selection-btn').click();
    
    // Should show benefits description
    await expect(page.locator('text=You will gain')).toBeVisible();
    await expect(page.locator('text=Hit points')).toBeVisible();
  });

  test('Back button from confirmation returns to class selection', async ({ page }) => {
    await page.getByTestId('choose-multiclass-btn').click();
    await page.getByTestId('multiclass-cleric').click();
    await page.getByTestId('confirm-multiclass-selection-btn').click();
    
    // Click Back
    await page.getByRole('button', { name: 'Back' }).click();
    
    // Should be back on class selection
    await expect(page.getByRole('heading', { name: 'Choose New Class' })).toBeVisible();
  });
});

test.describe('LevelUpModal - UI Elements', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    await navigateToCharacterSheet(page);
    await openLevelUpModal(page);
  });

  test('modal has correct header with character name and level', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Level Up!' })).toBeVisible();
    // Character name appears in the modal subtitle
    await expect(page.getByTestId('level-up-modal').locator('text=TEST_Elara_Wizard')).toBeVisible();
  });

  test('progress bar appears after selecting mode', async ({ page }) => {
    // Select level up mode
    await page.getByTestId('choose-levelup-btn').click();
    
    // Progress bar should appear (multiple step indicators)
    const progressSteps = page.locator('[style*="height: 4px"]');
    const stepCount = await progressSteps.count();
    expect(stepCount).toBeGreaterThan(0);
  });

  test('modal can be closed', async ({ page }) => {
    // Click the close button
    await page.getByTestId('close-modal-btn').click();
    await expect(page.getByTestId('level-up-modal')).not.toBeVisible();
  });
});
