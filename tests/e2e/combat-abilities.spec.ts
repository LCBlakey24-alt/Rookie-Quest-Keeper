import { test, expect } from '@playwright/test';
import { 
  waitForAppReady, 
  removeBlockingBadges, 
  loginTestUser, 
  navigateToGMScreen,
  TEST_CAMPAIGN_ID,
  TEST_ABILITIES_SCENARIO_ID
} from '../fixtures/helpers';

test.describe('Combat Abilities - Creature Ability Cards', () => {
  test.beforeEach(async ({ page }) => {
    await removeBlockingBadges(page);
  });

  test('Shadow Wolf Hunt encounter shows abilities on combatants', async ({ page }) => {
    await loginTestUser(page);
    await navigateToGMScreen(page);
    
    // Select the Shadow Wolf Hunt encounter (has abilities)
    const encounterBtn = page.getByTestId(`encounter-${TEST_ABILITIES_SCENARIO_ID}`);
    await expect(encounterBtn).toBeVisible({ timeout: 10000 });
    await encounterBtn.click();
    
    // Start combat
    await expect(page.getByTestId('start-combat-btn')).toBeEnabled({ timeout: 5000 });
    await page.getByTestId('start-combat-btn').click();
    await page.waitForURL(/\/combat/, { timeout: 10000 });
    
    // Verify combatants are displayed
    await expect(page.getByRole('heading', { name: 'Initiative Order' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Shadow Wolf Alpha')).toBeVisible();
    await expect(page.getByText('Shadow Wolf Pack')).toBeVisible();
    
    // Verify abilities section is present (shows "X Abilities" text)
    // The CreatureAbilityCard shows "X Abilities" as a collapsed section
    await expect(page.getByText(/\d+ Abilities/).first()).toBeVisible({ timeout: 10000 });
    
    // Clean up - handle dialog BEFORE clicking
    page.on('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: /End Combat/i }).click({ force: true });
    await expect(page).toHaveURL(new RegExp(`/gm-screen/${TEST_CAMPAIGN_ID}`), { timeout: 15000 });
  });

  test('Expanding abilities shows clickable ability buttons', async ({ page }) => {
    await loginTestUser(page);
    await navigateToGMScreen(page);
    
    // Select Shadow Wolf Hunt and start combat
    await page.getByTestId(`encounter-${TEST_ABILITIES_SCENARIO_ID}`).click();
    await page.getByTestId('start-combat-btn').click();
    await page.waitForURL(/\/combat/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Initiative Order' })).toBeVisible({ timeout: 15000 });
    
    // Find and click to expand abilities
    const abilitiesHeader = page.getByText(/\d+ Abilities/).first();
    await expect(abilitiesHeader).toBeVisible();
    await abilitiesHeader.click();
    
    // After expanding, should see ability buttons with dice notation
    // Buttons show abbreviated names like "Bite 1d8+3" or "Bite 2d6+4"
    // Look for buttons containing "Bite" with dice notation
    await expect(page.getByRole('button', { name: /Bite.*\d+d\d+/i }).first()).toBeVisible({ timeout: 5000 });
    
    // Clean up
    page.on('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: /End Combat/i }).click({ force: true });
  });

  test('Clicking ability button with dice shows roll result', async ({ page }) => {
    await loginTestUser(page);
    await navigateToGMScreen(page);
    
    // Select Shadow Wolf Hunt and start combat
    await page.getByTestId(`encounter-${TEST_ABILITIES_SCENARIO_ID}`).click();
    await page.getByTestId('start-combat-btn').click();
    await page.waitForURL(/\/combat/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Initiative Order' })).toBeVisible({ timeout: 15000 });
    
    // Expand abilities
    const abilitiesHeader = page.getByText(/\d+ Abilities/).first();
    await abilitiesHeader.click();
    
    // Click Bite ability button (has dice notation like 1d8+3 or 2d6+4)
    const biteButton = page.getByRole('button', { name: /Bite.*\d+d\d+/i }).first();
    await expect(biteButton).toBeVisible({ timeout: 5000 });
    await biteButton.click();
    
    // Should show roll result with damage total
    // The result panel shows "Total: X damage" with the number
    await expect(page.getByText(/Total:?\s*\d+\s*damage/i)).toBeVisible({ timeout: 5000 });
    
    // Clean up
    page.on('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: /End Combat/i }).click({ force: true });
  });

  test('Combat end returns to GM Screen (regression test)', async ({ page }) => {
    await loginTestUser(page);
    await navigateToGMScreen(page);
    
    // Start any combat
    await page.getByTestId(`encounter-${TEST_ABILITIES_SCENARIO_ID}`).click();
    await page.getByTestId('start-combat-btn').click();
    await page.waitForURL(/\/combat/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Initiative Order' })).toBeVisible({ timeout: 15000 });
    
    // End combat and verify navigation to /gm-screen (not /dm-screen)
    page.on('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: /End Combat/i }).click({ force: true });
    
    // CRITICAL: Should navigate to /gm-screen, NOT /dm-screen
    await expect(page).toHaveURL(new RegExp(`/gm-screen/${TEST_CAMPAIGN_ID}`), { timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'Combat Control' })).toBeVisible({ timeout: 10000 });
  });
});
