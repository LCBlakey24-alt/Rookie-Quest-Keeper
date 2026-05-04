import { test, expect } from '@playwright/test';
import { 
  loginTestUser, 
  dismissToasts, 
  removeBlockingBadges,
  TEST_CAMPAIGN_ID,
  TEST_CHARACTER_ID
} from '../fixtures/helpers';

test.describe('UX Improvements - Dice Roller Visibility', () => {
  
  test('Dice roller does NOT appear on landing page', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'ROOKIE QUEST', exact: true })).toBeVisible({ timeout: 15000 });
    
    // Dice roller should NOT be visible on landing page
    const diceRoller = page.getByTestId('floating-dice-btn');
    await expect(diceRoller).not.toBeVisible();
  });
  
  test('Dice roller does NOT appear on auth page', async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Welcome Back')).toBeVisible({ timeout: 15000 });
    
    // Dice roller should NOT be visible on auth page
    const diceRoller = page.getByTestId('floating-dice-btn');
    await expect(diceRoller).not.toBeVisible();
  });
  
  test('Dice roller DOES appear on campaigns page', async ({ page }) => {
    await dismissToasts(page);
    await loginTestUser(page);
    
    // Navigate to campaigns
    await page.goto('/campaigns', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Your Campaigns/i })).toBeVisible({ timeout: 15000 });
    
    // Dice roller should be visible
    const diceRoller = page.getByTestId('floating-dice-btn');
    await expect(diceRoller).toBeVisible({ timeout: 10000 });
  });
  
  test('Dice roller DOES appear on Player Dashboard', async ({ page }) => {
    await dismissToasts(page);
    await loginTestUser(page);
    
    // Navigate to player dashboard
    await page.goto('/player', { waitUntil: 'domcontentloaded' });
    // Wait for Player Hub heading (this is the actual title)
    await expect(page.getByRole('heading', { name: /Player Hub/i })).toBeVisible({ timeout: 15000 });
    
    // Dice roller should be visible
    const diceRoller = page.getByTestId('floating-dice-btn');
    await expect(diceRoller).toBeVisible({ timeout: 10000 });
  });
  
  test('Dice roller DOES appear on Campaign Dashboard', async ({ page }) => {
    await dismissToasts(page);
    await loginTestUser(page);
    
    // Navigate to campaign dashboard
    await page.goto(`/campaign/${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Campaign Setting/i })).toBeVisible({ timeout: 15000 });
    
    // Dice roller should be visible
    const diceRoller = page.getByTestId('floating-dice-btn');
    await expect(diceRoller).toBeVisible({ timeout: 10000 });
  });
});

test.describe('UX Improvements - Character Sheet Compact Layout', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await loginTestUser(page);
  });
  
  test('Character Sheet displays ability scores in compact layout', async ({ page }) => {
    await page.goto(`/characters/${TEST_CHARACTER_ID}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('character-sheet-full')).toBeVisible({ timeout: 10000 });
    
    // All 6 ability scores should be visible
    await expect(page.getByTestId('ability-strength')).toBeVisible();
    await expect(page.getByTestId('ability-dexterity')).toBeVisible();
    await expect(page.getByTestId('ability-constitution')).toBeVisible();
    await expect(page.getByTestId('ability-intelligence')).toBeVisible();
    await expect(page.getByTestId('ability-wisdom')).toBeVisible();
    await expect(page.getByTestId('ability-charisma')).toBeVisible();
  });
  
  test('Character Sheet has quick stats display', async ({ page }) => {
    await page.goto(`/characters/${TEST_CHARACTER_ID}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('character-sheet-full')).toBeVisible({ timeout: 10000 });
    
    // Quick stats should be visible
    await expect(page.getByTestId('hp-display')).toBeVisible();
    await expect(page.getByTestId('ac-display')).toBeVisible();
    await expect(page.getByTestId('initiative-display')).toBeVisible();
    await expect(page.getByTestId('speed-display')).toBeVisible();
    await expect(page.getByTestId('prof-display')).toBeVisible();
  });
  
  test('Character Sheet Spells tab has spell slots section', async ({ page }) => {
    await page.goto(`/characters/${TEST_CHARACTER_ID}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('character-sheet-full')).toBeVisible({ timeout: 10000 });
    
    // Navigate to Spells tab
    await page.getByTestId('tab-spells').click();
    
    // Should show SPELLCASTING section header
    await expect(page.getByText('SPELLCASTING')).toBeVisible({ timeout: 10000 });
    
    // Spell slots section should be visible
    await expect(page.getByText('SPELL SLOTS')).toBeVisible({ timeout: 10000 });
    
    // Should show spellcasting stats
    await expect(page.getByText('Ability')).toBeVisible();
    await expect(page.getByText('Save DC')).toBeVisible();
    await expect(page.getByText('Attack Bonus')).toBeVisible();
  });
});

test.describe('UX Improvements - Maps Tab Location', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await loginTestUser(page);
  });
  
  test('Maps tab is in Campaign Dashboard sidebar', async ({ page }) => {
    await page.goto(`/campaign/${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Campaign Setting/i })).toBeVisible({ timeout: 15000 });
    
    // Maps tab should be visible in sidebar
    const mapsTab = page.getByTestId('maps-tab');
    await expect(mapsTab).toBeVisible();
    
    // Should contain "Maps" text
    await expect(mapsTab).toContainText('Maps');
  });
  
  test('Maps tab is NOT in GM Screen', async ({ page }) => {
    await page.goto(`/gm-screen/${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Combat Control' })).toBeVisible({ timeout: 15000 });
    
    // Maps tab should NOT be visible in GM Screen
    const mapsTab = page.getByTestId('tab-maps');
    await expect(mapsTab).not.toBeVisible();
  });
});
