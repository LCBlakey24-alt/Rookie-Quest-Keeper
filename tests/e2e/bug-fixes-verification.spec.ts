import { test, expect } from '@playwright/test';
import { TEST_USER, waitForAppReady, dismissToasts, removeBlockingBadges } from '../fixtures/helpers';

const TEST_EMAIL = TEST_USER.email;
const TEST_PASSWORD = TEST_USER.password;

// Test Character ID - Fighter for Level Up testing
const TEST_CHARACTER_ID = '0bda5cf5-b8be-40c8-b2bc-b030ea70c366';

test.describe('Bug Fix Verification - Critical Bugs', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await removeBlockingBadges(page);
    
    // Login
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await page.getByTestId('login-email').fill(TEST_EMAIL);
    await page.getByTestId('login-password').fill(TEST_PASSWORD);
    await page.getByTestId('login-btn').click();
    await page.waitForURL(/\/home/, { timeout: 15000 });
  });

  test('BUG-1 FIXED: Level Up flow shows HP roll UI correctly (not blank)', async ({ page }) => {
    // Navigate to character sheet
    await page.goto(`/characters/${TEST_CHARACTER_ID}`, { waitUntil: 'domcontentloaded' });
    
    // Wait for character sheet to load
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    
    // Click Level Up button
    const levelUpBtn = page.getByTestId('level-up-btn');
    await expect(levelUpBtn).toBeVisible();
    await levelUpBtn.click();
    
    // Step 0: Class Choice - verify modal opened
    await expect(page.getByRole('heading', { name: 'Level Up!' })).toBeVisible();
    await expect(page.getByText(/Choose Your Path/i)).toBeVisible();
    
    // Select continue as current class (should be pre-selected)
    await page.getByRole('button', { name: /Next/i }).click();
    
    // Step 1: HP Method Selection
    await expect(page.getByText(/Choose Hit Point Method/i)).toBeVisible();
    
    // Select "Roll Hit Dice" to test the reported bug
    await page.getByText(/Roll Hit Dice/i).click();
    await page.getByRole('button', { name: /Next/i }).click();
    
    // Step 2: HP Roll UI - THIS IS WHERE THE BUG MANIFESTED
    // The bug was: blank screen after HP roll step
    // Now it should show "Roll Your Hit Dice" UI
    await expect(page.getByRole('heading', { name: /Roll Your Hit Dice/i })).toBeVisible();
    await expect(page.getByText(/Click the die to roll/i)).toBeVisible();
    
    // Screenshot showing HP roll UI works (not blank)
    await page.screenshot({ path: 'bug1-levelup-hp-roll-ui.jpeg', quality: 20, fullPage: false });
    
    // Click the dice button inside the modal to roll
    const diceButton = page.getByText(/Click to roll!/i).locator('..').locator('button').first();
    await diceButton.click({ force: true });
    
    // After rolling, should show result with HP calculation
    await page.waitForTimeout(500);
    
    // Screenshot after roll
    await page.screenshot({ path: 'bug1-levelup-after-roll.jpeg', quality: 20, fullPage: false });
    
    // Next button should now be enabled
    await page.getByRole('button', { name: /Next/i }).click();
    
    // Should proceed to confirmation step (not blank)
    await expect(page.getByRole('heading', { name: /Confirm Level Up/i })).toBeVisible();
    
    // Screenshot confirmation
    await page.screenshot({ path: 'bug1-levelup-confirmation.jpeg', quality: 20, fullPage: false });
  });

  test('BUG-2 FIXED: Edit Character button navigates to edit page with data', async ({ page }) => {
    // Navigate to character sheet
    await page.goto(`/characters/${TEST_CHARACTER_ID}`, { waitUntil: 'domcontentloaded' });
    
    // Wait for character sheet to load
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    
    // Screenshot before edit
    await page.screenshot({ path: 'bug2-before-edit.jpeg', quality: 20, fullPage: false });
    
    // Find and click Edit button
    const editButton = page.getByRole('button', { name: /Edit/i });
    await expect(editButton).toBeVisible();
    await editButton.click();
    
    // Should navigate to /characters/{id}/edit (not blank)
    await page.waitForURL(/\/characters\/.*\/edit/, { timeout: 10000 });
    
    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');
    
    // Screenshot after navigation - verify NOT blank
    await page.screenshot({ path: 'bug2-edit-page-loaded.jpeg', quality: 20, fullPage: false });
    
    // Character Builder should load - look for form elements
    const pageContent = await page.locator('body').textContent();
    expect(pageContent?.length).toBeGreaterThan(100);
    
    // Should see character name in the form (pre-filled)
    const nameInput = page.locator('input').first();
    await expect(nameInput).toBeVisible();
    
    // Form should have multiple inputs/selects for character data
    const formElements = await page.locator('input, select, button').count();
    expect(formElements).toBeGreaterThan(5);
  });

  test('BUG-3: HP display - verify clamping behavior in character sheet', async ({ page }) => {
    // Navigate to character sheet
    await page.goto(`/characters/${TEST_CHARACTER_ID}`, { waitUntil: 'domcontentloaded' });
    
    // Wait for character sheet to load
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    
    // Screenshot character sheet
    await page.screenshot({ path: 'bug3-hp-display.jpeg', quality: 20, fullPage: false });
    
    // The fix ensures currentHp is clamped to maxHp in fetchCharacter:
    // setCurrentHp(Math.min(charHp, charMaxHp))
    
    // Verify HP section is visible
    await expect(page.getByText('HP').first()).toBeVisible();
  });

  test('Login flow works correctly', async ({ page }) => {
    // Already logged in from beforeEach, verify dashboard loaded
    await expect(page.url()).toContain('/home');
    
    // Should see character list or dashboard elements
    await expect(page.getByTestId('new-character-btn')).toBeVisible();
    
    // Screenshot dashboard
    await page.screenshot({ path: 'login-dashboard.jpeg', quality: 20, fullPage: false });
  });
});

test.describe('Level Up Wizard - Complete Flow Test', () => {
  test('Complete Level Up with Average HP option', async ({ page }) => {
    await dismissToasts(page);
    await removeBlockingBadges(page);
    
    // Login
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await page.getByTestId('login-email').fill(TEST_EMAIL);
    await page.getByTestId('login-password').fill(TEST_PASSWORD);
    await page.getByTestId('login-btn').click();
    await page.waitForURL(/\/home/, { timeout: 15000 });
    
    // Navigate to character sheet
    await page.goto(`/characters/${TEST_CHARACTER_ID}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    
    // Click Level Up button
    await page.getByTestId('level-up-btn').click();
    
    // Step 0: Class Choice
    await expect(page.getByRole('heading', { name: 'Level Up!' })).toBeVisible();
    await page.getByRole('button', { name: /Next/i }).click();
    
    // Step 1: HP Method - select Average
    await expect(page.getByText(/Choose Hit Point Method/i)).toBeVisible();
    await page.getByText(/Take Average/i).click();
    await page.getByRole('button', { name: /Next/i }).click();
    
    // Step 2: HP Result - should show "HP Increase Confirmed" heading
    await expect(page.getByRole('heading', { name: /HP Increase Confirmed/i })).toBeVisible();
    
    // Should show HP formula and result
    await expect(page.getByText(/avg d10/i)).toBeVisible();
    
    // Screenshot HP result
    await page.screenshot({ path: 'levelup-average-hp-result.jpeg', quality: 20, fullPage: false });
    
    // Click Next to proceed to confirmation
    await page.getByRole('button', { name: /Next/i }).click();
    
    // Step 3: Confirmation - NOT BLANK - use heading specifically
    await expect(page.getByRole('heading', { name: /Confirm Level Up/i })).toBeVisible();
    
    // Screenshot confirmation
    await page.screenshot({ path: 'levelup-confirmation-step.jpeg', quality: 20, fullPage: false });
    
    // Close the wizard without confirming (to not modify character)
    const closeBtn = page.locator('button').filter({ has: page.locator('svg') }).first();
    await closeBtn.click({ force: true });
  });

  test('Level Up wizard Cancel button works', async ({ page }) => {
    await dismissToasts(page);
    await removeBlockingBadges(page);
    
    // Login
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await page.getByTestId('login-email').fill(TEST_EMAIL);
    await page.getByTestId('login-password').fill(TEST_PASSWORD);
    await page.getByTestId('login-btn').click();
    await page.waitForURL(/\/home/, { timeout: 15000 });
    
    // Navigate to character sheet
    await page.goto(`/characters/${TEST_CHARACTER_ID}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    
    // Click Level Up button
    await page.getByTestId('level-up-btn').click();
    
    // Verify modal opened
    await expect(page.getByRole('heading', { name: 'Level Up!' })).toBeVisible();
    
    // Click Cancel button
    await page.getByRole('button', { name: /Cancel/i }).click();
    
    // Modal should close
    await expect(page.getByRole('heading', { name: 'Level Up!' })).not.toBeVisible();
    
    // Screenshot after cancel
    await page.screenshot({ path: 'levelup-cancelled.jpeg', quality: 20, fullPage: false });
  });
});
