import { test, expect } from '@playwright/test';
import { 
  loginTestUser, 
  navigateToGMScreen, 
  TEST_CAMPAIGN_ID,
  dismissToasts,
  removeBlockingBadges,
  waitForAppReady
} from '../fixtures/helpers';

const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';

test.describe('Screen Animations, NPC Quick Reference & Mobile Toggle', () => {
  
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await loginTestUser(page);
    await removeBlockingBadges(page);
  });

  // ==================== DASHBOARD ANIMATIONS ====================
  
  test('Dashboard character cards have animation classes (card-animated, hover-lift)', async ({ page }) => {
    // Navigate to home/dashboard
    await page.goto('/home', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    
    // Wait for content to load
    await expect(page.locator('#player-section')).toBeVisible({ timeout: 10000 });
    
    // Check if character cards have animation classes
    const characterCards = page.locator('[data-testid^="character-"]');
    const characterCount = await characterCards.count();
    
    if (characterCount > 0) {
      // Get first character card and check classes
      const firstCard = characterCards.first();
      const classAttr = await firstCard.getAttribute('class');
      
      // Verify animation classes are present
      expect(classAttr).toContain('card-animated');
      expect(classAttr).toContain('hover-lift');
      expect(classAttr).toContain('transition-smooth');
      
      // Check stagger class (stagger-1 to stagger-8)
      expect(classAttr).toMatch(/stagger-[1-8]/);
    } else {
      // If no characters, this is expected - just verify section loads
      await expect(page.locator('#player-section')).toBeVisible();
    }
  });

  test('Dashboard campaign cards have staggered animation classes', async ({ page }) => {
    await page.goto('/home', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    
    // Wait for GM section to load
    await expect(page.locator('#gm-section')).toBeVisible({ timeout: 10000 });
    
    // Check campaign cards
    const campaignCards = page.locator('[data-testid^="campaign-"]');
    const campaignCount = await campaignCards.count();
    
    if (campaignCount > 0) {
      // Verify first card has animation classes
      const firstCard = campaignCards.first();
      const classAttr = await firstCard.getAttribute('class');
      
      expect(classAttr).toContain('card-animated');
      expect(classAttr).toContain('hover-lift');
      
      // If multiple campaigns, verify different stagger delays
      if (campaignCount > 1) {
        const secondCard = campaignCards.nth(1);
        const secondClassAttr = await secondCard.getAttribute('class');
        
        // Both should have stagger classes
        expect(classAttr).toMatch(/stagger-1/);
        expect(secondClassAttr).toMatch(/stagger-2/);
      }
    }
  });

  // ==================== MOBILE NAVIGATION TOGGLE ====================

  test('Mobile toggle is hidden on desktop (>768px)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/home', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    
    // Mobile toggle should be hidden on desktop
    const mobileNav = page.locator('#mobile-nav-toggle');
    await expect(mobileNav).toBeHidden();
    
    // Both player and GM sections should be visible on desktop
    await expect(page.locator('#player-section')).toBeVisible();
    await expect(page.locator('#gm-section')).toBeVisible();
  });

  test('Mobile toggle shows PLAYER HUB and GM SIDE buttons on mobile (<768px)', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/home', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    
    // Wait for mobile nav toggle to be visible
    const mobileNav = page.locator('#mobile-nav-toggle');
    await expect(mobileNav).toBeVisible({ timeout: 10000 });
    
    // Check for PLAYER HUB and GM SIDE buttons
    await expect(page.getByRole('button', { name: /PLAYER HUB/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /GM SIDE/i })).toBeVisible();
  });

  test('Mobile toggle switches between Player and GM sections', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/home', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    
    // Wait for mobile nav toggle
    await expect(page.locator('#mobile-nav-toggle')).toBeVisible({ timeout: 10000 });
    
    // Initially, PLAYER HUB should be active (default state)
    const playerBtn = page.getByRole('button', { name: /PLAYER HUB/i });
    const gmBtn = page.getByRole('button', { name: /GM SIDE/i });
    
    // Player section should be visible by default
    await expect(page.locator('#player-section')).toBeVisible();
    
    // Click GM SIDE to switch
    await gmBtn.click();
    
    // Wait for state change - GM section should now be visible
    await page.waitForTimeout(500); // Allow CSS transition
    
    // GM section should be visible
    await expect(page.locator('#gm-section')).toBeVisible();
    
    // Switch back to Player
    await playerBtn.click();
    await page.waitForTimeout(500);
    
    // Player section should be visible again
    await expect(page.locator('#player-section')).toBeVisible();
  });

  // ==================== NPC QUICK REFERENCE TAB ====================

  test('NPCs tab appears in GM Screen sidebar', async ({ page }) => {
    await navigateToGMScreen(page);
    
    // Check NPCs tab exists in sidebar
    const npcsTab = page.getByTestId('tab-npcs');
    await expect(npcsTab).toBeVisible();
    
    // Verify tab has correct label
    await expect(npcsTab).toContainText('NPCs');
  });

  test('NPC Quick Reference component loads when NPCs tab is clicked', async ({ page }) => {
    await navigateToGMScreen(page);
    
    // Click NPCs tab
    await page.getByTestId('tab-npcs').click();
    
    // Wait for NPC Quick Reference component to load
    const npcReference = page.getByTestId('npc-quick-reference');
    await expect(npcReference).toBeVisible({ timeout: 10000 });
    
    // Verify header is present
    await expect(page.getByRole('heading', { name: /NPC Quick Reference/i })).toBeVisible();
  });

  test('NPC Quick Reference shows search input', async ({ page }) => {
    await navigateToGMScreen(page);
    await page.getByTestId('tab-npcs').click();
    
    await expect(page.getByTestId('npc-quick-reference')).toBeVisible({ timeout: 10000 });
    
    // Check for search input
    const searchInput = page.getByPlaceholder(/Search NPCs/i);
    await expect(searchInput).toBeVisible();
    
    // Verify search input is functional
    await searchInput.fill('test');
    await expect(searchInput).toHaveValue('test');
  });

  test('NPC Quick Reference shows location filter dropdown', async ({ page }) => {
    await navigateToGMScreen(page);
    await page.getByTestId('tab-npcs').click();
    
    await expect(page.getByTestId('npc-quick-reference')).toBeVisible({ timeout: 10000 });
    
    // Check for location filter dropdown
    const locationSelect = page.locator('select');
    await expect(locationSelect).toBeVisible();
    
    // Verify "All Locations" option exists
    await expect(locationSelect.locator('option', { hasText: 'All Locations' })).toBeAttached();
  });

  test('NPC expand/collapse shows and hides details', async ({ page }) => {
    await navigateToGMScreen(page);
    await page.getByTestId('tab-npcs').click();
    
    await expect(page.getByTestId('npc-quick-reference')).toBeVisible({ timeout: 10000 });
    
    // Check if there are any NPCs
    const npcCards = page.locator('.card-animated').filter({ has: page.locator('button') });
    const npcCount = await npcCards.count();
    
    if (npcCount > 0) {
      // Click first NPC to expand
      const firstNpcButton = npcCards.first().locator('button').first();
      await firstNpcButton.click();
      
      // After expanding, "View Full Details" button should be visible
      await expect(page.getByRole('button', { name: /View Full Details/i }).first()).toBeVisible({ timeout: 5000 });
      
      // Click again to collapse
      await firstNpcButton.click();
      
      // Details should collapse - View Full Details should not be visible
      await expect(page.getByRole('button', { name: /View Full Details/i }).first()).toBeHidden({ timeout: 5000 });
    } else {
      // No NPCs - verify empty state message
      await expect(page.getByText(/No NPCs found/i)).toBeVisible();
    }
  });

  test('NPC search filters NPC list', async ({ page }) => {
    await navigateToGMScreen(page);
    await page.getByTestId('tab-npcs').click();
    
    await expect(page.getByTestId('npc-quick-reference')).toBeVisible({ timeout: 10000 });
    
    // Get initial count
    const npcCards = page.locator('.card-animated').filter({ has: page.locator('button') });
    const initialCount = await npcCards.count();
    
    if (initialCount > 0) {
      // Search for something that likely won't match
      const searchInput = page.getByPlaceholder(/Search NPCs/i);
      await searchInput.fill('xyznonexistent123');
      
      // Wait for filter to apply
      await page.waitForTimeout(500);
      
      // Either no results message or filtered count
      const filteredCount = await npcCards.count();
      
      // Should show "No NPCs found" or have fewer cards
      if (filteredCount === 0) {
        await expect(page.getByText(/No NPCs found/i)).toBeVisible();
      } else {
        expect(filteredCount).toBeLessThanOrEqual(initialCount);
      }
      
      // Clear search
      await searchInput.clear();
      
      // Count should return to original
      await page.waitForTimeout(500);
      const restoredCount = await npcCards.count();
      expect(restoredCount).toBe(initialCount);
    }
  });

  // ==================== ANIMATION CSS CLASSES IN APP.CSS ====================

  test('Animation CSS classes are defined in stylesheet', async ({ page }) => {
    await page.goto('/home', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    
    // Check that animation CSS rules exist by evaluating computed styles
    const hasAnimationClasses = await page.evaluate(() => {
      const styleSheets = document.styleSheets;
      let foundCardAnimated = false;
      let foundHoverLift = false;
      let foundStagger = false;
      
      for (let i = 0; i < styleSheets.length; i++) {
        try {
          const rules = styleSheets[i].cssRules;
          for (let j = 0; j < rules.length; j++) {
            const rule = rules[j] as CSSStyleRule;
            if (rule.selectorText?.includes('.card-animated')) foundCardAnimated = true;
            if (rule.selectorText?.includes('.hover-lift')) foundHoverLift = true;
            if (rule.selectorText?.includes('.stagger-')) foundStagger = true;
          }
        } catch (e) {
          // Cross-origin stylesheets may throw
          continue;
        }
      }
      
      return { foundCardAnimated, foundHoverLift, foundStagger };
    });
    
    expect(hasAnimationClasses.foundCardAnimated).toBe(true);
    expect(hasAnimationClasses.foundHoverLift).toBe(true);
    expect(hasAnimationClasses.foundStagger).toBe(true);
  });

});
