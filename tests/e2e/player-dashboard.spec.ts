import { test, expect } from '@playwright/test';
import { 
  waitForAppReady, 
  removeBlockingBadges, 
  loginTestUser,
  TEST_USER
} from '../fixtures/helpers';

test.describe('Player Dashboard and Notes', () => {
  test.beforeEach(async ({ page }) => {
    await removeBlockingBadges(page);
    await loginTestUser(page);
    
    // After login, user is on UnifiedDashboard (/home)
    await expect(page.getByText('MY CHARACTERS')).toBeVisible({ timeout: 10000 });
    
    // Navigate to Player dashboard via direct URL
    await page.goto('/player', { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/player/, { timeout: 15000 });
  });

  test('Player Dashboard displays tabs', async ({ page }) => {
    // Verify we're on Player Dashboard
    await expect(page.getByTestId('tab-characters')).toBeVisible();
    await expect(page.getByTestId('tab-notes')).toBeVisible();
  });

  test('Player Dashboard shows Characters tab by default', async ({ page }) => {
    // Characters tab should be active by default
    // Check for "My Characters" heading (not "Your Heroes")
    await expect(page.getByRole('heading', { name: /My Characters/i }).first()).toBeVisible();
  });

  test('Notes tab shows Session Recaps and My Notes sections', async ({ page }) => {
    // Click on Notes tab
    await page.getByTestId('tab-notes').click();
    
    // Should show Session Recaps section (use first() for strict mode)
    await expect(page.getByText('Session Recaps').first()).toBeVisible();
    
    // Should show My Notes section
    await expect(page.getByText('My Notes').first()).toBeVisible();
  });

  test('Add Note button opens note dialog', async ({ page }) => {
    // Navigate to Notes tab
    await page.getByTestId('tab-notes').click();
    
    // Click Add Note button
    await page.getByTestId('add-player-note-btn').click();
    
    // Dialog should appear with form inputs
    await expect(page.getByTestId('note-title-input')).toBeVisible();
    await expect(page.getByTestId('note-content-input')).toBeVisible();
    await expect(page.getByTestId('save-note-btn')).toBeVisible();
  });

  test('Create, view, and delete a player note (full CRUD flow)', async ({ page }) => {
    // Navigate to Notes tab
    await page.getByTestId('tab-notes').click();
    
    // Create a unique note
    const uniqueId = Date.now().toString(36);
    const noteTitle = `TEST_Note_${uniqueId}`;
    const noteContent = `Test content created at ${new Date().toISOString()}`;
    
    // Click Add Note button
    await page.getByTestId('add-player-note-btn').click();
    
    // Fill in note form
    await page.getByTestId('note-title-input').fill(noteTitle);
    await page.getByTestId('note-content-input').fill(noteContent);
    
    // Save the note
    await page.getByTestId('save-note-btn').click();
    
    // Wait for dialog to close and note to appear
    await expect(page.getByText(noteTitle)).toBeVisible({ timeout: 10000 });
    
    // Find and delete the note
    // Look for the delete button associated with this note
    const noteCard = page.locator(`[data-testid^="player-note-"]`).filter({ hasText: noteTitle });
    const deleteBtn = noteCard.locator('[data-testid^="delete-note-"]');
    
    // Handle confirmation dialog
    page.once('dialog', dialog => dialog.accept());
    await deleteBtn.click();
    
    // Wait for deletion - note should disappear
    await expect(page.getByText(noteTitle)).not.toBeVisible({ timeout: 10000 });
  });

  test('Create Character button is accessible', async ({ page }) => {
    // On Characters tab (default)
    // Should see Create Character button
    await expect(page.getByTestId('create-character-btn')).toBeVisible();
  });

  test('Join Campaign button is accessible', async ({ page }) => {
    // Should see Join Campaign button
    await expect(page.getByTestId('join-campaign-btn')).toBeVisible();
  });

  test('Back button returns to UnifiedDashboard', async ({ page }) => {
    // Click back button
    await page.getByTestId('back-btn').click();
    
    // Should return to UnifiedDashboard (/home)
    await page.waitForURL(/\/home/, { timeout: 10000 });
    await expect(page.getByText('MY CHARACTERS')).toBeVisible();
    await expect(page.getByText('MY CAMPAIGNS')).toBeVisible();
  });
});
