import { test, expect } from '@playwright/test';

test.describe('GM Screen Tab Consolidation', () => {
  const testEmail = 'lcblakey24@outlook.com';
  const testPassword = 'LCBlakey24?!';
  const CAMPAIGN_ID = 'b51ba0e9-5b08-44ed-b3dd-4a97dd2a09f6';

  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.fill('input[placeholder="Email address"]', testEmail);
    await page.fill('input[placeholder="Password"]', testPassword);
    await page.click('button:has-text("Sign In")');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  test('GM Screen has 9 tabs - tab consolidation verified', async ({ page }) => {
    // Navigate directly to GM Screen
    await page.goto(`/gm-screen/${CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    // Wait for GM Tools header (indicates GM Screen loaded)
    await expect(page.locator('text=GM TOOLS').first()).toBeVisible();
    
    // Verify all 9 tabs are visible using data-testid
    const expectedTabs = ['combat', 'location', 'npcs', 'monsters', 'tables', 'loot', 'dice', 'party', 'notes'];
    
    for (const tabId of expectedTabs) {
      const tabButton = page.getByTestId(`tab-${tabId}`);
      await expect(tabButton).toBeVisible();
    }
    
    // Screenshot showing 9 tabs
    await page.screenshot({ path: 'gm-screen-9-tabs-verified.jpeg', quality: 20 });
  });

  test('NPCs tab shows combined Saved NPCs + Name Generator', async ({ page }) => {
    // Navigate directly to GM Screen
    await page.goto(`/gm-screen/${CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    // Click NPCs tab
    await page.getByTestId('tab-npcs').click();
    await page.waitForTimeout(1000);
    
    // Verify combined view heading
    await expect(page.locator('text=NPCs & Name Generator').first()).toBeVisible();
    
    // Verify Saved NPCs section
    await expect(page.locator('text=Saved NPCs').first()).toBeVisible();
    
    // Verify Name Generator section
    await expect(page.locator('text=Generate NPC Name').first()).toBeVisible();
    
    await page.screenshot({ path: 'npcs-tab-combined-layout.jpeg', quality: 20 });
  });

  test('Monsters tab shows combined SRD lookup + Custom Creatures', async ({ page }) => {
    // Navigate directly to GM Screen
    await page.goto(`/gm-screen/${CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    // Click Monsters tab
    await page.getByTestId('tab-monsters').click();
    await page.waitForTimeout(1000);
    
    // Verify combined view heading
    await expect(page.locator('text=Monsters & Custom Creatures').first()).toBeVisible();
    
    // Verify SRD Monster Lookup section
    await expect(page.locator('text=SRD Monster Lookup').first()).toBeVisible();
    
    // Verify Custom Creatures section
    await expect(page.locator('text=Custom Creatures').first()).toBeVisible();
    
    await page.screenshot({ path: 'monsters-tab-combined-layout.jpeg', quality: 20 });
  });

  test('Name generator functionality works in NPCs tab', async ({ page }) => {
    // Navigate directly to GM Screen
    await page.goto(`/gm-screen/${CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    // Click NPCs tab
    await page.getByTestId('tab-npcs').click();
    await page.waitForTimeout(1000);
    
    await expect(page.locator('text=NPCs & Name Generator').first()).toBeVisible();
    
    // Click Generate Name button
    await page.getByTestId('generate-name-btn').click();
    await page.waitForTimeout(500);
    
    // Verify generated name appears
    await expect(page.locator('text=Generated Name').first()).toBeVisible();
    
    // Verify Save as NPC button appears
    await expect(page.getByTestId('save-as-npc-btn')).toBeVisible();
    
    await page.screenshot({ path: 'name-generator-result.jpeg', quality: 20 });
    
    // Save as NPC
    await page.getByTestId('save-as-npc-btn').click();
    await page.waitForTimeout(1000);
    
    // Verify success toast
    await expect(page.locator('text=saved as NPC').first()).toBeVisible();
    
    // Verify "Saved This Session" section appears
    await expect(page.locator('text=Saved This Session').first()).toBeVisible();
    
    await page.screenshot({ path: 'name-saved-as-npc.jpeg', quality: 20 });
  });
});
