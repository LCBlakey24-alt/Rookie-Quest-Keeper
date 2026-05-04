import { test, expect } from '@playwright/test';
import { 
  waitForAppReady, 
  removeBlockingBadges, 
  loginTestUser, 
  navigateToGMScreen,
  TEST_CAMPAIGN_ID
} from '../fixtures/helpers';

test.describe('Dice Roller Stress Test', () => {
  test.beforeEach(async ({ page }) => {
    await removeBlockingBadges(page);
    await loginTestUser(page);
    await navigateToGMScreen(page);
    
    // Navigate to Dice tab
    await page.getByTestId('tab-dice').click();
    await expect(page.getByRole('heading', { name: 'Dice Roller' }).first()).toBeVisible();
  });

  test('dice roller displays all dice type buttons', async ({ page }) => {
    // Verify all dice types are present - use exact matching
    await expect(page.getByRole('button', { name: 'D4', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'D6', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'D8', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'D10', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'D12', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'D20', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'D100', exact: true })).toBeVisible();
  });

  test('dice roller shows number of dice quick buttons and input field', async ({ page }) => {
    // Verify quick select buttons for dice count
    await expect(page.getByRole('button', { name: '1', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '2', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '4', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '6', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '8', exact: true })).toBeVisible();
    
    // Verify custom number input field exists
    const diceCountInput = page.locator('input[type="number"][min="1"][max="999"]');
    await expect(diceCountInput).toBeVisible();
  });

  test('can roll a single D20', async ({ page }) => {
    // D20 should be selected by default, verify roll button
    await expect(page.getByRole('button', { name: /Roll 1D20/i })).toBeVisible();
    
    // Click roll button
    await page.getByRole('button', { name: /Roll 1D20/i }).click();
    
    // Wait for result to appear (should show a number 1-20)
    // The result appears in a large text element
    await page.waitForTimeout(1000); // Wait for animation to complete
  });

  test('can change number of dice using input field', async ({ page }) => {
    // Find the custom dice count input
    const diceCountInput = page.locator('input[type="number"][min="1"][max="999"]');
    
    // Clear and enter a custom number
    await diceCountInput.clear();
    await diceCountInput.fill('10');
    
    // Verify the roll button shows the correct count
    await expect(page.getByRole('button', { name: /Roll 10D20/i })).toBeVisible();
  });

  test('dice roller stress test - roll 50 dice (verifies fix for large dice counts)', async ({ page }) => {
    // This test verifies the fix that increased max dice from 100 to 999
    const diceCountInput = page.locator('input[type="number"][min="1"][max="999"]');
    
    // Enter 50 dice
    await diceCountInput.clear();
    await diceCountInput.fill('50');
    
    // Verify roll button shows correct count
    await expect(page.getByRole('button', { name: /Roll 50D20/i })).toBeVisible();
    
    // Click roll button
    await page.getByRole('button', { name: /Roll 50D20/i }).click();
    
    // Wait for result - the roller should handle 50 dice
    await page.waitForTimeout(2000);
    
    // Look for the result display showing "50d20 = XXX"
    await expect(page.getByText(/50d20\s*=\s*\d+/)).toBeVisible();
  });

  test('dice roller stress test - roll 100+ dice (extended stress test)', async ({ page }) => {
    const diceCountInput = page.locator('input[type="number"][min="1"][max="999"]');
    
    // Enter 100 dice
    await diceCountInput.clear();
    await diceCountInput.fill('100');
    
    // Verify roll button shows correct count
    await expect(page.getByRole('button', { name: /Roll 100D20/i })).toBeVisible();
    
    // Click roll button
    await page.getByRole('button', { name: /Roll 100D20/i }).click();
    
    // Wait for result
    await page.waitForTimeout(2000);
    
    // Look for the result display showing "100d20 = XXX"
    await expect(page.getByText(/100d20\s*=\s*\d+/)).toBeVisible();
  });

  test('dice roller handles D6 with modifier', async ({ page }) => {
    // Click D6 button
    await page.getByRole('button', { name: 'D6' }).click();
    
    // Set 4 dice
    await page.getByRole('button', { name: '4', exact: true }).click();
    
    // Find modifier input and set to +2
    const modifierInput = page.locator('input[type="number"]').last();
    await modifierInput.clear();
    await modifierInput.fill('2');
    
    // Verify roll button shows correct formula
    await expect(page.getByRole('button', { name: /Roll 4D6\+2/i })).toBeVisible();
    
    // Roll
    await page.getByRole('button', { name: /Roll 4D6\+2/i }).click();
    await page.waitForTimeout(1000);
  });

  test('dice roller handles D100 percentage dice', async ({ page }) => {
    // Click D100 button
    await page.getByRole('button', { name: 'D100' }).click();
    
    // Verify roll button shows D100
    await expect(page.getByRole('button', { name: /Roll 1D100/i })).toBeVisible();
    
    // Roll
    await page.getByRole('button', { name: /Roll 1D100/i }).click();
    await page.waitForTimeout(1000);
  });

  test('input field respects maximum of 999', async ({ page }) => {
    const diceCountInput = page.locator('input[type="number"][min="1"][max="999"]');
    
    // Try to enter 9999
    await diceCountInput.clear();
    await diceCountInput.fill('9999');
    
    // The component should clamp to 999
    // Check what the roll button says
    await page.waitForTimeout(500);
    
    // The roll button should show 999 (max allowed)
    await expect(page.getByRole('button', { name: /Roll 999D20/i })).toBeVisible();
  });
});
