import { test, expect } from '@playwright/test';
import { 
  waitForAppReady, 
  hideEmergentBadge, 
  loginTestUser, 
  navigateToDMScreen,
  selectEncounterAndStartCombat,
  TEST_CAMPAIGN_ID,
  TEST_SCENARIO_ID
} from '../fixtures/helpers';

test.describe('Combat Flow - DM Screen to Combat Page', () => {
  test.beforeEach(async ({ page }) => {
    await hideEmergentBadge(page);
  });

  test('DM Screen shows encounter selector and Start Combat button', async ({ page }) => {
    await loginTestUser(page);
    await navigateToDMScreen(page);
    
    // Verify Combat section exists
    await expect(page.getByRole('heading', { name: 'Combat', exact: true })).toBeVisible();
    
    // Verify encounter selector label
    await expect(page.getByText('Select Encounter')).toBeVisible();
    
    // Verify the test encounter is visible
    const encounterBtn = page.getByTestId(`encounter-${TEST_SCENARIO_ID}`);
    await expect(encounterBtn).toBeVisible();
    await expect(encounterBtn).toContainText('Goblin Ambush');
    await expect(encounterBtn).toContainText('2 combatants');
    
    // Verify Start Combat button exists (disabled initially)
    const startCombatBtn = page.getByTestId('start-combat-btn');
    await expect(startCombatBtn).toBeVisible();
    await expect(startCombatBtn).toBeDisabled();
    await expect(startCombatBtn).toContainText('Start Combat');
    
    // Verify Quick Start button exists
    const quickStartBtn = page.getByTestId('quick-combat-btn');
    await expect(quickStartBtn).toBeVisible();
    await expect(quickStartBtn).toContainText('Quick Start with Players');
  });

  test('selecting encounter enables Start Combat button', async ({ page }) => {
    await loginTestUser(page);
    await navigateToDMScreen(page);
    
    // Start Combat should be disabled initially
    const startCombatBtn = page.getByTestId('start-combat-btn');
    await expect(startCombatBtn).toBeDisabled();
    
    // Select the encounter
    await page.getByTestId(`encounter-${TEST_SCENARIO_ID}`).click();
    
    // Now Start Combat should be enabled
    await expect(startCombatBtn).toBeEnabled();
  });

  test('Start Combat navigates to Combat Page', async ({ page }) => {
    await loginTestUser(page);
    await navigateToDMScreen(page);
    
    // Select encounter and start combat
    await selectEncounterAndStartCombat(page);
    
    // Verify we're on the Combat Page
    await expect(page).toHaveURL(new RegExp(`/campaign/${TEST_CAMPAIGN_ID}/combat`));
    
    // Verify combat title shows scenario name
    await expect(page.getByRole('heading', { name: 'Goblin Ambush' })).toBeVisible();
    
    // Verify campaign name is shown
    await expect(page.getByText('Test Combat Campaign')).toBeVisible();
  });

  test('Combat Page has two-column layout with Initiative on left and Map on right', async ({ page }) => {
    await loginTestUser(page);
    await navigateToDMScreen(page);
    await selectEncounterAndStartCombat(page);
    
    // Verify Initiative Order heading on left
    await expect(page.getByRole('heading', { name: 'Initiative Order' })).toBeVisible();
    
    // Verify grid/map section on right (no map loaded text or grid icons)
    // The right column shows "No map loaded for this encounter" when no map is present
    await expect(page.getByText('No map loaded for this encounter')).toBeVisible();
    
    // Verify Round indicator is visible
    await expect(page.getByText('Round 1')).toBeVisible();
    
    // Verify Next Turn button exists
    await expect(page.getByRole('button', { name: /Next Turn/i })).toBeVisible();
    
    // Verify End Combat button exists
    await expect(page.getByRole('button', { name: /End Combat/i })).toBeVisible();
  });

  test('Combat Page shows combatants with HP, AC, and conditions', async ({ page }) => {
    await loginTestUser(page);
    await navigateToDMScreen(page);
    await selectEncounterAndStartCombat(page);
    
    // Verify both goblins are displayed
    await expect(page.getByText('Goblin 1')).toBeVisible();
    await expect(page.getByText('Goblin 2')).toBeVisible();
    
    // Verify HP is displayed (7/7 for goblins)
    await expect(page.getByText('7 / 7').first()).toBeVisible();
    
    // Verify AC is displayed (13 for goblins)
    await expect(page.getByText('13').first()).toBeVisible();
    
    // Verify condition buttons are present (Blind, Charm, Fear, etc.)
    await expect(page.getByRole('button', { name: 'Blind' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Charm' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Fear' }).first()).toBeVisible();
    
    // Verify HP adjustment buttons are present
    await expect(page.getByRole('button', { name: '+1' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: '-1' }).first()).toBeVisible();
  });

  test('End Combat button returns to DM Screen', async ({ page }) => {
    await loginTestUser(page);
    await navigateToDMScreen(page);
    await selectEncounterAndStartCombat(page);
    
    // Click End Combat (handle confirmation dialog)
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: /End Combat/i }).click();
    
    // Verify we're back on the DM Screen
    await expect(page).toHaveURL(new RegExp(`/dm-screen/${TEST_CAMPAIGN_ID}`));
    
    // Verify DM Screen content is visible
    await expect(page.getByRole('heading', { name: 'Combat', exact: true })).toBeVisible({ timeout: 10000 });
  });

  test('Quick Start combat with players creates combat with party members', async ({ page }) => {
    await loginTestUser(page);
    await navigateToDMScreen(page);
    
    // Verify Party Overview shows the player
    await expect(page.getByText('Thorin Ironheart')).toBeVisible();
    
    // Click Quick Start with Players
    await page.getByTestId('quick-combat-btn').click();
    
    // Wait for navigation to Combat Page
    await page.waitForURL(/\/combat/, { timeout: 10000 });
    
    // Verify we're on the Combat Page
    await expect(page.getByRole('heading', { name: 'Initiative Order' })).toBeVisible({ timeout: 10000 });
    
    // Verify the scenario name is "Quick Combat"
    await expect(page.getByRole('heading', { name: 'Quick Combat' })).toBeVisible();
    
    // Verify Thorin is in the combat
    await expect(page.getByText('Thorin Ironheart')).toBeVisible();
    
    // Clean up - end combat
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: /End Combat/i }).click();
    await expect(page).toHaveURL(new RegExp(`/dm-screen/${TEST_CAMPAIGN_ID}`));
  });

  test('Next Turn button advances turn order', async ({ page }) => {
    await loginTestUser(page);
    await navigateToDMScreen(page);
    await selectEncounterAndStartCombat(page);
    
    // Find the combatant with "TURN" indicator (first in initiative)
    await expect(page.getByText('TURN')).toBeVisible();
    
    // Click Next Turn
    await page.getByRole('button', { name: /Next Turn/i }).click();
    
    // The turn should have advanced - we should still see TURN indicator
    await expect(page.getByText('TURN')).toBeVisible();
    
    // Click Next Turn again to complete a round
    await page.getByRole('button', { name: /Next Turn/i }).click();
    
    // Should now be Round 2
    await expect(page.getByText('Round 2')).toBeVisible();
    
    // Clean up
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: /End Combat/i }).click();
  });

  test('HP can be adjusted during combat', async ({ page }) => {
    await loginTestUser(page);
    await navigateToDMScreen(page);
    await selectEncounterAndStartCombat(page);
    
    // Initial HP should be 7/7
    await expect(page.getByText('7 / 7').first()).toBeVisible();
    
    // Click -1 on the first combatant
    await page.getByRole('button', { name: '-1' }).first().click();
    
    // HP should now be 6/7
    await expect(page.getByText('6 / 7').first()).toBeVisible();
    
    // Click +5 to heal
    await page.getByRole('button', { name: '+5' }).first().click();
    
    // HP should be back to 7/7 (capped at max)
    await expect(page.getByText('7 / 7').first()).toBeVisible();
    
    // Clean up
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: /End Combat/i }).click();
  });
});
