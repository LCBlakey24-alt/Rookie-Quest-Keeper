import { test, expect } from '@playwright/test';
import { waitForAppReady, dismissToasts, removeBlockingBadges } from '../fixtures/helpers';

// Test user credentials (pre-registered)
const AI_TEST_USER = {
  email: 'aitest@test.com',
  password: 'test123456'
};

test.describe('AI Character Generation - Unseen Servant in Character Builder', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    
    // Login with test user
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await page.getByTestId('login-email').fill(AI_TEST_USER.email);
    await page.getByTestId('login-password').fill(AI_TEST_USER.password);
    await page.getByTestId('login-btn').click();
    
    // Wait for authentication to complete
    await expect(page).toHaveURL(/\/campaigns|\/characters/, { timeout: 15000 });
    
    // Navigate to character builder
    await page.goto('/characters/new', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await removeBlockingBadges(page);
  });

  test('Character Builder page loads with Unseen Servant panel', async ({ page }) => {
    // Verify page header
    await expect(page.getByRole('heading', { name: 'Create Character' })).toBeVisible();
    await expect(page.getByText('Step 1 of 4')).toBeVisible();
    
    // Verify Unseen Servant panel
    await expect(page.getByText('Unseen Servant')).toBeVisible();
    await expect(page.getByText('Let AI create your character concept')).toBeVisible();
  });

  test('Unseen Servant panel has prompt textarea', async ({ page }) => {
    const promptTextarea = page.getByTestId('ai-character-prompt');
    await expect(promptTextarea).toBeVisible();
    
    // Check placeholder text
    await expect(promptTextarea).toHaveAttribute('placeholder', /mysterious elven wizard/i);
  });

  test('Quick suggestion buttons are visible', async ({ page }) => {
    // Verify quick idea buttons exist
    await expect(page.getByTestId('ai-suggestion-0')).toBeVisible();
    await expect(page.getByTestId('ai-suggestion-1')).toBeVisible();
    await expect(page.getByTestId('ai-suggestion-2')).toBeVisible();
    await expect(page.getByTestId('ai-suggestion-3')).toBeVisible();
    await expect(page.getByTestId('ai-suggestion-4')).toBeVisible();
    
    // Verify suggestion texts
    await expect(page.getByText('A sneaky rogue who uses a bow and has a dark past')).toBeVisible();
    await expect(page.getByText('A holy warrior seeking redemption for past sins')).toBeVisible();
    await expect(page.getByText('A scholarly wizard obsessed with ancient secrets')).toBeVisible();
  });

  test('Quick suggestion button populates textarea', async ({ page }) => {
    const promptTextarea = page.getByTestId('ai-character-prompt');
    
    // Click a quick suggestion
    await page.getByTestId('ai-suggestion-0').click();
    
    // Verify textarea is populated
    await expect(promptTextarea).toHaveValue('A sneaky rogue who uses a bow and has a dark past');
  });

  test('Generate button is disabled when textarea is empty', async ({ page }) => {
    const generateBtn = page.getByTestId('ai-generate-btn');
    
    // Verify button is disabled when no text
    await expect(generateBtn).toBeDisabled();
    
    // Enter text
    await page.getByTestId('ai-character-prompt').fill('A brave warrior');
    
    // Button should now be enabled
    await expect(generateBtn).toBeEnabled();
  });

  test('Generate button shows error for short description', async ({ page }) => {
    // Fill with short description (less than 10 characters)
    await page.getByTestId('ai-character-prompt').fill('short');
    
    // Click generate
    await page.getByTestId('ai-generate-btn').click({ force: true });
    
    // Verify error toast appears (use first() to avoid strict mode with title + description)
    await expect(page.getByText('Description too short').first()).toBeVisible({ timeout: 5000 });
  });

  test('AI generates character and populates form fields', async ({ page }) => {
    // Use a quick suggestion
    await page.getByTestId('ai-suggestion-0').click();
    
    // Click generate
    const generateBtn = page.getByTestId('ai-generate-btn');
    await expect(generateBtn).toBeEnabled();
    await generateBtn.click();
    
    // Wait for generation (button text changes to "Summoning Character...")
    await expect(page.getByText('Summoning Character...')).toBeVisible({ timeout: 10000 });
    
    // Wait for success toast (AI generation takes time) - use first() for strict mode
    await expect(page.locator('[data-sonner-toast]').filter({ hasText: /manifested/ }).first()).toBeVisible({ timeout: 90000 });
    
    // Panel should turn green (indicated by success message in panel)
    await expect(page.getByTestId('ai-panel-toggle').getByText('Character generated! Review below')).toBeVisible();
    
    // Verify the character name field is populated (not default empty)
    const nameInput = page.locator('input[placeholder="Enter character name..."]');
    await expect(nameInput).not.toHaveValue('');
  });

  test('Panel can be collapsed and expanded', async ({ page }) => {
    // Verify panel is initially expanded
    await expect(page.getByTestId('ai-character-prompt')).toBeVisible();
    
    // Click toggle to collapse
    await page.getByTestId('ai-panel-toggle').click();
    
    // Textarea should be hidden
    await expect(page.getByTestId('ai-character-prompt')).not.toBeVisible();
    
    // Click toggle again to expand
    await page.getByTestId('ai-panel-toggle').click();
    
    // Textarea should be visible again
    await expect(page.getByTestId('ai-character-prompt')).toBeVisible();
  });

  test('Character form fields have default values', async ({ page }) => {
    // Verify default dropdown values
    await expect(page.locator('select').filter({ hasText: 'Human' }).first()).toBeVisible();
    await expect(page.locator('select').filter({ hasText: 'Fighter' }).first()).toBeVisible();
  });
});
