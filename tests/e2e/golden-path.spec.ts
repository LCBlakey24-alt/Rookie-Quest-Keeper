import { test, expect } from '@playwright/test';
import { 
  hideEmergentBadge, 
  loginTestUser, 
  navigateToGMScreen,
  TEST_CAMPAIGN_ID,
  TEST_SCENARIO_ID
} from '../fixtures/helpers';

/**
 * Golden Path Test: Complete Combat Flow
 * 
 * This test verifies the critical user journey:
 * 1. Login as Game Master
 * 2. Navigate to GM Screen
 * 3. Select encounter and start combat
 * 4. Perform combat actions (HP changes, turn advancement)
 * 5. End combat and return to GM Screen
 * 
 * This test validates the critical bug fix where combat end
 * was navigating to /dm-screen (black screen) instead of /gm-screen.
 */
test.describe('Golden Path: Complete Combat Flow', () => {
  test.beforeEach(async ({ page }) => {
    await hideEmergentBadge(page);
  });

  test('full combat flow: login → GM Screen → start combat → combat actions → end combat → back to GM Screen', async ({ page }) => {
    // Step 1: Login
    await loginTestUser(page);
    
    // Step 2: If on role selection, go to GM (or navigate directly)
    // Navigate directly to GM screen
    await navigateToGMScreen(page);
    
    // Verify we're on GM Screen
    await expect(page.getByRole('heading', { name: 'Combat Control' })).toBeVisible();
    
    // Step 3: Select encounter
    await page.getByTestId(`encounter-${TEST_SCENARIO_ID}`).click();
    
    // Verify Start Combat is enabled
    await expect(page.getByTestId('start-combat-btn')).toBeEnabled();
    
    // Start Combat
    await page.getByTestId('start-combat-btn').click();
    
    // Wait for combat page to load
    await page.waitForURL(/\/combat/, { timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'Initiative Order' })).toBeVisible();
    
    // Verify combat scenario info
    await expect(page.getByRole('heading', { name: 'Goblin Ambush' })).toBeVisible();
    await expect(page.getByText('Stress Test Campaign')).toBeVisible();
    
    // Step 4: Verify combatants loaded
    await expect(page.getByText('Goblin Chief')).toBeVisible();
    await expect(page.getByText('Goblin Shaman')).toBeVisible();
    
    // Verify Round indicator
    await expect(page.getByText('Round 1')).toBeVisible();
    
    // Step 5: Perform combat actions
    // Click Next Turn
    await page.getByRole('button', { name: /Next Turn/i }).click({ force: true });
    
    // Small wait for turn to advance
    await page.waitForTimeout(500);
    
    // Damage a combatant (click -5 HP)
    const minusFiveBtn = page.locator('button:text-is("-5")').first();
    await minusFiveBtn.click({ force: true });
    await page.waitForTimeout(500);
    
    // Heal a combatant (click +5 HP)
    const plusFiveBtn = page.locator('button:text-is("+5")').first();
    await plusFiveBtn.click({ force: true });
    await page.waitForTimeout(500);
    
    // Step 6: End Combat (CRITICAL - this validates the bug fix)
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: /End Combat/i }).click();
    
    // CRITICAL ASSERTION: Verify we're back on GM Screen with /gm-screen/ URL
    // This was the bug - it was going to /dm-screen which doesn't exist
    await expect(page).toHaveURL(new RegExp(`/gm-screen/${TEST_CAMPAIGN_ID}`), { timeout: 10000 });
    
    // Verify GM Screen content is visible
    await expect(page.getByRole('heading', { name: 'Combat Control' })).toBeVisible({ timeout: 10000 });
    
    // Verify the encounter is still available
    await expect(page.getByTestId(`encounter-${TEST_SCENARIO_ID}`)).toBeVisible();
  });

  test('golden path: GM can use all tabs after combat', async ({ page }) => {
    // Login and go to GM Screen
    await loginTestUser(page);
    await navigateToGMScreen(page);
    
    // Quick combat and return
    await page.getByTestId(`encounter-${TEST_SCENARIO_ID}`).click();
    await page.getByTestId('start-combat-btn').click();
    await page.waitForURL(/\/combat/, { timeout: 15000 });
    
    // End combat immediately
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: /End Combat/i }).click();
    await expect(page).toHaveURL(new RegExp(`/gm-screen/${TEST_CAMPAIGN_ID}`), { timeout: 10000 });
    
    // Now test all tabs work after returning from combat
    // Dice tab
    await page.getByTestId('tab-dice').click();
    await expect(page.getByRole('heading', { name: 'Dice Roller' }).first()).toBeVisible();
    
    // Names tab
    await page.getByTestId('tab-names').click();
    await expect(page.getByTestId('generate-name-btn')).toBeVisible();
    
    // Party tab
    await page.getByTestId('tab-party').click();
    await expect(page.getByRole('heading', { name: 'Party Overview' })).toBeVisible();
    
    // Back to Combat tab
    await page.getByTestId('tab-combat').click();
    await expect(page.getByRole('heading', { name: 'Combat Control' })).toBeVisible();
  });

  test('golden path: Player flow - dashboard → notes → create note → delete note', async ({ page }) => {
    // Login
    await loginTestUser(page);
    
    // Go to Player dashboard
    await page.getByRole('button', { name: /Enter as Player/i }).click();
    await page.waitForURL(/\/player/, { timeout: 15000 });
    
    // Navigate to Notes tab
    await page.getByTestId('tab-notes').click();
    await page.waitForTimeout(1000);
    
    // Create a note
    const uniqueId = Date.now().toString(36);
    const noteTitle = `GP_TestNote_${uniqueId}`;
    
    await page.getByTestId('add-player-note-btn').click();
    await page.getByTestId('note-title-input').fill(noteTitle);
    await page.getByTestId('note-content-input').fill('Golden path test note content');
    await page.getByTestId('save-note-btn').click();
    
    // Verify note created
    await page.waitForTimeout(2000);
    await expect(page.getByText(noteTitle)).toBeVisible();
    
    // Delete the note
    const noteCard = page.locator(`[data-testid^="player-note-"]`).filter({ hasText: noteTitle });
    const deleteBtn = noteCard.locator('[data-testid^="delete-note-"]');
    page.once('dialog', dialog => dialog.accept());
    await deleteBtn.click();
    
    // Verify note deleted
    await page.waitForTimeout(2000);
    await expect(page.getByText(noteTitle)).not.toBeVisible();
    
    // Navigate back to Characters
    await page.getByTestId('tab-characters').click();
    await expect(page.getByText('My Characters').first()).toBeVisible();
  });

  test('golden path: stress test dice roller with large values', async ({ page }) => {
    // Login and go to GM Screen
    await loginTestUser(page);
    await navigateToGMScreen(page);
    
    // Navigate to Dice tab
    await page.getByTestId('tab-dice').click();
    await expect(page.getByRole('heading', { name: 'Dice Roller' }).first()).toBeVisible();
    
    // Test rolling 100 D6 dice
    await page.getByRole('button', { name: 'D6', exact: true }).click();
    const diceCountInput = page.locator('input[type="number"][min="1"][max="999"]');
    await diceCountInput.clear();
    await diceCountInput.fill('100');
    
    // Roll
    await page.getByRole('button', { name: /Roll 100D6/i }).click();
    await page.waitForTimeout(2000);
    
    // Verify result shows "100d6 = XXX"
    await expect(page.getByText(/100d6\s*=\s*\d+/)).toBeVisible();
    
    // Test rolling 500 dice (stress test)
    await diceCountInput.clear();
    await diceCountInput.fill('500');
    await page.getByRole('button', { name: /Roll 500D6/i }).click();
    await page.waitForTimeout(3000);
    
    // Verify large roll completes
    await expect(page.getByText(/500d6\s*=\s*\d+/)).toBeVisible();
  });
});
