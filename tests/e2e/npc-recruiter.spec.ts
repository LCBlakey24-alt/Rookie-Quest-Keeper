import { test, expect } from '@playwright/test';
import { 
  waitForAppReady, 
  removeBlockingBadges, 
  loginTestUser, 
  navigateToGMScreen,
  TEST_CAMPAIGN_ID,
  TEST_ABILITIES_SCENARIO_ID,
  TEST_CUSTOM_CREATURE_ID
} from '../fixtures/helpers';

test.describe('NPC Combat Recruiter - Add NPCs/Creatures to Combat', () => {
  test.beforeEach(async ({ page }) => {
    await removeBlockingBadges(page);
  });

  test('Recruit NPC button is visible during combat', async ({ page }) => {
    await loginTestUser(page);
    await navigateToGMScreen(page);
    
    // Start combat with Shadow Wolf Hunt
    await page.getByTestId(`encounter-${TEST_ABILITIES_SCENARIO_ID}`).click();
    await page.getByTestId('start-combat-btn').click();
    await page.waitForURL(/\/combat/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Initiative Order' })).toBeVisible({ timeout: 15000 });
    
    // Verify Recruit NPC button is visible
    const recruitBtn = page.getByTestId('recruit-npc-btn');
    await expect(recruitBtn).toBeVisible({ timeout: 5000 });
    await expect(recruitBtn).toContainText('Add NPCs/Creatures to Combat');
    
    // Clean up
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: /End Combat/i }).click({ force: true });
  });

  test('Clicking Recruit button opens recruiter panel', async ({ page }) => {
    await loginTestUser(page);
    await navigateToGMScreen(page);
    
    // Start combat
    await page.getByTestId(`encounter-${TEST_ABILITIES_SCENARIO_ID}`).click();
    await page.getByTestId('start-combat-btn').click();
    await page.waitForURL(/\/combat/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Initiative Order' })).toBeVisible({ timeout: 15000 });
    
    // Click Recruit NPC button
    await page.getByTestId('recruit-npc-btn').click();
    
    // Panel should expand showing "Recruit to Combat" header
    await expect(page.getByRole('heading', { name: /Recruit to Combat/i })).toBeVisible({ timeout: 5000 });
    
    // Should show tabs for NPCs and Creatures
    await expect(page.getByRole('button', { name: /NPCs/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Creatures/i })).toBeVisible();
    
    // Should show search input
    await expect(page.getByTestId('npc-search-input')).toBeVisible();
    
    // Clean up
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: /End Combat/i }).click({ force: true });
  });

  test('Creatures tab shows custom creatures from campaign', async ({ page }) => {
    await loginTestUser(page);
    await navigateToGMScreen(page);
    
    // Start combat
    await page.getByTestId(`encounter-${TEST_ABILITIES_SCENARIO_ID}`).click();
    await page.getByTestId('start-combat-btn').click();
    await page.waitForURL(/\/combat/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Initiative Order' })).toBeVisible({ timeout: 15000 });
    
    // Open recruiter panel
    await page.getByTestId('recruit-npc-btn').click();
    await expect(page.getByRole('heading', { name: /Recruit to Combat/i })).toBeVisible({ timeout: 5000 });
    
    // Click Creatures tab
    await page.getByRole('button', { name: /Creatures/i }).click();
    
    // Should show Shadow Wolf creature - use Add button as unique identifier
    const addCreatureBtn = page.getByTestId(`add-creature-${TEST_CUSTOM_CREATURE_ID}`);
    await expect(addCreatureBtn).toBeVisible({ timeout: 5000 });
    
    // Should show creature stats (HP, AC, CR) near the Add button
    await expect(page.getByText('CR 2')).toBeVisible();
    
    // Clean up
    page.on('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: /End Combat/i }).click({ force: true });
  });

  test('Search filters creatures in recruiter panel', async ({ page }) => {
    await loginTestUser(page);
    await navigateToGMScreen(page);
    
    // Start combat
    await page.getByTestId(`encounter-${TEST_ABILITIES_SCENARIO_ID}`).click();
    await page.getByTestId('start-combat-btn').click();
    await page.waitForURL(/\/combat/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Initiative Order' })).toBeVisible({ timeout: 15000 });
    
    // Open recruiter panel and go to Creatures tab
    await page.getByTestId('recruit-npc-btn').click();
    await page.getByRole('button', { name: /Creatures/i }).click();
    
    // Shadow Wolf creature should be visible initially (via Add button)
    const addCreatureBtn = page.getByTestId(`add-creature-${TEST_CUSTOM_CREATURE_ID}`);
    await expect(addCreatureBtn).toBeVisible({ timeout: 5000 });
    
    // Search for non-existent creature
    await page.getByTestId('npc-search-input').fill('Nonexistent Dragon');
    
    // Should show "No matching creatures" message
    await expect(page.getByText('No matching creatures')).toBeVisible({ timeout: 3000 });
    
    // Clear search and search for Shadow
    await page.getByTestId('npc-search-input').fill('Shadow');
    
    // Shadow Wolf creature should be visible again
    await expect(addCreatureBtn).toBeVisible({ timeout: 3000 });
    
    // Clean up
    page.on('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: /End Combat/i }).click({ force: true });
  });

  test('Adding creature to combat creates new combatant with initiative', async ({ page }) => {
    await loginTestUser(page);
    await navigateToGMScreen(page);
    
    // Start combat
    await page.getByTestId(`encounter-${TEST_ABILITIES_SCENARIO_ID}`).click();
    await page.getByTestId('start-combat-btn').click();
    await page.waitForURL(/\/combat/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Initiative Order' })).toBeVisible({ timeout: 15000 });
    
    // Count initial combatants (Shadow Wolf Alpha and Shadow Wolf Pack = 2)
    const initialCombatantCount = await page.locator('[data-testid^="attack-btn-"]').count();
    
    // Open recruiter panel and go to Creatures tab
    await page.getByTestId('recruit-npc-btn').click();
    await page.getByRole('button', { name: /Creatures/i }).click();
    
    // Find and click Add button for Shadow Wolf creature
    const addCreatureBtn = page.getByTestId(`add-creature-${TEST_CUSTOM_CREATURE_ID}`);
    await expect(addCreatureBtn).toBeVisible({ timeout: 5000 });
    await addCreatureBtn.click();
    
    // Should show success toast
    await expect(page.getByText(/joined combat/i)).toBeVisible({ timeout: 5000 });
    
    // New combatant should appear in initiative order
    // Count should increase by 1
    const newCombatantCount = await page.locator('[data-testid^="attack-btn-"]').count();
    expect(newCombatantCount).toBe(initialCombatantCount + 1);
    
    // Clean up
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: /End Combat/i }).click({ force: true });
  });

  test('NPCs tab shows no NPCs message when campaign has no NPCs', async ({ page }) => {
    await loginTestUser(page);
    await navigateToGMScreen(page);
    
    // Start combat
    await page.getByTestId(`encounter-${TEST_ABILITIES_SCENARIO_ID}`).click();
    await page.getByTestId('start-combat-btn').click();
    await page.waitForURL(/\/combat/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Initiative Order' })).toBeVisible({ timeout: 15000 });
    
    // Open recruiter panel (NPCs tab is default)
    await page.getByTestId('recruit-npc-btn').click();
    await expect(page.getByRole('heading', { name: /Recruit to Combat/i })).toBeVisible({ timeout: 5000 });
    
    // Should show "No NPCs in this campaign" message
    await expect(page.getByText('No NPCs in this campaign')).toBeVisible({ timeout: 5000 });
    
    // Clean up
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: /End Combat/i }).click({ force: true });
  });
});
