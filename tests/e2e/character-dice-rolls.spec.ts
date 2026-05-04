import { test, expect } from '@playwright/test';
import { 
  removeBlockingBadges, 
  loginTestUser,
  TEST_CHARACTER_ID
} from '../fixtures/helpers';

/**
 * Character Sheet Dice Roll Tests
 * Tests for clickable dice roll buttons on character sheet
 * 
 * FIXED: CharacterSheetFull.js now imports DiceRollButton and uses it in:
 * - AbilityScoreBlock for ability checks and saving throws
 * - SkillRow for skill checks  
 * - Initiative display
 */

test.describe('Character Sheet Dice Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await removeBlockingBadges(page);
    await loginTestUser(page);
    
    // Navigate to character sheet
    await page.goto(`/characters/${TEST_CHARACTER_ID}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('character-sheet-full')).toBeVisible({ timeout: 10000 });
  });

  test('Character sheet displays ability score modifiers', async ({ page }) => {
    // Verify ability scores are visible with modifiers
    await expect(page.getByTestId('ability-strength')).toBeVisible();
    await expect(page.getByTestId('ability-dexterity')).toBeVisible();
    await expect(page.getByTestId('ability-constitution')).toBeVisible();
    await expect(page.getByTestId('ability-intelligence')).toBeVisible();
    await expect(page.getByTestId('ability-wisdom')).toBeVisible();
    await expect(page.getByTestId('ability-charisma')).toBeVisible();
    
    // Check that modifiers are displayed (the DiceRollButton shows these)
    await expect(page.getByTestId('ability-strength')).toContainText('-1');
    await expect(page.getByTestId('ability-intelligence')).toContainText('+4');
  });

  test('Character sheet displays saving throws', async ({ page }) => {
    // Verify saving throws display modifiers
    const strengthAbility = page.getByTestId('ability-strength');
    await expect(strengthAbility).toContainText('SAVE');
    
    const intAbility = page.getByTestId('ability-intelligence');
    await expect(intAbility).toContainText('SAVE');
  });

  test('Character sheet displays all 18 skills', async ({ page }) => {
    // Verify skills section exists
    const skills = [
      'acrobatics', 'animal-handling', 'arcana', 'athletics',
      'deception', 'history', 'insight', 'intimidation',
      'investigation', 'medicine', 'nature', 'perception',
      'performance', 'persuasion', 'religion', 'sleight-of-hand',
      'stealth', 'survival'
    ];
    
    for (const skill of skills) {
      await expect(page.getByTestId(`skill-${skill}`)).toBeVisible();
    }
  });

  test('Initiative display shows modifier', async ({ page }) => {
    // Verify initiative is displayed in quick stats bar
    await expect(page.getByTestId('initiative-display')).toBeVisible();
    await expect(page.getByTestId('initiative-display')).toContainText('+');
  });

  test('Ability scores have clickable dice roll buttons', async ({ page }) => {
    // Verify Intelligence ability check dice roll button exists and works
    const intCheckDiceBtn = page.getByTestId('dice-roll-intelligence-check');
    await expect(intCheckDiceBtn).toBeVisible();
    
    // Click the dice roll button
    await intCheckDiceBtn.click();
    
    // Verify toast notification appears with roll result
    await expect(page.locator('[data-sonner-toast]')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('[data-sonner-toast]')).toContainText('Intelligence Check');
  });

  test('Saving throws have clickable dice roll buttons', async ({ page }) => {
    // Verify Intelligence save dice roll button exists and works
    const intSaveDiceBtn = page.getByTestId('dice-roll-intelligence-save');
    await expect(intSaveDiceBtn).toBeVisible();
    
    // Click the dice roll button
    await intSaveDiceBtn.click();
    
    // Verify toast notification appears with roll result
    await expect(page.locator('[data-sonner-toast]')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('[data-sonner-toast]')).toContainText('Intelligence Save');
  });

  test('Skills have clickable dice roll buttons', async ({ page }) => {
    // Verify Arcana skill dice roll button exists and works
    const arcanaDiceBtn = page.getByTestId('dice-roll-arcana');
    await expect(arcanaDiceBtn).toBeVisible();
    
    // Click the dice roll button
    await arcanaDiceBtn.click();
    
    // Verify toast notification appears with roll result
    await expect(page.locator('[data-sonner-toast]')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('[data-sonner-toast]')).toContainText('Arcana');
  });

  test('Initiative has clickable dice roll button', async ({ page }) => {
    // Verify initiative dice roll button exists and works
    const initDiceBtn = page.getByTestId('dice-roll-initiative');
    await expect(initDiceBtn).toBeVisible();
    
    // Click the dice roll button
    await initDiceBtn.click();
    
    // Verify toast notification appears with roll result
    await expect(page.locator('[data-sonner-toast]')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('[data-sonner-toast]')).toContainText('Initiative');
  });
});
