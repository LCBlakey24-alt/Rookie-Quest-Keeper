import { test, expect } from '@playwright/test';
import { loginTestUser, TEST_USER, removeBlockingBadges, dismissToasts } from '../fixtures/helpers';

// Test credentials
const EMAIL = TEST_USER.email;
const PASSWORD = TEST_USER.password;

test.describe('Subscription Tier Badge and Campaign Limits', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
  });

  test('Dashboard shows subscription tier badge with campaign limit info', async ({ page }) => {
    await loginTestUser(page);
    await page.waitForTimeout(1500);
    await removeBlockingBadges(page);
    
    // Should see subscription tier badge in GM section
    // For Legendary tier it shows "Legendary · Unlimited"
    const tierBadge = page.locator('span:has-text("Legendary")').first();
    await expect(tierBadge).toBeVisible({ timeout: 10000 });
    
    // Verify it says Unlimited for legendary tier
    await expect(page.getByText(/Legendary.*Unlimited/)).toBeVisible();
  });

  test('New Campaign button is visible for users with campaign creation rights', async ({ page }) => {
    await loginTestUser(page);
    await page.waitForTimeout(1500);
    
    const newCampaignBtn = page.getByTestId('new-campaign-btn');
    await expect(newCampaignBtn).toBeVisible();
    await expect(newCampaignBtn).toBeEnabled();
  });

  test('New Character button is visible on dashboard', async ({ page }) => {
    await loginTestUser(page);
    await page.waitForTimeout(1500);
    
    const newCharacterBtn = page.getByTestId('new-character-btn');
    await expect(newCharacterBtn).toBeVisible();
    await expect(newCharacterBtn).toBeEnabled();
  });
});

test.describe('Character Sheet Spells Tab - Spellcasting Ability', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
  });

  test('Wizard shows INT as spellcasting ability', async ({ page }) => {
    await loginTestUser(page);
    await page.waitForTimeout(1500);
    
    // Navigate to Wizard character - TEST_spells_obj_format
    await page.goto('/characters/9e2d3e83-65cb-4ece-a4b0-4f5c156f68c7', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    // Click Spells tab
    const spellsButton = page.locator('button:has-text("spells")').first();
    await spellsButton.click();
    await page.waitForTimeout(1000);
    
    // Verify spellcasting section shows
    await expect(page.getByText('Spellcasting')).toBeVisible();
    
    // Verify ABILITY shows INT for Wizard (use exact match to avoid conflict with "Ability Scores")
    await expect(page.getByText('ABILITY', { exact: true })).toBeVisible();
    // Check INT is displayed as the spellcasting ability for Wizard
    const abilitySection = page.locator('div:has-text("ABILITY")').filter({ hasText: 'INT' });
    await expect(abilitySection.first()).toBeVisible();
    
    // Verify SPELL DC is shown
    await expect(page.getByText('SPELL DC')).toBeVisible();
    
    // Verify SPELL ATK is shown
    await expect(page.getByText('SPELL ATK')).toBeVisible();
  });

  test('Spell slots display correctly based on character level', async ({ page }) => {
    await loginTestUser(page);
    await page.waitForTimeout(1500);
    
    // Navigate to Wizard character
    await page.goto('/characters/9e2d3e83-65cb-4ece-a4b0-4f5c156f68c7', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    // Click Spells tab
    const spellsButton = page.locator('button:has-text("spells")').first();
    await spellsButton.click();
    await page.waitForTimeout(1000);
    
    // Verify spell slots section shows for level 1 wizard (should have Lvl 1: 2 slots)
    await expect(page.getByText('SPELL SLOTS')).toBeVisible();
    
    // Check Lvl 1 slot indicator exists
    await expect(page.getByText('Lvl 1')).toBeVisible();
  });

  test('Cantrips section displays properly', async ({ page }) => {
    await loginTestUser(page);
    await page.waitForTimeout(1500);
    
    // Navigate to Wizard character
    await page.goto('/characters/9e2d3e83-65cb-4ece-a4b0-4f5c156f68c7', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    // Click Spells tab
    const spellsButton = page.locator('button:has-text("spells")').first();
    await spellsButton.click();
    await page.waitForTimeout(1000);
    
    // Verify cantrips section shows
    await expect(page.getByText('CANTRIPS')).toBeVisible();
    
    // Fire Bolt should be visible as a cantrip
    await expect(page.getByText('Fire Bolt')).toBeVisible();
  });

  test('Prepared spells section displays properly', async ({ page }) => {
    await loginTestUser(page);
    await page.waitForTimeout(1500);
    
    // Navigate to Wizard character
    await page.goto('/characters/9e2d3e83-65cb-4ece-a4b0-4f5c156f68c7', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    // Click Spells tab
    const spellsButton = page.locator('button:has-text("spells")').first();
    await spellsButton.click();
    await page.waitForTimeout(1000);
    
    // Verify prepared spells section shows
    await expect(page.getByText('PREPARED SPELLS')).toBeVisible();
  });

  test('Fighter (Eldritch Knight capable) shows spellcasting stats', async ({ page }) => {
    await loginTestUser(page);
    await page.waitForTimeout(1500);
    
    // Navigate to Fighter character - TEST_Hero_1773389545537
    // Note: Fighter is in SPELLCASTING_CLASSES due to Eldritch Knight subclass option
    await page.goto('/characters/0bda5cf5-b8be-40c8-b2bc-b030ea70c366', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    // Click Spells tab
    const spellsButton = page.locator('button:has-text("spells")').first();
    await spellsButton.click();
    await page.waitForTimeout(1000);
    
    // Fighter has Eldritch Knight subclass option so shows spellcasting stats with INT
    await expect(page.getByText('Spellcasting')).toBeVisible();
    
    // Should show "No spells known yet" since no spells have been added
    await expect(page.getByText(/No spells known/)).toBeVisible();
  });
});

test.describe('Level Up Wizard', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
  });

  test('Level Up button is visible on character sheet', async ({ page }) => {
    await loginTestUser(page);
    await page.waitForTimeout(1500);
    
    // Navigate to Fighter character
    await page.goto('/characters/0bda5cf5-b8be-40c8-b2bc-b030ea70c366', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    const levelUpBtn = page.getByTestId('level-up-btn');
    await expect(levelUpBtn).toBeVisible();
    await expect(levelUpBtn).toContainText('Level Up');
  });

  test('Level Up wizard opens with correct character info', async ({ page }) => {
    await loginTestUser(page);
    await page.waitForTimeout(1500);
    
    // Navigate to Fighter character
    await page.goto('/characters/0bda5cf5-b8be-40c8-b2bc-b030ea70c366', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    // Click Level Up button
    const levelUpBtn = page.getByTestId('level-up-btn');
    await levelUpBtn.click();
    await page.waitForTimeout(1000);
    
    // Verify wizard modal appears
    await expect(page.getByText('Level Up!')).toBeVisible();
    
    // Verify character name and class is shown
    await expect(page.getByText(/Fighter.*→/)).toBeVisible();
  });

  test('Level Up wizard shows HP method selection', async ({ page }) => {
    await loginTestUser(page);
    await page.waitForTimeout(1500);
    
    // Navigate to Fighter character
    await page.goto('/characters/0bda5cf5-b8be-40c8-b2bc-b030ea70c366', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    // Click Level Up button
    const levelUpBtn = page.getByTestId('level-up-btn');
    await levelUpBtn.click();
    await page.waitForTimeout(1000);
    
    // Verify HP method options are shown
    await expect(page.getByText('Choose Hit Point Method')).toBeVisible();
    await expect(page.getByText(/Take Average/)).toBeVisible();
    await expect(page.getByText(/Roll Hit Dice/)).toBeVisible();
  });

  test('Level Up wizard has Cancel and Next buttons', async ({ page }) => {
    await loginTestUser(page);
    await page.waitForTimeout(1500);
    
    // Navigate to Fighter character
    await page.goto('/characters/0bda5cf5-b8be-40c8-b2bc-b030ea70c366', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    // Click Level Up button
    const levelUpBtn = page.getByTestId('level-up-btn');
    await levelUpBtn.click();
    await page.waitForTimeout(1000);
    
    // Verify Cancel and Next buttons
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Next/ })).toBeVisible();
  });

  test('Level Up wizard can be cancelled', async ({ page }) => {
    await loginTestUser(page);
    await page.waitForTimeout(1500);
    
    // Navigate to Fighter character
    await page.goto('/characters/0bda5cf5-b8be-40c8-b2bc-b030ea70c366', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    // Click Level Up button
    const levelUpBtn = page.getByTestId('level-up-btn');
    await levelUpBtn.click();
    await page.waitForTimeout(1000);
    
    // Click Cancel
    await page.getByRole('button', { name: 'Cancel' }).click();
    await page.waitForTimeout(500);
    
    // Modal should be closed
    await expect(page.getByText('Level Up!')).not.toBeVisible();
  });
});
