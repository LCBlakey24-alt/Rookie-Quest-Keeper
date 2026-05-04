import { test, expect } from '@playwright/test';
import { waitForAppReady, dismissToasts, removeBlockingBadges, TEST_USER, TEST_CAMPAIGN_ID, loginUser } from '../fixtures/helpers';

test.describe('Unseen Servant Auto-Save Features', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    
    // Login with test user
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await page.getByTestId('login-email').fill(TEST_USER.email);
    await page.getByTestId('login-password').fill(TEST_USER.password);
    await page.getByTestId('login-btn').click();
    await page.waitForURL(/\/campaigns/, { timeout: 15000 });
    
    // Navigate to test campaign
    await page.goto(`/campaign/${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await removeBlockingBadges(page);
  });

  test('Gods tab - Unseen Servant panel is visible with correct UI', async ({ page }) => {
    // Navigate to Gods tab
    await page.getByTestId('gods-tab').click();
    await expect(page.getByRole('heading', { name: 'Pantheon' })).toBeVisible();
    
    // Verify Unseen Servant panel elements
    await expect(page.getByText('Unseen Servant').first()).toBeVisible();
    await expect(page.getByTestId('unseen-servant-god-prompt')).toBeVisible();
    await expect(page.getByTestId('summon-god-btn')).toBeVisible();
    
    // Verify placeholder text is descriptive
    const promptTextarea = page.getByTestId('unseen-servant-god-prompt');
    await expect(promptTextarea).toHaveAttribute('placeholder', /mysterious god of shadows/i);
  });

  test('NPCs tab - Unseen Servant panel is visible with correct UI', async ({ page }) => {
    // Navigate to NPCs tab
    await page.getByTestId('npcs-tab').click();
    await expect(page.getByRole('heading', { name: 'NPCs' })).toBeVisible();
    
    // Verify Unseen Servant panel elements
    await expect(page.getByText('Unseen Servant').first()).toBeVisible();
    await expect(page.getByTestId('unseen-servant-npc-prompt')).toBeVisible();
    await expect(page.getByTestId('summon-npc-btn')).toBeVisible();
    
    // Verify placeholder text
    const promptTextarea = page.getByTestId('unseen-servant-npc-prompt');
    await expect(promptTextarea).toHaveAttribute('placeholder', /grizzled dwarven blacksmith/i);
  });

  test('Locations tab - Unseen Servant has Location and Place toggle', async ({ page }) => {
    // Navigate to Locations tab
    await page.getByTestId('locations-tab').click();
    await expect(page.getByRole('heading', { name: 'Locations' })).toBeVisible();
    
    // Verify Unseen Servant panel
    await expect(page.getByText('Unseen Servant').first()).toBeVisible();
    
    // Verify toggle buttons for Location vs Place
    await expect(page.getByRole('button', { name: /Location/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Place/i }).first()).toBeVisible();
    
    // Verify prompt and summon button
    await expect(page.getByTestId('unseen-servant-location-prompt')).toBeVisible();
    await expect(page.getByTestId('summon-location-btn')).toBeVisible();
  });

  test('Gods tab - Summon button shows validation error without prompt', async ({ page }) => {
    // Navigate to Gods tab
    await page.getByTestId('gods-tab').click();
    await expect(page.getByTestId('summon-god-btn')).toBeVisible();
    
    // Click summon without entering prompt
    await page.getByTestId('summon-god-btn').click();
    
    // Should show error toast
    await expect(page.getByText(/describe the deity|please describe/i)).toBeVisible({ timeout: 5000 });
  });

  test('NPCs tab - Summon button shows validation error without prompt', async ({ page }) => {
    // Navigate to NPCs tab
    await page.getByTestId('npcs-tab').click();
    await expect(page.getByTestId('summon-npc-btn')).toBeVisible();
    
    // Click summon without entering prompt
    await page.getByTestId('summon-npc-btn').click();
    
    // Should show error toast
    await expect(page.getByText(/describe the NPC|please describe/i)).toBeVisible({ timeout: 5000 });
  });

  test('Locations tab - Summon button shows validation error without prompt', async ({ page }) => {
    // Navigate to Locations tab
    await page.getByTestId('locations-tab').click();
    await expect(page.getByTestId('summon-location-btn')).toBeVisible();
    
    // Click summon without entering prompt
    await page.getByTestId('summon-location-btn').click();
    
    // Should show error toast
    await expect(page.getByText(/describe what you want|please describe/i)).toBeVisible({ timeout: 5000 });
  });

  test('Campaign Setting tab - Unseen Servant panel is visible', async ({ page }) => {
    // Setting tab is shown by default
    await expect(page.getByRole('heading', { name: 'Campaign Setting' })).toBeVisible();
    
    // Verify Unseen Servant panel
    await expect(page.getByText('Unseen Servant').first()).toBeVisible();
    await expect(page.getByTestId('ai-setting-prompt')).toBeVisible();
    await expect(page.getByTestId('generate-setting-btn')).toBeVisible();
  });

  test('Unseen Servant renamed from AI Assistant throughout app', async ({ page }) => {
    // Check Gods tab
    await page.getByTestId('gods-tab').click();
    await expect(page.getByText('Unseen Servant').first()).toBeVisible();
    // AI Assistant should NOT be visible
    await expect(page.getByText('AI Assistant')).not.toBeVisible();
    
    // Check NPCs tab
    await page.getByTestId('npcs-tab').click();
    await expect(page.getByText('Unseen Servant').first()).toBeVisible();
    await expect(page.getByText('AI Assistant')).not.toBeVisible();
    
    // Check Locations tab
    await page.getByTestId('locations-tab').click();
    await expect(page.getByText('Unseen Servant').first()).toBeVisible();
    await expect(page.getByText('AI Assistant')).not.toBeVisible();
    
    // Check Campaign Setting tab
    await page.getByTestId('setting-tab').click();
    await expect(page.getByText('Unseen Servant').first()).toBeVisible();
    await expect(page.getByText('AI Assistant')).not.toBeVisible();
  });
});
