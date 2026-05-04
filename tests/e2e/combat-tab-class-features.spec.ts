import { test, expect } from '@playwright/test';

/**
 * Combat Tab Dynamic Class Features Tests
 * Tests the dynamic class actions, bonus actions, reactions, and passive abilities
 * based on character class and level from classFeatures.js
 */

const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';
const TEST_USER = {
  email: 'lcblakey24@outlook.com',
  password: 'Trigger24?!'
};

// Test Characters
const PALADIN_CHARACTER = {
  id: 'a7c17d2e-92e3-4356-ac3c-19da94d8bc69',
  name: 'Sir Galahad',
  class: 'Paladin',
  level: 5
};

const FIGHTER_LEVEL5 = {
  id: '2caba658-ccf1-4042-b69f-113fab43fa80',
  name: 'Stress Test Hero',
  class: 'Fighter',
  level: 5
};

const FIGHTER_LEVEL1 = {
  id: '25c6d0b5-0190-4122-82c9-29e238637889',
  name: 'LevelTest_Fighter',
  class: 'Fighter',
  level: 1
};

test.describe('Combat Tab - Paladin Class Features', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await page.getByTestId('login-email').fill(TEST_USER.email);
    await page.getByTestId('login-password').fill(TEST_USER.password);
    await page.getByTestId('login-btn').click();
    await page.waitForURL(/\/home/, { timeout: 15000 });
    
    // Navigate to Paladin character
    await page.goto(`/characters/${PALADIN_CHARACTER.id}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('character-sheet-full')).toBeVisible({ timeout: 10000 });
    
    // Click Combat tab and wait for content
    await page.getByTestId('tab-combat').click();
    await expect(page.getByRole('heading', { name: 'ACTIONS', exact: true })).toBeVisible({ timeout: 5000 });
  });

  test('should display Paladin class actions (Divine Sense, Lay on Hands, Channel Divinity)', async ({ page }) => {
    // Check CLASS ACTIONS section exists
    await expect(page.getByText('CLASS ACTIONS')).toBeVisible();
    
    // Divine Sense - Level 1 action
    await expect(page.getByText('Divine Sense')).toBeVisible();
    await expect(page.getByText(/Detect celestials, fiends, and undead/i)).toBeVisible();
    
    // Lay on Hands - Level 1 action
    await expect(page.getByText('Lay on Hands')).toBeVisible();
    await expect(page.getByText(/Heal HP from a pool/i)).toBeVisible();
    
    // Channel Divinity - Level 3 action (Level 5 Paladin should have it)
    await expect(page.getByText('Channel Divinity')).toBeVisible();
    await expect(page.getByText(/Sacred Weapon|Turn the Unholy/i)).toBeVisible();
  });

  test('should display Divine Smite as an attack modifier', async ({ page }) => {
    // Check ATTACK MODIFIERS section
    await expect(page.getByText('ATTACK MODIFIERS')).toBeVisible();
    
    // Divine Smite - Level 2 action modifier
    await expect(page.getByText('Divine Smite')).toBeVisible();
    await expect(page.getByText(/Expend spell slot.*radiant damage/i)).toBeVisible();
  });

  test('should display Paladin passive abilities (Fighting Style, Divine Health, Extra Attack)', async ({ page }) => {
    // Check PASSIVE ABILITIES section
    await expect(page.getByText('PASSIVE ABILITIES')).toBeVisible();
    
    // Fighting Style - Level 2 passive
    await expect(page.getByText('Fighting Style', { exact: true })).toBeVisible();
    
    // Divine Health - Level 3 passive
    await expect(page.getByText('Divine Health')).toBeVisible();
    await expect(page.getByText(/Immune to disease/i)).toBeVisible();
    
    // Extra Attack - Level 5 passive
    await expect(page.getByText('Extra Attack')).toBeVisible();
    await expect(page.getByText(/Attack twice/i)).toBeVisible();
  });

  test('should show "No class bonus actions at this level" for Paladin', async ({ page }) => {
    // Paladin has no bonus actions from classFeatures.js
    await expect(page.getByText(/No class bonus actions at this level/i)).toBeVisible();
  });

  test('should display spellcasting information for Paladin', async ({ page }) => {
    // Check spell attack and save DC are shown
    await expect(page.getByText('CAST A SPELL')).toBeVisible();
    await expect(page.getByText('Spell Attack')).toBeVisible();
    await expect(page.getByText('Save DC')).toBeVisible();
  });
});

test.describe('Combat Tab - Fighter Level 5 Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await page.getByTestId('login-email').fill(TEST_USER.email);
    await page.getByTestId('login-password').fill(TEST_USER.password);
    await page.getByTestId('login-btn').click();
    await page.waitForURL(/\/home/, { timeout: 15000 });
    
    await page.goto(`/characters/${FIGHTER_LEVEL5.id}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('character-sheet-full')).toBeVisible({ timeout: 10000 });
    await page.getByTestId('tab-combat').click();
    await expect(page.getByRole('heading', { name: 'ACTIONS', exact: true })).toBeVisible({ timeout: 5000 });
  });

  test('should display Action Surge as a class action', async ({ page }) => {
    // Action Surge - Level 2 special action
    await expect(page.getByText('CLASS ACTIONS')).toBeVisible();
    await expect(page.getByText('Action Surge')).toBeVisible();
    await expect(page.getByText(/Take one additional action/i)).toBeVisible();
    await expect(page.getByText('1/short rest').first()).toBeVisible();
  });

  test('should display Second Wind as a bonus action', async ({ page }) => {
    // Second Wind - Level 1 bonus action
    await expect(page.getByText('CLASS FEATURES').first()).toBeVisible();
    await expect(page.getByText('Second Wind')).toBeVisible();
    await expect(page.getByText(/Regain 1d10.*fighter level HP/i)).toBeVisible();
  });

  test('should display Fighter passive abilities (Fighting Style, Extra Attack)', async ({ page }) => {
    await expect(page.getByText('PASSIVE ABILITIES')).toBeVisible();
    
    // Fighting Style - Level 1 passive
    await expect(page.getByText('Fighting Style', { exact: true })).toBeVisible();
    
    // Extra Attack - Level 5 passive  
    await expect(page.getByText('Extra Attack')).toBeVisible();
    await expect(page.getByText(/Attack twice/i)).toBeVisible();
  });

  test('should NOT display Indomitable for Level 5 Fighter (Level 9 feature)', async ({ page }) => {
    // Indomitable is a Level 9 feature, should not appear
    await expect(page.getByText('Indomitable')).not.toBeVisible();
  });
});

test.describe('Combat Tab - Fighter Level 1 (Level Filtering)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await page.getByTestId('login-email').fill(TEST_USER.email);
    await page.getByTestId('login-password').fill(TEST_USER.password);
    await page.getByTestId('login-btn').click();
    await page.waitForURL(/\/home/, { timeout: 15000 });
    
    await page.goto(`/characters/${FIGHTER_LEVEL1.id}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('character-sheet-full')).toBeVisible({ timeout: 10000 });
    await page.getByTestId('tab-combat').click();
    await expect(page.getByRole('heading', { name: 'ACTIONS', exact: true })).toBeVisible({ timeout: 5000 });
  });

  test('should display Level 1 features only for Level 1 Fighter', async ({ page }) => {
    // Second Wind - Level 1 bonus action (should be visible)
    await expect(page.getByText('Second Wind')).toBeVisible();
    
    // Fighting Style - Level 1 passive (should be visible)
    await expect(page.getByText('Fighting Style', { exact: true })).toBeVisible();
  });

  test('should NOT display Action Surge for Level 1 Fighter (Level 2 feature)', async ({ page }) => {
    // Action Surge is Level 2, should not appear for Level 1
    await expect(page.getByText('Action Surge')).not.toBeVisible();
  });

  test('should NOT display Extra Attack for Level 1 Fighter (Level 5 feature)', async ({ page }) => {
    // Extra Attack is Level 5, should not appear for Level 1
    await expect(page.getByText('Extra Attack')).not.toBeVisible();
  });

  test('should NOT display Indomitable for Level 1 Fighter (Level 9 feature)', async ({ page }) => {
    // Indomitable is Level 9, should not appear for Level 1
    await expect(page.getByText('Indomitable')).not.toBeVisible();
  });
});

test.describe('Combat Tab - Standard Actions (All Characters)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await page.getByTestId('login-email').fill(TEST_USER.email);
    await page.getByTestId('login-password').fill(TEST_USER.password);
    await page.getByTestId('login-btn').click();
    await page.waitForURL(/\/home/, { timeout: 15000 });
    
    await page.goto(`/characters/${FIGHTER_LEVEL5.id}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('character-sheet-full')).toBeVisible({ timeout: 10000 });
    await page.getByTestId('tab-combat').click();
    await expect(page.getByRole('heading', { name: 'ACTIONS', exact: true })).toBeVisible({ timeout: 5000 });
  });

  test('should always display standard actions for all characters', async ({ page }) => {
    await expect(page.getByText('STANDARD ACTIONS')).toBeVisible();
    
    // All standard D&D 5e actions
    await expect(page.getByText('Dash')).toBeVisible();
    await expect(page.getByText(/Double movement/i)).toBeVisible();
    
    await expect(page.getByText('Disengage')).toBeVisible();
    await expect(page.getByText(/No opportunity attacks/i)).toBeVisible();
    
    await expect(page.getByText('Dodge')).toBeVisible();
    await expect(page.getByText(/Attacks have disadvantage/i)).toBeVisible();
    
    await expect(page.getByText('Help')).toBeVisible();
    await expect(page.getByText('Hide')).toBeVisible();
    await expect(page.getByText('Ready')).toBeVisible();
  });

  test('should always display Opportunity Attack reaction', async ({ page }) => {
    await expect(page.getByText('Opportunity Attack', { exact: true })).toBeVisible();
    await expect(page.getByText(/When enemy leaves your reach/i)).toBeVisible();
  });
});

test.describe('Combat Tab - Combat Resources', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await page.getByTestId('login-email').fill(TEST_USER.email);
    await page.getByTestId('login-password').fill(TEST_USER.password);
    await page.getByTestId('login-btn').click();
    await page.waitForURL(/\/home/, { timeout: 15000 });
    
    await page.goto(`/characters/${FIGHTER_LEVEL5.id}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('character-sheet-full')).toBeVisible({ timeout: 10000 });
    await page.getByTestId('tab-combat').click();
    await expect(page.getByRole('heading', { name: 'ACTIONS', exact: true })).toBeVisible({ timeout: 5000 });
  });

  test('should display combat resources section', async ({ page }) => {
    await expect(page.getByText('COMBAT RESOURCES')).toBeVisible();
    
    // Hit Dice
    await expect(page.getByText('Hit Dice')).toBeVisible();
    
    // Temp HP
    await expect(page.getByText('Temp HP')).toBeVisible();
    
    // Death Saves
    await expect(page.getByText('Death Saves')).toBeVisible();
    await expect(page.getByText('Pass', { exact: true })).toBeVisible();
    await expect(page.getByText('Fail', { exact: true })).toBeVisible();
  });

  test('should display conditions section', async ({ page }) => {
    await expect(page.getByText('CONDITIONS')).toBeVisible();
    // Default should show "None" when no conditions
    await expect(page.getByText('None')).toBeVisible();
  });
});

test.describe('Combat Tab - Three Column Layout', () => {
  test('should display Combat tab with three columns: Actions, Bonus Actions, Reactions', async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await page.getByTestId('login-email').fill(TEST_USER.email);
    await page.getByTestId('login-password').fill(TEST_USER.password);
    await page.getByTestId('login-btn').click();
    await page.waitForURL(/\/home/, { timeout: 15000 });
    
    await page.goto(`/characters/${PALADIN_CHARACTER.id}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('character-sheet-full')).toBeVisible({ timeout: 10000 });
    await page.getByTestId('tab-combat').click();
    
    // Verify all three column headers are visible using exact match
    await expect(page.getByRole('heading', { name: 'ACTIONS', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'BONUS ACTIONS', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'REACTIONS', exact: true })).toBeVisible();
  });
});

test.describe('Combat Tab - Use Tracking Display', () => {
  test('should display uses/rest information for limited abilities', async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await page.getByTestId('login-email').fill(TEST_USER.email);
    await page.getByTestId('login-password').fill(TEST_USER.password);
    await page.getByTestId('login-btn').click();
    await page.waitForURL(/\/home/, { timeout: 15000 });
    
    // Check Paladin for uses display
    await page.goto(`/characters/${PALADIN_CHARACTER.id}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('character-sheet-full')).toBeVisible({ timeout: 10000 });
    await page.getByTestId('tab-combat').click();
    await expect(page.getByRole('heading', { name: 'ACTIONS', exact: true })).toBeVisible({ timeout: 5000 });
    
    // Divine Sense has uses per long rest
    await expect(page.getByText(/long rest/i).first()).toBeVisible();
    
    // Channel Divinity has uses per short rest
    await expect(page.getByText(/short rest/i).first()).toBeVisible();
  });
});
