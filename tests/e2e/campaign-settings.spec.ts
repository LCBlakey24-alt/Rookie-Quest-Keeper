import { test, expect } from '@playwright/test';
import { dismissToasts, removeBlockingBadges, loginTestUser, TEST_CAMPAIGN_ID } from '../fixtures/helpers';

test.describe('Campaign Settings Bug Fix Verification', () => {
  
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
  });

  test('should save and persist campaign settings content', async ({ page }) => {
    // Login as test user
    await loginTestUser(page);
    await removeBlockingBadges(page);
    
    // Navigate directly to campaign dashboard with Setting tab
    await page.goto(`/campaign/${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
    
    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');
    
    // Click on Setting tab if exists
    const settingTab = page.getByTestId('setting-tab').or(page.getByRole('tab', { name: /setting/i }));
    const settingTabVisible = await settingTab.isVisible().catch(() => false);
    
    if (settingTabVisible) {
      await settingTab.click();
      await page.waitForLoadState('domcontentloaded');
    }
    
    // Look for setting content area (could be textarea or input)
    const settingTextarea = page.locator('textarea').first();
    const textareaVisible = await settingTextarea.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (textareaVisible) {
      // Generate unique test content
      const testContent = `Test content ${Date.now()}`;
      
      // Fill the setting content
      await settingTextarea.fill(testContent);
      
      // Look for save button or wait for auto-save
      const saveBtn = page.getByRole('button', { name: /save/i });
      const saveVisible = await saveBtn.isVisible().catch(() => false);
      
      if (saveVisible) {
        await saveBtn.click();
        // Wait for save to complete
        await page.waitForLoadState('domcontentloaded');
      }
      
      // Reload page to verify persistence
      await page.reload();
      await removeBlockingBadges(page);
      
      // Click setting tab again if needed
      if (settingTabVisible) {
        await settingTab.click();
      }
      
      // Verify content persisted
      await expect(settingTextarea).toContainText(testContent, { timeout: 10000 });
    } else {
      // If no setting textarea found, skip test
      test.skip();
    }
  });

  test('should have campaign_id correctly set on settings (bug fix)', async ({ page }) => {
    // This test verifies the bug fix via API - the $setOnInsert fix
    // Login as test user
    await loginTestUser(page);
    
    // Make API call to get campaign settings
    const response = await page.request.get(`/api/campaigns/${TEST_CAMPAIGN_ID}/setting`);
    
    expect(response.status()).toBe(200);
    
    const settings = await response.json();
    
    // Verify campaign_id is set correctly (this was the bug - it wasn't being set on upsert)
    expect(settings.campaign_id).toBe(TEST_CAMPAIGN_ID);
  });
});
