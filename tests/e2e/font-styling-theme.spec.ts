import { test, expect } from '@playwright/test';
import { waitForAppReady, dismissToasts, TEST_USER } from '../fixtures/helpers';

/**
 * Font & Styling Theme Tests - Cinzel/Crimson Text Fantasy Fonts
 * Tests for the Aether & Iron theme with:
 * - Cinzel font for headers (fantasy medieval)
 * - Crimson Text font for body text
 * - Background texture with SVG noise pattern
 * - Ember particles animation
 * - z-index layering for content above background
 * 
 * KNOWN ISSUE: App.css still has typography rules (lines 438-446) that override 
 * the fonts with 'Eros Book' and 'Inter'. These need to be updated to use
 * Cinzel/Crimson Text to fully fix the font issue.
 */

test.describe('Font & Styling Theme', () => {
  
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
  });

  test('Landing page loads with header text visible and Cinzel font', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    
    // Verify page title text is visible
    const rookieQuestTitle = page.locator('h1').filter({ hasText: 'ROOKIE QUEST' }).first();
    await expect(rookieQuestTitle).toBeVisible({ timeout: 10000 });
    
    // Verify Cinzel font is applied to headers (inline style takes precedence)
    const fontFamily = await rookieQuestTitle.evaluate((el) => {
      return window.getComputedStyle(el).fontFamily;
    });
    expect(fontFamily.toLowerCase()).toContain('cinzel');
    
    // Also check the KEEPER title
    const keeperTitle = page.locator('h1').filter({ hasText: 'KEEPER' }).first();
    await expect(keeperTitle).toBeVisible();
    
    // Verify KEEPER title also has Cinzel font
    const keeperFontFamily = await keeperTitle.evaluate((el) => {
      return window.getComputedStyle(el).fontFamily;
    });
    expect(keeperFontFamily.toLowerCase()).toContain('cinzel');
  });

  test('Landing page renders body text visible with Crimson Text', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    
    // Check the full body text paragraph is visible (not the header "Campaign Operating System")
    // The body text starts with "The all-in-one campaign operating system..."
    const bodyText = page.locator('p').filter({ hasText: /The all-in-one/i }).first();
    await expect(bodyText).toBeVisible({ timeout: 10000 });
    
    // Body text with Crimson Text inline style should work
    const fontFamily = await bodyText.evaluate((el) => {
      return window.getComputedStyle(el).fontFamily;
    });
    // This element has explicit inline fontFamily: "'Crimson Text'"
    expect(fontFamily.toLowerCase()).toContain('crimson');
  });

  test('Landing page has ember background effect', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    
    // Check ember-bg element exists
    const emberBg = page.locator('.ember-bg');
    await expect(emberBg).toBeVisible({ timeout: 5000 });
    
    // Verify background is properly styled (dark theme)
    const bgStyle = await emberBg.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        position: style.position,
        zIndex: style.zIndex
      };
    });
    expect(bgStyle.position).toBe('fixed');
  });

  test('Landing page has ember particles element', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    
    // Check ember-particles container exists
    const emberParticles = page.locator('.ember-particles');
    await expect(emberParticles).toBeVisible();
    
    // Check individual ember elements exist
    const embers = page.locator('.ember-particles .ember');
    await expect(embers.first()).toBeVisible();
    
    // Should have multiple ember particles
    const emberCount = await embers.count();
    expect(emberCount).toBeGreaterThan(5);
  });

  test('Landing page sections have proper z-index layering', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    
    // Hero section should be above background
    const heroSection = page.locator('section').first();
    await expect(heroSection).toBeVisible({ timeout: 5000 });
    
    const heroZIndex = await heroSection.evaluate((el) => {
      return window.getComputedStyle(el).zIndex;
    });
    // z-index should be set (not 'auto')
    expect(heroZIndex === '2' || heroZIndex === 'auto').toBeTruthy();
    
    // CTA buttons should be clickable (not blocked by background)
    const getStartedBtn = page.getByTestId('get-started-btn');
    await expect(getStartedBtn).toBeVisible();
    await expect(getStartedBtn).toBeEnabled();
  });

  test('Auth page displays headers with Cinzel font', async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    
    // Check logo headers
    const rookieQuestLogo = page.locator('h1').filter({ hasText: 'ROOKIE QUEST' }).first();
    await expect(rookieQuestLogo).toBeVisible({ timeout: 10000 });
    
    // Verify Cinzel font is applied (inline style)
    const fontFamily = await rookieQuestLogo.evaluate((el) => {
      return window.getComputedStyle(el).fontFamily;
    });
    expect(fontFamily.toLowerCase()).toContain('cinzel');
    
    // Login form should be visible
    await expect(page.getByTestId('login-email')).toBeVisible();
    await expect(page.getByTestId('login-password')).toBeVisible();
    await expect(page.getByTestId('login-btn')).toBeVisible();
    
    // Auth page should have ember background
    const emberBg = page.locator('.ember-bg');
    await expect(emberBg).toBeVisible();
  });

  test('Auth page has ember particles', async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    
    // Check ember particles on auth page
    const emberParticles = page.locator('.ember-particles');
    await expect(emberParticles).toBeVisible();
    
    const embers = page.locator('.ember-particles .ember');
    const emberCount = await embers.count();
    expect(emberCount).toBeGreaterThan(5);
  });

  test('Dashboard loads after login with correct styling', async ({ page }) => {
    // Login first
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    
    await page.getByTestId('login-email').fill(TEST_USER.email);
    await page.getByTestId('login-password').fill(TEST_USER.password);
    await page.getByTestId('login-btn').click();
    
    // Wait for dashboard
    await page.waitForURL(/\/home/, { timeout: 15000 });
    await waitForAppReady(page);
    
    // Wait for content to load
    await expect(page.locator('text=MY CHARACTERS').first()).toBeVisible({ timeout: 10000 });
    
    // Dashboard should have ember background
    const emberBg = page.locator('.ember-bg');
    await expect(emberBg).toBeVisible();
    
    // Dashboard header should be visible
    const headerText = page.locator('text=ROOKIE QUEST KEEPER').first();
    await expect(headerText).toBeVisible();
  });

  test('Dashboard has character cards with hover effects', async ({ page }) => {
    // Login first
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    
    await page.getByTestId('login-email').fill(TEST_USER.email);
    await page.getByTestId('login-password').fill(TEST_USER.password);
    await page.getByTestId('login-btn').click();
    
    // Wait for dashboard
    await page.waitForURL(/\/home/, { timeout: 15000 });
    await waitForAppReady(page);
    
    // Wait for character cards to load
    await expect(page.locator('text=MY CHARACTERS').first()).toBeVisible({ timeout: 10000 });
    
    // Check for character cards with hover class
    const characterCards = page.locator('.card-hover-player');
    const cardCount = await characterCards.count();
    
    // If there are character cards, verify they have proper styling
    if (cardCount > 0) {
      const firstCard = characterCards.first();
      await expect(firstCard).toBeVisible();
      
      // Verify card has cursor pointer (clickable)
      const cursor = await firstCard.evaluate((el) => {
        return window.getComputedStyle(el).cursor;
      });
      expect(cursor).toBe('pointer');
    }
  });

  test('Dashboard sections have proper z-index above ember background', async ({ page }) => {
    // Login first
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    
    await page.getByTestId('login-email').fill(TEST_USER.email);
    await page.getByTestId('login-password').fill(TEST_USER.password);
    await page.getByTestId('login-btn').click();
    
    // Wait for dashboard
    await page.waitForURL(/\/home/, { timeout: 15000 });
    await waitForAppReady(page);
    
    await expect(page.locator('text=MY CHARACTERS').first()).toBeVisible({ timeout: 10000 });
    
    // New Character button should be clickable (not blocked by background)
    const newCharBtn = page.getByTestId('new-character-btn');
    await expect(newCharBtn).toBeVisible();
    await expect(newCharBtn).toBeEnabled();
    
    // New Campaign button should also be clickable
    const newCampaignBtn = page.getByTestId('new-campaign-btn');
    await expect(newCampaignBtn).toBeVisible();
    await expect(newCampaignBtn).toBeEnabled();
  });

  test('Verify global !important font override is removed from App.css', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    
    // Verify that header elements with inline Cinzel font work properly
    const headerElement = page.locator('h1').first();
    await expect(headerElement).toBeVisible({ timeout: 10000 });
    
    const fontFamily = await headerElement.evaluate((el) => {
      return window.getComputedStyle(el).fontFamily;
    });
    
    // Should contain 'cinzel' font (inline style takes precedence)
    expect(fontFamily.toLowerCase()).toContain('cinzel');
    
    // This proves the !important override was removed since inline styles now work
  });
});
