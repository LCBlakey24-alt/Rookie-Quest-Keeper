import { test, expect } from '@playwright/test';
import { 
  waitForAppReady, 
  removeBlockingBadges, 
  loginTestUser,
  TEST_USER
} from '../fixtures/helpers';

/**
 * Session Journal CRUD Tests
 * Tests the Session Journal feature in Player Dashboard
 */

test.describe('Session Journal CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await removeBlockingBadges(page);
    await loginTestUser(page);
    
    // Navigate to Player Dashboard
    await page.goto('/player', { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/player/, { timeout: 15000 });
    
    // Click on Journal tab
    await page.getByTestId('tab-journal').click();
    await expect(page.getByText('Session Journal')).toBeVisible({ timeout: 5000 });
    
    // Dismiss any popups/suggestions
    await page.evaluate(() => {
      // Remove ROOK suggestion popup if present
      const rookPopup = document.querySelector('[data-testid*="rook"], [class*="RookSuggestion"]');
      if (rookPopup) (rookPopup as HTMLElement).remove();
      
      // Remove shortcuts hint if present
      const shortcuts = document.querySelector('[class*="ShortcutsHint"]');
      if (shortcuts) (shortcuts as HTMLElement).remove();
    });
  });

  test('Journal tab displays correctly', async ({ page }) => {
    // Verify Journal header is visible
    await expect(page.getByText('Session Journal')).toBeVisible();
    await expect(page.getByText(/Track your adventures/i)).toBeVisible();
    
    // Verify New Entry button exists
    await expect(page.getByTestId('new-journal-entry-btn')).toBeVisible();
    
    // Verify search and filter elements exist
    await expect(page.getByTestId('journal-search')).toBeVisible();
    await expect(page.getByTestId('journal-filter')).toBeVisible();
  });

  test('New Entry button opens entry form', async ({ page }) => {
    // Click New Entry button
    await page.getByTestId('new-journal-entry-btn').click();
    
    // Verify form appears
    await expect(page.getByTestId('journal-title-input')).toBeVisible();
    await expect(page.getByTestId('journal-content-input')).toBeVisible();
    await expect(page.getByTestId('save-journal-entry-btn')).toBeVisible();
  });

  test('Create journal entry - full flow', async ({ page, request }) => {
    const uniqueId = Date.now().toString(36);
    const entryTitle = `TEST_Journal_${uniqueId}`;
    const entryContent = `Test journal content created at ${new Date().toISOString()}`;
    
    // Click New Entry button
    await page.getByTestId('new-journal-entry-btn').click();
    await expect(page.getByTestId('journal-title-input')).toBeVisible();
    
    // Fill entry form
    await page.getByTestId('journal-title-input').fill(entryTitle);
    await page.getByTestId('journal-content-input').fill(entryContent);
    
    // Save entry
    await page.getByTestId('save-journal-entry-btn').click();
    
    // Verify entry appears in list
    await expect(page.getByText(entryTitle)).toBeVisible({ timeout: 10000 });
    
    // Cleanup - Delete the entry via API
    const loginRes = await request.post('http://localhost:8000/api/auth/login', {
      data: { email: TEST_USER.email, password: TEST_USER.password }
    });
    const { token } = await loginRes.json();
    
    const response = await request.get('http://localhost:8000/api/player/journal', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const entries = await response.json();
    const entry = entries.find((e: any) => e.title === entryTitle);
    if (entry) {
      await request.delete(`http://localhost:8000/api/player/journal/${entry.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    }
  });

  test('Entry type buttons display in form', async ({ page }) => {
    // Click New Entry button
    await page.getByTestId('new-journal-entry-btn').click();
    await expect(page.getByTestId('journal-title-input')).toBeVisible();
    
    // Verify entry type buttons exist within the form (use more specific selectors)
    const form = page.locator('[class*="CardContent"], [class*="card-content"]').first();
    await expect(page.getByRole('button', { name: 'Session Summary' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Combat' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'NPC Met' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Location' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Loot/Item' })).toBeVisible();
    // Note button with exact match to avoid tab collision
    await expect(page.getByRole('button', { name: 'Note', exact: true })).toBeVisible();
  });

  test('Type filter works correctly', async ({ page }) => {
    // Verify filter dropdown is present
    await expect(page.getByTestId('journal-filter')).toBeVisible();
    
    // Check options exist
    const filterSelect = page.getByTestId('journal-filter');
    await expect(filterSelect.locator('option[value="all"]')).toBeAttached();
    await expect(filterSelect.locator('option[value="session"]')).toBeAttached();
    await expect(filterSelect.locator('option[value="combat"]')).toBeAttached();
    await expect(filterSelect.locator('option[value="npc"]')).toBeAttached();
  });

  test('Search input accepts text', async ({ page }) => {
    const searchInput = page.getByTestId('journal-search');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('test search');
    await expect(searchInput).toHaveValue('test search');
  });
});

test.describe('Session Journal API Tests', () => {
  test('Create and delete journal entry via API', async ({ page, request }) => {
    // Login to get token
    const loginRes = await request.post('http://localhost:8000/api/auth/login', {
      data: {
        email: TEST_USER.email,
        password: TEST_USER.password
      }
    });
    expect(loginRes.ok()).toBeTruthy();
    const { token } = await loginRes.json();
    
    const uniqueId = Date.now().toString(36);
    const entryTitle = `TEST_API_Journal_${uniqueId}`;
    
    // Create entry
    const createRes = await request.post('http://localhost:8000/api/player/journal', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        title: entryTitle,
        content: 'API test content',
        type: 'note'
      }
    });
    expect(createRes.ok()).toBeTruthy();
    const entry = await createRes.json();
    expect(entry.title).toBe(entryTitle);
    
    // Delete entry
    const deleteRes = await request.delete(`http://localhost:8000/api/player/journal/${entry.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(deleteRes.ok()).toBeTruthy();
  });
});
