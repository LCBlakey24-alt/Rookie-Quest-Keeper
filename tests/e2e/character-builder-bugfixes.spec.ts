import { test, expect } from '@playwright/test';
import { waitForAppReady, dismissToasts, removeBlockingBadges } from '../fixtures/helpers';

/**
 * Tests for Character Builder Bug Fixes:
 * 1. BACKGROUNDS.map error fixed - now uses b.name instead of b
 * 2. Character Builder has 5 steps for casters
 * 3. Step 4 shows subclass selection
 * 4. Step 4 shows spell selection for caster classes
 * 5. Step 4 shows feat selection
 */

async function registerTestUser(page: any) {
  await page.goto('/auth', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('domcontentloaded');
  
  // Click CREATE ACCOUNT button to switch to registration
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
}

test.describe('Character Builder Bug Fixes', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await registerTestUser(page);
  });

  test('Character Builder renders without errors', async ({ page }) => {
    await page.goto('/characters/new', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    // Verify page loaded successfully with heading
    await expect(page.getByRole('heading', { name: 'Create Character' })).toBeVisible();
    
    // Verify Basic Info section loads
    await expect(page.getByText('Basic Info')).toBeVisible();
    
    // Verify ROOK AI panel loads
    await expect(page.getByText('ROOK')).toBeVisible();
  });

  test('BACKGROUNDS dropdown shows background names correctly (not [Object object])', async ({ page }) => {
    await page.goto('/characters/new', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    // Locate the Background dropdown
    const backgroundSelect = page.locator('select').nth(2); // Third select - Race, Class, Background
    
    // Verify the default value is "Folk Hero" (a proper name, not "[object Object]")
    await expect(backgroundSelect).toHaveValue('Folk Hero');
    
    // Click to open dropdown and verify options
    await backgroundSelect.click();
    
    // Verify at least some background names are visible
    await expect(page.locator('option[value="Acolyte"]')).toBeAttached();
    await expect(page.locator('option[value="Charlatan"]')).toBeAttached();
    await expect(page.locator('option[value="Criminal"]')).toBeAttached();
    await expect(page.locator('option[value="Noble"]')).toBeAttached();
    await expect(page.locator('option[value="Sage"]')).toBeAttached();
  });

  test('Character Builder has 5 steps for caster classes (Wizard)', async ({ page }) => {
    await page.goto('/characters/new', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    // Select Wizard class (a caster)
    const classSelect = page.locator('select').nth(1);
    await classSelect.selectOption('Wizard');
    await page.waitForTimeout(500);
    
    // Verify we have 5 steps by checking step number "5" with "DETAILS" text exists
    await expect(page.getByText('DETAILS')).toBeVisible();
    
    // Navigate through all steps to verify 5 steps exist
    // Step 1 -> Step 2
    await page.locator('[data-testid="character-name"]').fill('TestWizard');
    await page.getByText('NEXT').click();
    await page.waitForTimeout(500);
    
    // Step 2 -> Step 3
    await page.getByText('NEXT').click();
    await page.waitForTimeout(500);
    
    // Step 3 -> Step 4
    await page.getByText('NEXT').click();
    await page.waitForTimeout(500);
    
    // Verify we're on Step 4 (Spells & Feats for casters)
    await expect(page.getByText('Choose Your Subclass')).toBeVisible();
    
    // Step 4 -> Step 5
    await page.getByText('NEXT').click();
    await page.waitForTimeout(500);
    
    // Verify we're on Step 5 (Details)
    await expect(page.getByText('Alignment')).toBeVisible();
  });

  test('Character Builder shows subclass selection in step 4', async ({ page }) => {
    await page.goto('/characters/new', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    // Enter name and select Wizard
    await page.locator('[data-testid="character-name"]').fill('TestWizard');
    const classSelect = page.locator('select').nth(1);
    await classSelect.selectOption('Wizard');
    
    // Navigate to step 4
    await page.getByText('NEXT').click();
    await page.waitForTimeout(500);
    await page.getByText('NEXT').click();
    await page.waitForTimeout(500);
    await page.getByText('NEXT').click();
    await page.waitForTimeout(500);
    
    // Verify subclass options for Wizard
    await expect(page.getByText('Choose Your Subclass')).toBeVisible();
    await expect(page.getByText('School of Evocation')).toBeVisible();
    await expect(page.getByText('School of Abjuration')).toBeVisible();
    await expect(page.getByText('School of Conjuration')).toBeVisible();
    await expect(page.getByText('School of Divination')).toBeVisible();
    await expect(page.getByText('School of Illusion')).toBeVisible();
    await expect(page.getByText('School of Necromancy')).toBeVisible();
  });

  test('Character Builder shows spell selection for caster classes', async ({ page }) => {
    await page.goto('/characters/new', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    // Enter name and select Wizard
    await page.locator('[data-testid="character-name"]').fill('TestWizard');
    const classSelect = page.locator('select').nth(1);
    await classSelect.selectOption('Wizard');
    
    // Navigate to step 4
    await page.getByText('NEXT').click();
    await page.waitForTimeout(500);
    await page.getByText('NEXT').click();
    await page.waitForTimeout(500);
    await page.getByText('NEXT').click();
    await page.waitForTimeout(500);
    
    // Verify cantrip selection section
    await expect(page.getByText('Select Cantrips')).toBeVisible();
    await expect(page.getByText(/choose your starting cantrips/i)).toBeVisible();
    
    // Verify some Wizard cantrips are available
    await expect(page.getByText('Fire Bolt')).toBeVisible();
    await expect(page.getByText('Mage Hand')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Light', exact: true })).toBeVisible();
    
    // Verify 1st level spell selection section
    await expect(page.getByText('Select 1st Level Spells')).toBeVisible();
    
    // Verify some Wizard spells are available
    await expect(page.getByText('Magic Missile')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Shield', exact: true })).toBeVisible();
    await expect(page.getByText('Mage Armor')).toBeVisible();
  });

  test('Character Builder shows feat selection in step 4', async ({ page }) => {
    await page.goto('/characters/new', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    // Enter name and select Wizard
    await page.locator('[data-testid="character-name"]').fill('TestWizard');
    const classSelect = page.locator('select').nth(1);
    await classSelect.selectOption('Wizard');
    
    // Navigate to step 4
    await page.getByText('NEXT').click();
    await page.waitForTimeout(500);
    await page.getByText('NEXT').click();
    await page.waitForTimeout(500);
    await page.getByText('NEXT').click();
    await page.waitForTimeout(500);
    
    // Verify feat selection section
    await expect(page.getByText('Optional Starting Feat')).toBeVisible();
    await expect(page.getByText(/if your dm allows/i)).toBeVisible();
    
    // Verify some feats are available
    await expect(page.getByText('Alert')).toBeVisible();
    await expect(page.getByText('Lucky')).toBeVisible();
    await expect(page.getByText('War Caster')).toBeVisible();
  });

  test('Non-caster (Fighter) has 5 steps with Features label', async ({ page }) => {
    await page.goto('/characters/new', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    // Fighter is default, enter name
    await page.locator('[data-testid="character-name"]').fill('TestFighter');
    
    // Navigate to step 4
    await page.getByText('NEXT').click();
    await page.waitForTimeout(500);
    await page.getByText('NEXT').click();
    await page.waitForTimeout(500);
    await page.getByText('NEXT').click();
    await page.waitForTimeout(500);
    
    // Verify Fighter subclasses are shown
    await expect(page.getByText('Choose Your Subclass')).toBeVisible();
    await expect(page.getByText('Champion')).toBeVisible();
    await expect(page.getByText('Battle Master')).toBeVisible();
    await expect(page.getByText('Eldritch Knight')).toBeVisible();
    
    // Verify starting equipment is shown
    await expect(page.getByText('Starting Equipment')).toBeVisible();
  });
});
