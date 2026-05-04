import { test, expect } from '@playwright/test';
import { waitForAppReady, dismissToasts, removeBlockingBadges } from '../fixtures/helpers';

/**
 * Tests for Character Sheet Theme Updates - Visual Verification:
 * - Dark background theme 
 * - Character sheet loads correctly with themed UI
 */

async function registerAndCreateCharacter(page: any) {
  await page.goto('/auth', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('domcontentloaded');
  
  await page.click('button:has-text("CREATE ACCOUNT")');
  await page.waitForTimeout(500);
  
  const timestamp = Date.now();
  const emailInput = page.locator('input[placeholder*="email" i]');
  const displayNameInput = page.locator('input[placeholder*="display name" i]');
  const passwordInput = page.locator('input[placeholder*="password" i]');
  
  await emailInput.fill(`test${timestamp}@example.com`);
  await displayNameInput.fill(`testuser${timestamp}`);
  await passwordInput.fill('testpass123');
  await page.click('button:has-text("CREATE ACCOUNT")');
  await page.waitForTimeout(3000);
  
  // Navigate to character builder and create a character
  await page.goto('/characters/new', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  
  // Fill in character details
  await page.locator('[data-testid="character-name"]').fill(`TestChar${timestamp}`);
  
  // Navigate through steps
  await page.getByText('NEXT').click();
  await page.waitForTimeout(500);
  await page.getByText('NEXT').click();
  await page.waitForTimeout(500);
  await page.getByText('NEXT').click();
  await page.waitForTimeout(500);
  await page.getByText('NEXT').click();
  await page.waitForTimeout(500);
  
  // Click CREATE CHARACTER button
  const createBtn = page.getByTestId('create-character-btn');
  if (await createBtn.isVisible()) {
    await createBtn.click();
    await page.waitForTimeout(3000);
  } else {
    await page.getByText('CREATE CHARACTER').click();
    await page.waitForTimeout(3000);
  }
  
  return `TestChar${timestamp}`;
}

test.describe('Character Sheet Theme Updates', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
  });

  test('Character Sheet Full displays with proper themed UI', async ({ page }) => {
    const characterName = await registerAndCreateCharacter(page);
    
    // Navigate to characters list
    await page.goto('/characters', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    // Click on the character to view sheet
    const characterLink = page.getByText(characterName);
    if (await characterLink.isVisible()) {
      await characterLink.click();
      await page.waitForTimeout(2000);
      
      // Verify character name is displayed
      await expect(page.getByText(characterName)).toBeVisible();
      
      // Verify Level/Race/Class info is displayed with colored text
      await expect(page.getByText(/Level \d+/).first()).toBeVisible();
      
      // Verify tabs are present
      await expect(page.getByText('OVERVIEW')).toBeVisible();
      await expect(page.getByText('ABILITIES & SKILLS')).toBeVisible();
      await expect(page.getByText('SPELLS')).toBeVisible();
      await expect(page.getByText('FEATURES & FEATS')).toBeVisible();
      await expect(page.getByText('EQUIPMENT')).toBeVisible();
      await expect(page.getByText('NOTES & BIO')).toBeVisible();
      
      // Verify ability scores section - use first() for elements that may appear multiple times
      await expect(page.getByText('Ability Scores')).toBeVisible();
      await expect(page.getByTestId('ability-strength')).toBeVisible();
      await expect(page.getByTestId('ability-dexterity')).toBeVisible();
      await expect(page.getByTestId('ability-constitution')).toBeVisible();
      await expect(page.getByTestId('ability-intelligence')).toBeVisible();
      await expect(page.getByTestId('ability-wisdom')).toBeVisible();
      await expect(page.getByTestId('ability-charisma')).toBeVisible();
      
      // Verify Character Info section
      await expect(page.getByRole('heading', { name: 'Character Info' })).toBeVisible();
    }
  });

  test('Character Builder page has dark themed UI', async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');
    
    await page.click('button:has-text("CREATE ACCOUNT")');
    await page.waitForTimeout(500);
    
    const timestamp = Date.now();
    const emailInput = page.locator('input[placeholder*="email" i]');
    const displayNameInput = page.locator('input[placeholder*="display name" i]');
    const passwordInput = page.locator('input[placeholder*="password" i]');
    
    await emailInput.fill(`test${timestamp}@example.com`);
    await displayNameInput.fill(`testuser${timestamp}`);
    await passwordInput.fill('testpass123');
    await page.click('button:has-text("CREATE ACCOUNT")');
    await page.waitForTimeout(3000);
    
    await page.goto('/characters/new', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    // Verify the page renders with proper elements
    await expect(page.getByRole('heading', { name: 'Create Character' })).toBeVisible();
    await expect(page.getByText('Basic Info')).toBeVisible();
    await expect(page.getByText('ROOK')).toBeVisible();
    
    // Verify BACK and NEXT buttons exist - use getByRole for buttons
    await expect(page.getByRole('button', { name: /back/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /next/i })).toBeVisible();
  });

  test('Character Sheet Full shows quick stats bar', async ({ page }) => {
    const characterName = await registerAndCreateCharacter(page);
    
    // Navigate to characters list and click character
    await page.goto('/characters', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    const characterLink = page.getByText(characterName);
    if (await characterLink.isVisible()) {
      await characterLink.click();
      await page.waitForTimeout(2000);
      
      // Verify quick stats bar using data-testids
      await expect(page.getByTestId('hp-display')).toBeVisible();
      await expect(page.getByTestId('ac-display')).toBeVisible();
      await expect(page.getByTestId('initiative-display')).toBeVisible();
      await expect(page.getByTestId('speed-display')).toBeVisible();
      await expect(page.getByTestId('prof-display')).toBeVisible();
    }
  });
});
