import { test, expect } from '@playwright/test';
import { waitForAppReady, dismissToasts, removeBlockingBadges, loginTestUser, TEST_USER, TEST_CAMPAIGN_ID } from '../fixtures/helpers';

test.describe('Session Mode Feature', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
  });

  test('Session Mode route /campaign/:campaignId/session loads correctly', async ({ page }) => {
    // Login first
    await loginTestUser(page);
    
    // Navigate directly to Session Mode
    await page.goto(`/campaign/${TEST_CAMPAIGN_ID}/session`, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    
    // Verify Session Mode page loaded
    await expect(page.getByTestId('session-mode-page')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('session-mode-title')).toHaveText('SESSION MODE');
  });

  test('Session Mode has Initiative Tracker section', async ({ page }) => {
    await loginTestUser(page);
    await page.goto(`/campaign/${TEST_CAMPAIGN_ID}/session`, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    
    // Verify Initiative Tracker elements
    await expect(page.getByText('Initiative Tracker')).toBeVisible();
    await expect(page.getByTestId('combat-toggle-btn')).toBeVisible();
    await expect(page.getByTestId('next-turn-btn')).toBeVisible();
    
    // Verify add combatant form
    await expect(page.getByTestId('add-combatant-form')).toBeVisible();
    await expect(page.getByTestId('combatant-name-input')).toBeVisible();
    await expect(page.getByTestId('combatant-initiative-input')).toBeVisible();
    await expect(page.getByTestId('combatant-hp-input')).toBeVisible();
    await expect(page.getByTestId('combatant-ac-input')).toBeVisible();
    await expect(page.getByTestId('add-combatant-btn')).toBeVisible();
  });

  test('Session Mode has Dice Roller section', async ({ page }) => {
    await loginTestUser(page);
    await page.goto(`/campaign/${TEST_CAMPAIGN_ID}/session`, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    
    // Verify dice roller section
    await expect(page.getByTestId('dice-roller-section')).toBeVisible();
    await expect(page.getByText('Quick Dice')).toBeVisible();
    
    // Verify dice buttons (d4, d6, d8, d10, d12, d20, d100, ADV)
    await expect(page.getByTestId('dice-d4')).toBeVisible();
    await expect(page.getByTestId('dice-d6')).toBeVisible();
    await expect(page.getByTestId('dice-d8')).toBeVisible();
    await expect(page.getByTestId('dice-d20')).toBeVisible();
    await expect(page.getByTestId('dice-d100')).toBeVisible();
    await expect(page.getByTestId('dice-adv')).toBeVisible();
  });

  test('Dice roller actually rolls and displays result', async ({ page }) => {
    await loginTestUser(page);
    await page.goto(`/campaign/${TEST_CAMPAIGN_ID}/session`, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    
    // Click d20 button
    await page.getByTestId('dice-d20').click();
    
    // Verify dice result appears
    await expect(page.getByTestId('dice-result')).toBeVisible();
    await expect(page.getByTestId('dice-total')).toBeVisible();
    
    // Total should be a number between 1 and 20
    const totalText = await page.getByTestId('dice-total').textContent();
    const total = parseInt(totalText || '0');
    expect(total).toBeGreaterThanOrEqual(1);
    expect(total).toBeLessThanOrEqual(20);
  });

  test('Session Mode has Session Notes section', async ({ page }) => {
    await loginTestUser(page);
    await page.goto(`/campaign/${TEST_CAMPAIGN_ID}/session`, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    
    // Verify session notes section
    await expect(page.getByTestId('session-notes-section')).toBeVisible();
    await expect(page.getByText('Session Notes')).toBeVisible();
    await expect(page.getByTestId('session-note-input')).toBeVisible();
    await expect(page.getByTestId('save-note-btn')).toBeVisible();
  });

  test('Session Mode has Conditions Reference section', async ({ page }) => {
    await loginTestUser(page);
    await page.goto(`/campaign/${TEST_CAMPAIGN_ID}/session`, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    
    // Verify conditions section
    await expect(page.getByTestId('conditions-section')).toBeVisible();
    await expect(page.getByText('Conditions')).toBeVisible();
    await expect(page.getByTestId('conditions-list')).toBeVisible();
    
    // Verify some standard D&D conditions are listed (use exact match)
    await expect(page.getByText('Blinded')).toBeVisible();
    await expect(page.getByText('Prone', { exact: true })).toBeVisible();
  });

  test('Can add combatant to initiative tracker', async ({ page }) => {
    await loginTestUser(page);
    await page.goto(`/campaign/${TEST_CAMPAIGN_ID}/session`, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    
    // Add a combatant
    await page.getByTestId('combatant-name-input').fill('Test Goblin');
    await page.getByTestId('combatant-initiative-input').fill('15');
    await page.getByTestId('combatant-hp-input').fill('7');
    await page.getByTestId('combatant-ac-input').fill('13');
    await page.getByTestId('add-combatant-btn').click();
    
    // Verify combatant appears in list
    await expect(page.getByText('Test Goblin')).toBeVisible();
    // The initiative value should be shown
    await expect(page.getByText('15')).toBeVisible();
  });

  test('Session back button navigates to campaign dashboard', async ({ page }) => {
    await loginTestUser(page);
    await page.goto(`/campaign/${TEST_CAMPAIGN_ID}/session`, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    
    await expect(page.getByTestId('session-back-btn')).toBeVisible();
    await page.getByTestId('session-back-btn').click();
    
    // Should navigate back to campaign dashboard
    await page.waitForURL(/\/campaign\//, { timeout: 10000 });
    // Should NOT be on session route anymore
    expect(page.url()).not.toContain('/session');
  });
});
