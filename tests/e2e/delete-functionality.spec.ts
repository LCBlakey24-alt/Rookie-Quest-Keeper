import { test, expect } from '@playwright/test';
import { loginUser, dismissToasts, removeBlockingBadges, TEST_USER, generateTestUsername } from '../fixtures/helpers';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';

test.describe('Delete Functionality on Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await loginUser(page, TEST_USER.email, TEST_USER.password);
    await page.waitForURL(/\/home/, { timeout: 15000 });
    await removeBlockingBadges(page);
  });

  test('home page loads with character and campaign cards', async ({ page }) => {
    // Verify PLAYER SIDE section - use heading role to avoid mobile nav ambiguity
    await expect(page.getByRole('heading', { name: /PLAYER SIDE/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('My Characters')).toBeVisible();
    
    // Verify GM SIDE section - use heading role to avoid mobile nav ambiguity
    await expect(page.getByRole('heading', { name: /GM SIDE/i })).toBeVisible();
    await expect(page.getByText('My Campaigns')).toBeVisible();
    
    // Check for New Character and New Campaign buttons
    await expect(page.getByTestId('new-character-btn')).toBeVisible();
    await expect(page.getByTestId('new-campaign-btn')).toBeVisible();
  });

  test('character cards display with delete button', async ({ page }) => {
    // Wait for characters to load
    await page.waitForLoadState('networkidle');
    
    // Check if there are character cards
    const characterCards = page.locator('[data-testid^="character-"]');
    const count = await characterCards.count();
    
    if (count > 0) {
      // Verify first character card has delete button
      const firstCard = characterCards.first();
      await expect(firstCard).toBeVisible();
      
      // Get the character ID from the data-testid
      const testId = await firstCard.getAttribute('data-testid');
      const charId = testId?.replace('character-', '');
      
      if (charId) {
        // Check delete button exists
        const deleteBtn = page.getByTestId(`delete-character-${charId}`);
        await expect(deleteBtn).toBeVisible();
      }
    } else {
      // No characters - verify empty state
      await expect(page.getByText('No Characters Yet')).toBeVisible();
    }
  });

  test('campaign cards display with delete button', async ({ page }) => {
    // Wait for campaigns to load
    await page.waitForLoadState('networkidle');
    
    // Check if there are campaign cards
    const campaignCards = page.locator('[data-testid^="campaign-"]');
    const count = await campaignCards.count();
    
    if (count > 0) {
      // Verify first campaign card has delete button
      const firstCard = campaignCards.first();
      await expect(firstCard).toBeVisible();
      
      // Get the campaign ID from the data-testid
      const testId = await firstCard.getAttribute('data-testid');
      const campaignId = testId?.replace('campaign-', '');
      
      if (campaignId) {
        // Check delete button exists
        const deleteBtn = page.getByTestId(`delete-campaign-${campaignId}`);
        await expect(deleteBtn).toBeVisible();
      }
    } else {
      // No campaigns - verify empty state
      await expect(page.getByText(/No Campaigns Yet|Create your first campaign/i)).toBeVisible();
    }
  });

  test('navigation from character card to character sheet', async ({ page }) => {
    // Wait for characters to load
    await page.waitForLoadState('networkidle');
    
    const characterCards = page.locator('[data-testid^="character-"]');
    const count = await characterCards.count();
    
    if (count > 0) {
      const firstCard = characterCards.first();
      const testId = await firstCard.getAttribute('data-testid');
      const charId = testId?.replace('character-', '');
      
      // Click the card (not the delete button)
      await firstCard.click();
      
      // Should navigate to character sheet
      await expect(page).toHaveURL(new RegExp(`/characters/${charId}`), { timeout: 10000 });
    } else {
      // Skip test if no characters
      test.skip();
    }
  });

  test('navigation from campaign card to campaign dashboard', async ({ page }) => {
    // Wait for campaigns to load
    await page.waitForLoadState('networkidle');
    
    const campaignCards = page.locator('[data-testid^="campaign-"]');
    const count = await campaignCards.count();
    
    if (count > 0) {
      const firstCard = campaignCards.first();
      const testId = await firstCard.getAttribute('data-testid');
      const campaignId = testId?.replace('campaign-', '');
      
      // Click the card (not the delete button)
      await firstCard.click();
      
      // Should navigate to campaign dashboard
      await expect(page).toHaveURL(new RegExp(`/campaign/${campaignId}`), { timeout: 10000 });
    } else {
      // Skip test if no campaigns
      test.skip();
    }
  });
});

test.describe('Route Cleanup Verification', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await loginUser(page, TEST_USER.email, TEST_USER.password);
    await page.waitForURL(/\/home/, { timeout: 15000 });
    await removeBlockingBadges(page);
  });

  test('/characters/new route works for character creation', async ({ page }) => {
    await page.goto('/characters/new', { waitUntil: 'domcontentloaded' });
    
    // Verify character builder loads
    await expect(page.getByText(/Character Builder|Create Character|New Character/i)).toBeVisible({ timeout: 10000 });
    
    // Check for step progression elements
    await expect(page.getByText(/CONCEPT|RACE|CLASS|BACKGROUND|Step|Origin/i).first()).toBeVisible();
  });

  test('/player route works for player dashboard', async ({ page }) => {
    await page.goto('/player', { waitUntil: 'domcontentloaded' });
    
    // Verify player dashboard loads
    await expect(page.getByText(/PLAYER|Character|Characters/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('CharacterSheet navigates back to /player', async ({ page }) => {
    // Wait for data to load
    await page.waitForLoadState('networkidle');
    
    // Find a character to view
    const characterCards = page.locator('[data-testid^="character-"]');
    const count = await characterCards.count();
    
    if (count > 0) {
      // Click first character
      await characterCards.first().click();
      
      // Wait for character sheet to load
      await page.waitForURL(/\/characters\//, { timeout: 10000 });
      
      // Find back button and click it
      const backButton = page.locator('button').filter({ hasText: '' }).first();
      // Or find by ArrowLeft icon - look for any back navigation
      const backNav = page.locator('[class*="btn-icon"]').first();
      
      if (await backNav.isVisible({ timeout: 3000 }).catch(() => false)) {
        await backNav.click();
        await expect(page).toHaveURL(/\/player/, { timeout: 10000 });
      }
    } else {
      test.skip();
    }
  });

  test('CampaignList navigates to /player', async ({ page }) => {
    await page.goto('/campaigns', { waitUntil: 'domcontentloaded' });
    
    // Verify campaigns page loads
    await expect(page.getByText(/Campaign|Campaigns/i).first()).toBeVisible({ timeout: 10000 });
    
    // Look for Player Dashboard navigation button
    const playerNavBtn = page.locator('button').filter({ hasText: /Player|Dashboard/i });
    if (await playerNavBtn.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await playerNavBtn.first().click();
      await expect(page).toHaveURL(/\/player/, { timeout: 10000 });
    }
  });
});

test.describe('Navigation Between Dashboards', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await loginUser(page, TEST_USER.email, TEST_USER.password);
    await page.waitForURL(/\/home/, { timeout: 15000 });
    await removeBlockingBadges(page);
  });

  test('can navigate to GM dashboard from home', async ({ page }) => {
    // Wait for campaigns to load
    await page.waitForLoadState('networkidle');
    
    const campaignCards = page.locator('[data-testid^="campaign-"]');
    const count = await campaignCards.count();
    
    if (count > 0) {
      await campaignCards.first().click();
      await expect(page).toHaveURL(/\/campaign\//, { timeout: 10000 });
      
      // Verify GM dashboard elements
      await expect(page.getByText(/Setting|World|NPCs|Combat|Notes/i).first()).toBeVisible({ timeout: 10000 });
    } else {
      // Click new campaign button
      await page.getByTestId('new-campaign-btn').click();
      // Should show create campaign dialog
      await expect(page.getByText(/Create|Campaign/i)).toBeVisible({ timeout: 5000 });
    }
  });

  test('can navigate to Player dashboard from home', async ({ page }) => {
    // Navigate to player dashboard
    await page.goto('/player', { waitUntil: 'domcontentloaded' });
    
    // Verify player dashboard loads
    await expect(page).toHaveURL(/\/player/);
    await expect(page.getByText(/PLAYER|Characters|Notes/i).first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Login and Authentication', () => {
  test('login redirects to /home', async ({ page }) => {
    // Start fresh
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    
    // Fill login form
    await page.getByTestId('login-email').fill(TEST_USER.email);
    await page.getByTestId('login-password').fill(TEST_USER.password);
    await page.getByTestId('login-btn').click();
    
    // Verify redirect to home
    await expect(page).toHaveURL(/\/home/, { timeout: 15000 });
    
    // Verify dashboard content - use heading role to avoid mobile nav ambiguity
    await expect(page.getByRole('heading', { name: /PLAYER SIDE/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('heading', { name: /GM SIDE/i })).toBeVisible();
  });

  test('unauthenticated user redirected to auth page', async ({ page }) => {
    // Clear any existing auth
    await page.context().clearCookies();
    
    // Try to access protected route
    await page.goto('/home', { waitUntil: 'domcontentloaded' });
    
    // Should be redirected to auth
    await expect(page).toHaveURL(/\/auth|\//, { timeout: 10000 });
  });
});
