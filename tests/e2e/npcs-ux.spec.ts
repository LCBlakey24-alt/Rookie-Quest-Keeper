import { test, expect } from '@playwright/test';
import { loginTestUser, dismissToasts, TEST_CAMPAIGN_ID } from '../fixtures/helpers';

test.describe('NPCsTab UX', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await loginTestUser(page);
    await page.goto(`/campaigns/${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'NPCs' }).click();
    await page.waitForLoadState('networkidle');
  });

  test('displays NPCs list and Add NPC button', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /NPCs/i })).toBeVisible();
    await expect(page.getByTestId('add-npc-btn')).toBeVisible();
  });

  test('shows a compact roster and one selected NPC full stat block', async ({ page }) => {
    const entries = page.locator('[data-testid^="roster-select-"]');
    const count = await entries.count();
    if (count < 1) return; // Empty campaign onboarding has a separate flow.

    const browser = page.getByTestId('gm-npc-split-reference');
    await expect(browser).toBeVisible();
    await expect(page.getByTestId('roster-selected-detail')).toBeVisible();
    await expect(page.getByTestId('npc-combat-stat-block')).toHaveCount(1);

    const selectedName = await entries.first().locator('.rqk-reference-browser__item-name').textContent();
    await entries.first().click();
    await expect(entries.first()).toHaveAttribute('aria-current', 'true');
    await expect(page.getByTestId('roster-selected-detail')).toContainText(selectedName || '');
    if (count > 1) {
      await entries.nth(1).click();
      await expect(entries.nth(1)).toHaveAttribute('aria-current', 'true');
      await expect(page.getByTestId('npc-combat-stat-block')).toHaveCount(1);
    }
  });

  test('keeps edit and safe delete confirmation with the selected NPC', async ({ page }) => {
    const entries = page.locator('[data-testid^="roster-select-"]');
    if (await entries.count() < 1) return;
    await entries.first().click();
    const edit = page.locator('[data-testid^="edit-npc-btn-"]').first();
    const remove = page.locator('[data-testid^="delete-npc-btn-"]').first();
    await expect(edit).toBeVisible();
    await remove.click();
    await expect(page.getByRole('group', { name: /confirm deletion of/i })).toBeVisible();
    await page.getByRole('button', { name: /cancel/i }).last().click();
    await expect(page.getByRole('group', { name: /confirm deletion of/i })).not.toBeVisible();
  });

  test('keeps NPC generation in the separate Create NPC tab', async ({ page }) => {
    await page.getByTestId('npcs-subtab-generate').click();
    await expect(page.getByTestId('npcs-active-subtab-panel')).toBeVisible();
  });

});
