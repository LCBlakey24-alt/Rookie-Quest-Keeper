import { test, expect, Page } from '@playwright/test';

const TEST_CAMPAIGN_ID = '445891b3-96f8-4e18-9ae4-68987c2e884c';
const TEST_USER = { email: 'admin@rookiequestkeeper.com', password: 'Admin123!' };

// Helper to login
async function loginUser(page: Page) {
  await page.goto('/auth', { waitUntil: 'domcontentloaded' });
  await page.getByTestId('login-email').fill(TEST_USER.email);
  await page.getByTestId('login-password').fill(TEST_USER.password);
  await page.getByTestId('login-btn').click();
  await page.waitForURL(/\/campaigns/, { timeout: 15000 });
}

// Helper to navigate to GM Screen Creatures tab
async function navigateToCreaturesTab(page: Page) {
  await page.goto(`/gm-screen/${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('tab-creatures')).toBeVisible({ timeout: 15000 });
  await page.getByTestId('tab-creatures').click();
  // Wait for the custom creature manager to be visible
  await expect(page.getByTestId('custom-creature-manager')).toBeVisible({ timeout: 10000 });
}

// Helper to create unique names
function uniqueCreatureName(prefix: string): string {
  return `TEST_${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
}

test.describe('Custom Creatures - GM Screen Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
  });

  test('should navigate to GM Screen and see Creatures tab', async ({ page }) => {
    await page.goto(`/gm-screen/${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
    
    // Verify Creatures tab is visible in the tab bar
    const creaturesTab = page.getByTestId('tab-creatures');
    await expect(creaturesTab).toBeVisible({ timeout: 15000 });
    
    // Verify tab has correct label
    await expect(creaturesTab).toContainText('Creatures');
  });

  test('should click Creatures tab and see Custom Creature Manager', async ({ page }) => {
    await navigateToCreaturesTab(page);
    
    // Verify the manager is visible with Create button
    await expect(page.getByTestId('create-creature-btn')).toBeVisible();
    
    // Verify Import CSV button is visible
    await expect(page.getByTestId('import-csv-btn')).toBeVisible();
  });

  test('should verify all GM Screen tabs are present', async ({ page }) => {
    await page.goto(`/gm-screen/${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
    
    // Verify key tabs exist
    await expect(page.getByTestId('tab-combat')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('tab-dice')).toBeVisible();
    await expect(page.getByTestId('tab-monsters')).toBeVisible();
    await expect(page.getByTestId('tab-creatures')).toBeVisible();
    await expect(page.getByTestId('tab-names')).toBeVisible();
    await expect(page.getByTestId('tab-loot')).toBeVisible();
  });
});

test.describe('Custom Creatures - CRUD Operations', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    await navigateToCreaturesTab(page);
  });

  test('should open create form when clicking Create Creature button', async ({ page }) => {
    await page.getByTestId('create-creature-btn').click();
    
    // Verify form fields are visible
    await expect(page.getByTestId('creature-name-input')).toBeVisible();
    await expect(page.getByTestId('creature-cr-select')).toBeVisible();
    await expect(page.getByTestId('creature-hp-input')).toBeVisible();
    await expect(page.getByTestId('creature-ac-input')).toBeVisible();
    await expect(page.getByTestId('creature-type-select')).toBeVisible();
    await expect(page.getByTestId('creature-size-select')).toBeVisible();
    await expect(page.getByTestId('creature-speed-input')).toBeVisible();
    await expect(page.getByTestId('creature-abilities-input')).toBeVisible();
    await expect(page.getByTestId('creature-description-input')).toBeVisible();
    
    // Verify Save and Cancel buttons
    await expect(page.getByTestId('save-creature-btn')).toBeVisible();
    await expect(page.getByTestId('cancel-creature-btn')).toBeVisible();
  });

  test('should create a new custom creature with all fields', async ({ page }) => {
    const creatureName = uniqueCreatureName('Frost_Troll');
    
    await page.getByTestId('create-creature-btn').click();
    
    // Fill in all fields
    await page.getByTestId('creature-name-input').fill(creatureName);
    await page.getByTestId('creature-cr-select').selectOption('4');
    await page.getByTestId('creature-hp-input').fill('85');
    await page.getByTestId('creature-ac-input').fill('15');
    await page.getByTestId('creature-type-select').selectOption('giant');
    await page.getByTestId('creature-size-select').selectOption('Large');
    await page.getByTestId('creature-speed-input').fill('30 ft.');
    await page.getByTestId('creature-abilities-input').fill('Multiattack. Cold Regeneration.');
    await page.getByTestId('creature-description-input').fill('A fearsome frost troll.');
    
    // Submit form
    await page.getByTestId('save-creature-btn').click();
    
    // Wait for success toast and creature to appear in list
    await expect(page.getByText('Custom creature created!')).toBeVisible({ timeout: 5000 });
    
    // Verify creature appears in the list
    await expect(page.getByText(creatureName)).toBeVisible({ timeout: 5000 });
    
    // Cleanup - find and delete the creature
    const creatureCard = page.locator(`[data-testid^="creature-card-"]`).filter({ hasText: creatureName }).first();
    const deleteBtn = creatureCard.locator('[data-testid^="delete-creature-"]');
    
    // Handle confirmation dialog
    page.on('dialog', dialog => dialog.accept());
    await deleteBtn.click();
    await expect(page.getByText('Creature deleted')).toBeVisible({ timeout: 5000 });
  });

  test('should cancel creature creation', async ({ page }) => {
    await page.getByTestId('create-creature-btn').click();
    
    // Fill name
    await page.getByTestId('creature-name-input').fill('TEST_CancelCreature');
    
    // Cancel
    await page.getByTestId('cancel-creature-btn').click();
    
    // Form should be hidden
    await expect(page.getByTestId('creature-name-input')).not.toBeVisible();
    
    // Creature should not exist in list
    await expect(page.getByText('TEST_CancelCreature')).not.toBeVisible();
  });

  test('should edit an existing custom creature', async ({ page }) => {
    const originalName = uniqueCreatureName('EditMe');
    const updatedName = uniqueCreatureName('Edited');
    
    // Create creature first
    await page.getByTestId('create-creature-btn').click();
    await page.getByTestId('creature-name-input').fill(originalName);
    await page.getByTestId('creature-hp-input').fill('50');
    await page.getByTestId('save-creature-btn').click();
    await expect(page.getByText('Custom creature created!')).toBeVisible({ timeout: 5000 });
    
    // Find and click edit button
    const creatureCard = page.locator(`[data-testid^="creature-card-"]`).filter({ hasText: originalName }).first();
    await creatureCard.locator('[data-testid^="edit-creature-"]').click();
    
    // Form should be visible with original values
    await expect(page.getByTestId('creature-name-input')).toBeVisible();
    
    // Update the creature
    await page.getByTestId('creature-name-input').fill(updatedName);
    await page.getByTestId('creature-hp-input').fill('100');
    await page.getByTestId('creature-cr-select').selectOption('5');
    
    // Save
    await page.getByTestId('save-creature-btn').click();
    await expect(page.getByText('Creature updated!')).toBeVisible({ timeout: 5000 });
    
    // Verify updated creature is visible
    await expect(page.getByText(updatedName)).toBeVisible({ timeout: 5000 });
    
    // Original name should no longer be visible
    await expect(page.getByText(originalName)).not.toBeVisible();
    
    // Cleanup
    page.on('dialog', dialog => dialog.accept());
    const updatedCard = page.locator(`[data-testid^="creature-card-"]`).filter({ hasText: updatedName }).first();
    await updatedCard.locator('[data-testid^="delete-creature-"]').click();
    await expect(page.getByText('Creature deleted')).toBeVisible({ timeout: 5000 });
  });

  test('should delete a custom creature', async ({ page }) => {
    const creatureName = uniqueCreatureName('DeleteMe');
    
    // Create creature to delete
    await page.getByTestId('create-creature-btn').click();
    await page.getByTestId('creature-name-input').fill(creatureName);
    await page.getByTestId('save-creature-btn').click();
    await expect(page.getByText('Custom creature created!')).toBeVisible({ timeout: 5000 });
    
    // Find and delete
    page.on('dialog', dialog => dialog.accept());
    const creatureCard = page.locator(`[data-testid^="creature-card-"]`).filter({ hasText: creatureName }).first();
    await creatureCard.locator('[data-testid^="delete-creature-"]').click();
    
    // Verify deletion
    await expect(page.getByText('Creature deleted')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(creatureName)).not.toBeVisible();
  });
});

test.describe('Custom Creatures - CSV Export', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    await navigateToCreaturesTab(page);
  });

  test('should show Export CSV button when creatures exist', async ({ page }) => {
    const creatureName = uniqueCreatureName('ExportTest');
    
    // Create a creature to ensure list is not empty
    await page.getByTestId('create-creature-btn').click();
    await page.getByTestId('creature-name-input').fill(creatureName);
    await page.getByTestId('save-creature-btn').click();
    await expect(page.getByText('Custom creature created!')).toBeVisible({ timeout: 5000 });
    
    // Export button should now be visible
    await expect(page.getByTestId('export-csv-btn')).toBeVisible();
    
    // Cleanup
    page.on('dialog', dialog => dialog.accept());
    const creatureCard = page.locator(`[data-testid^="creature-card-"]`).filter({ hasText: creatureName }).first();
    await creatureCard.locator('[data-testid^="delete-creature-"]').click();
  });

  test('should trigger download when clicking Export CSV', async ({ page }) => {
    const creatureName = uniqueCreatureName('CSVExport');
    
    // Create a creature
    await page.getByTestId('create-creature-btn').click();
    await page.getByTestId('creature-name-input').fill(creatureName);
    await page.getByTestId('creature-cr-select').selectOption('2');
    await page.getByTestId('creature-hp-input').fill('25');
    await page.getByTestId('save-creature-btn').click();
    await expect(page.getByText('Custom creature created!')).toBeVisible({ timeout: 5000 });
    
    // Listen for download event
    const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
    
    // Click export
    await page.getByTestId('export-csv-btn').click();
    
    // Verify download triggered
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('custom-creatures.csv');
    
    // Cleanup
    page.on('dialog', dialog => dialog.accept());
    const creatureCard = page.locator(`[data-testid^="creature-card-"]`).filter({ hasText: creatureName }).first();
    await creatureCard.locator('[data-testid^="delete-creature-"]').click();
  });
});

test.describe('Custom Creatures - UI Verification', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    await navigateToCreaturesTab(page);
  });

  test('should display creature card with correct info', async ({ page }) => {
    const creatureName = uniqueCreatureName('CardDisplay');
    
    // Create creature with specific values
    await page.getByTestId('create-creature-btn').click();
    await page.getByTestId('creature-name-input').fill(creatureName);
    await page.getByTestId('creature-cr-select').selectOption('3');
    await page.getByTestId('creature-hp-input').fill('45');
    await page.getByTestId('creature-ac-input').fill('16');
    await page.getByTestId('creature-type-select').selectOption('humanoid');
    await page.getByTestId('creature-size-select').selectOption('Medium');
    await page.getByTestId('creature-abilities-input').fill('Multiattack');
    await page.getByTestId('save-creature-btn').click();
    await expect(page.getByText('Custom creature created!')).toBeVisible({ timeout: 5000 });
    
    // Find creature card
    const creatureCard = page.locator(`[data-testid^="creature-card-"]`).filter({ hasText: creatureName }).first();
    await expect(creatureCard).toBeVisible();
    
    // Verify card displays key info
    await expect(creatureCard.getByText('CR 3')).toBeVisible();
    await expect(creatureCard.getByText('HP: 45')).toBeVisible();
    await expect(creatureCard.getByText('AC: 16')).toBeVisible();
    await expect(creatureCard.getByText(/Medium humanoid/i)).toBeVisible();
    await expect(creatureCard.getByText('Multiattack')).toBeVisible();
    
    // Verify buttons are present
    await expect(creatureCard.locator('[data-testid^="edit-creature-"]')).toBeVisible();
    await expect(creatureCard.locator('[data-testid^="delete-creature-"]')).toBeVisible();
    
    // Cleanup
    page.on('dialog', dialog => dialog.accept());
    await creatureCard.locator('[data-testid^="delete-creature-"]').click();
  });

  test('should show CSV format help text', async ({ page }) => {
    // Verify CSV format help is visible
    await expect(page.getByText(/CSV Format:/i)).toBeVisible();
    await expect(page.getByText(/name, cr, hp, ac, type, size, speed, abilities, description/i)).toBeVisible();
  });

  test('should show Import CSV button', async ({ page }) => {
    await expect(page.getByTestId('import-csv-btn')).toBeVisible();
    await expect(page.getByTestId('import-csv-btn')).toContainText('Import CSV');
  });
});
