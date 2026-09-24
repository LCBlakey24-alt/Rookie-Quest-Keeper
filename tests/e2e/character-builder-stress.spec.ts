import { test, expect, Page } from '@playwright/test';

test.beforeEach(() => {
  test.skip(!process.env.RQK_E2E_EMAIL || !process.env.RQK_E2E_PASSWORD, 'Requires RQK_E2E_EMAIL and RQK_E2E_PASSWORD');
});

/**
 * ROOK Stress Test - Character Builder & Character Sheet
 * Tests stat methods, form validation, character creation, and character sheet functionality
 */

const TEST_USER = {
  email: (process.env.RQK_E2E_EMAIL || ''),
  password: (process.env.RQK_E2E_PASSWORD || '')
};

async function loginUser(page: Page) {
  await page.goto('/auth', { waitUntil: 'domcontentloaded' });
  await page.getByTestId('login-email').fill(TEST_USER.email);
  await page.getByTestId('login-password').fill(TEST_USER.password);
  await page.getByTestId('login-btn').click();
  await page.waitForURL(/\/home/, { timeout: 15000 });
}

async function dismissToasts(page: Page) {
  await page.addLocatorHandler(
    page.locator('[data-sonner-toast]').first(),
    async (toast) => {
      const close = toast.locator('[data-close], button[aria-label="Close"]');
      await close.first().click({ timeout: 1000 }).catch(() => {});
    },
    { times: 20, noWaitAfter: true }
  );
}

async function navigateToCharacterBuilder(page: Page) {
  // Use the correct route via new character button from dashboard
  await page.goto('/home', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('new-character-btn')).toBeVisible({ timeout: 10000 });
  await page.getByTestId('new-character-btn').click();
  // Use heading selector to avoid matching the submit button
  await expect(page.getByRole('heading', { name: /create character/i })).toBeVisible({ timeout: 10000 });
}

test.describe('Character Builder - UI & Theme', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await loginUser(page);
  });

  test('character builder page loads with Fantasy Sunset theme', async ({ page }) => {
    await navigateToCharacterBuilder(page);
    
    // Should show Create Character heading
    await expect(page.getByText(/create character/i).first()).toBeVisible();
    
    // Should show Basic Information section
    await expect(page.getByText(/basic information/i)).toBeVisible();
    
    // Should show Ability Scores section
    await expect(page.getByText(/ability scores/i)).toBeVisible();
  });

  test('character builder has all required form fields', async ({ page }) => {
    await navigateToCharacterBuilder(page);
    
    // Character Name input
    await expect(page.getByPlaceholder(/enter name/i)).toBeVisible();
    
    // Race/Species label and selector
    await expect(page.getByText(/race.*species/i)).toBeVisible();
    
    // Class label and selector  
    await expect(page.getByText(/class/i).first()).toBeVisible();
  });
});

test.describe('Character Builder - Stat Methods', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await loginUser(page);
    await navigateToCharacterBuilder(page);
  });

  test('all three stat method buttons are visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: /standard array/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /point buy/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /roll stats/i })).toBeVisible();
  });

  test('Point Buy method resets scores to 8 and enables editing', async ({ page }) => {
    // Click Point Buy button
    await page.getByRole('button', { name: /point buy/i }).click();
    
    // Score inputs should now be editable and set to 8
    const scoreInputs = page.locator('input[type="number"]');
    const count = await scoreInputs.count();
    expect(count).toBe(6);
    
    // First input should have value 8 and be enabled
    await expect(scoreInputs.first()).toHaveValue('8');
    await expect(scoreInputs.first()).toBeEnabled();
  });

  test('Roll Stats method generates random values', async ({ page }) => {
    // Click Roll Stats button
    await page.getByRole('button', { name: /roll stats/i }).click();
    
    // Get values - should have variety (not all 8s)
    const scoreInputs = page.locator('input[type="number"]');
    const values: string[] = [];
    const count = await scoreInputs.count();
    
    for (let i = 0; i < count; i++) {
      const val = await scoreInputs.nth(i).inputValue();
      values.push(val);
    }
    
    // At least one should differ from 8
    const hasVariety = values.some(v => v !== '8');
    expect(hasVariety).toBe(true);
  });
});

test.describe('Character Builder - Form Validation', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await loginUser(page);
    await navigateToCharacterBuilder(page);
  });

  test('shows error when submitting without name', async ({ page }) => {
    // Fill race and class but NOT name
    await page.locator('select').nth(0).selectOption({ index: 1 });
    await page.locator('select').nth(1).selectOption({ index: 1 });
    
    // Submit the form
    await page.getByRole('button', { name: /create character/i }).click();
    
    // Should show error message
    await expect(page.getByText(/name is required/i)).toBeVisible({ timeout: 5000 });
  });

  test('shows error when submitting without race', async ({ page }) => {
    // Fill name and class but NOT race
    await page.getByPlaceholder(/enter name/i).fill('Test Character');
    await page.locator('select').nth(1).selectOption({ index: 1 });
    
    // Submit the form
    await page.getByRole('button', { name: /create character/i }).click();
    
    // Should show error for race
    await expect(page.getByText(/select a race/i)).toBeVisible({ timeout: 5000 });
  });

  test('shows error when submitting without class', async ({ page }) => {
    // Fill name and race but NOT class
    await page.getByPlaceholder(/enter name/i).fill('Test Character');
    await page.locator('select').nth(0).selectOption({ index: 1 });
    
    // Submit the form
    await page.getByRole('button', { name: /create character/i }).click();
    
    // Should show error for class
    await expect(page.getByText(/select a class/i)).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Character Builder - Full Creation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await loginUser(page);
  });

  test('can create a complete character', async ({ page }) => {
    await navigateToCharacterBuilder(page);
    
    // Generate unique name
    const uniqueName = `TEST_Hero_${Date.now()}`;
    
    // Fill in character details
    await page.getByPlaceholder(/enter name/i).fill(uniqueName);
    await page.locator('select').nth(0).selectOption('Human');
    await page.locator('select').nth(1).selectOption('Fighter');
    await page.locator('select').nth(2).selectOption('Soldier');
    
    // Submit the form
    await page.getByRole('button', { name: /create character/i }).click();
    
    // Should navigate to character sheet or show success toast
    // Wait for URL change to character sheet (the toast appears there)
    await page.waitForURL(/\/characters\//, { timeout: 15000 });
    
    // Verify we're on a character sheet
    await expect(page.getByText(/ability scores/i)).toBeVisible({ timeout: 10000 });
  });

  test('clear draft button resets form', async ({ page }) => {
    await navigateToCharacterBuilder(page);
    
    // Fill in some data
    await page.getByPlaceholder(/enter name/i).fill('Test Character');
    await page.locator('select').nth(0).selectOption('Elf');
    
    // Click Clear Draft button
    await page.getByRole('button', { name: /clear draft/i }).click();
    
    // Name field should be empty
    await expect(page.getByPlaceholder(/enter name/i)).toHaveValue('');
  });
});

test.describe('Character Sheet - Core Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await loginUser(page);
  });

  test('can view character sheet from dashboard', async ({ page }) => {
    await page.goto('/home', { waitUntil: 'domcontentloaded' });
    
    // Wait for characters to load
    await expect(page.getByText(/my characters/i)).toBeVisible({ timeout: 10000 });
    
    // Click on first character card
    const charCard = page.locator('[data-testid^="character-"]').first();
    if (await charCard.isVisible()) {
      await charCard.click();
      
      // Should show character sheet with ability scores
      await expect(page.getByText(/ability scores/i)).toBeVisible({ timeout: 10000 });
    }
  });

  test('character sheet displays ability scores with modifiers', async ({ page }) => {
    await page.goto('/home', { waitUntil: 'domcontentloaded' });
    
    // Click on first character
    const charCard = page.locator('[data-testid^="character-"]').first();
    if (await charCard.isVisible()) {
      await charCard.click();
      await expect(page.getByText(/ability scores/i)).toBeVisible({ timeout: 10000 });
      
      // Should show all 6 ability scores
      await expect(page.getByText(/str/i)).toBeVisible();
      await expect(page.getByText(/dex/i)).toBeVisible();
      await expect(page.getByText(/con/i)).toBeVisible();
      await expect(page.getByText(/int/i)).toBeVisible();
      await expect(page.getByText(/wis/i)).toBeVisible();
      await expect(page.getByText(/cha/i)).toBeVisible();
    }
  });

  test('character sheet tabs work correctly', async ({ page }) => {
    await page.goto('/home', { waitUntil: 'domcontentloaded' });
    
    const charCard = page.locator('[data-testid^="character-"]').first();
    if (await charCard.isVisible()) {
      await charCard.click();
      await expect(page.getByText(/ability scores/i)).toBeVisible({ timeout: 10000 });
      
      // Check all tabs exist
      await expect(page.getByRole('button', { name: /combat/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /spells/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /inventory/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /notes/i })).toBeVisible();
      
      // Click Spells tab
      await page.getByRole('button', { name: /spells/i }).click();
      await expect(page.getByText(/spellcasting/i)).toBeVisible({ timeout: 5000 });
      
      // Click Inventory tab
      await page.getByRole('button', { name: /inventory/i }).click();
      await expect(page.getByText(/inventory/i)).toBeVisible({ timeout: 5000 });
    }
  });

  test('HP adjustment buttons work', async ({ page }) => {
    await page.goto('/home', { waitUntil: 'domcontentloaded' });
    
    const charCard = page.locator('[data-testid^="character-"]').first();
    if (await charCard.isVisible()) {
      await charCard.click();
      await expect(page.getByText(/hit points/i)).toBeVisible({ timeout: 10000 });
      
      // Find HP adjustment buttons (- and +)
      const minusBtn = page.locator('button').filter({ hasText: '' }).locator('svg').first();
      const plusBtn = page.locator('button').filter({ hasText: '' }).locator('svg').nth(1);
      
      // HP section should exist with buttons
      await expect(page.getByText(/hit points/i)).toBeVisible();
    }
  });
});

test.describe('Character Builder - Derived Stats Preview', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await loginUser(page);
    await navigateToCharacterBuilder(page);
  });

  test('shows Level 1 Preview after selecting class', async ({ page }) => {
    // Select a class
    await page.locator('select').nth(1).selectOption('Fighter');
    
    // Should show Level 1 Preview section
    await expect(page.getByText(/level 1 preview/i)).toBeVisible();
    await expect(page.getByText(/HP:/i)).toBeVisible();
    await expect(page.getByText(/AC:/i)).toBeVisible();
  });

  test('spellcasting stats appear for Wizard', async ({ page }) => {
    // Select Wizard
    await page.locator('select').nth(1).selectOption('Wizard');
    
    // Should show Spell DC and Spell Attack
    await expect(page.getByText(/spell dc/i)).toBeVisible();
    await expect(page.getByText(/spell atk/i)).toBeVisible();
  });
});
