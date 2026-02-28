import { Page, expect } from '@playwright/test';

export async function waitForAppReady(page: Page) {
  await page.waitForLoadState('domcontentloaded');
}

export async function dismissToasts(page: Page) {
  // Use first() to avoid strict mode violations when multiple toasts appear
  await page.addLocatorHandler(
    page.locator('[data-sonner-toast]').first(),
    async (toast) => {
      // Try to click the close button within this specific toast
      const close = toast.locator('[data-close], button[aria-label="Close"]');
      await close.first().click({ timeout: 1000 }).catch(() => {});
    },
    { times: 20, noWaitAfter: true }
  );
}

export async function checkForErrors(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const errorElements = Array.from(
      document.querySelectorAll('.error, [class*="error"], [id*="error"]')
    );
    return errorElements.map(el => el.textContent || '').filter(Boolean);
  });
}

export async function hideEmergentBadge(page: Page) {
  await page.evaluate(() => {
    const badge = document.querySelector('[class*="emergent"], [id*="emergent-badge"]');
    if (badge) (badge as HTMLElement).remove();
  });
}

export async function loginUser(page: Page, username: string, password: string) {
  await page.goto('/auth', { waitUntil: 'domcontentloaded' });
  await page.getByTestId('login-username-input').fill(username);
  await page.getByTestId('login-password-input').fill(password);
  await page.getByTestId('login-submit-btn').click();
}

export async function registerUser(page: Page, username: string, password: string) {
  await page.goto('/auth', { waitUntil: 'domcontentloaded' });
  await page.getByTestId('switch-to-register-btn').click();
  await page.getByTestId('register-username-input').fill(username);
  await page.getByTestId('register-password-input').fill(password);
  await page.getByTestId('register-submit-btn').click();
}

export function generateTestUsername(): string {
  return `TEST_user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

// Test campaign and scenario constants
export const TEST_CAMPAIGN_ID = '32fe976f-1dd0-4b17-a23b-42dbd1023d50';
export const TEST_SCENARIO_ID = '6fa133b0-16e3-4861-ad3c-ac534d4e2e74';
export const TEST_USER = { username: 'testdm1', password: 'testpass123' };

export async function loginTestUser(page: Page) {
  await page.goto('/auth', { waitUntil: 'domcontentloaded' });
  await page.getByTestId('login-username-input').fill(TEST_USER.username);
  await page.getByTestId('login-password-input').fill(TEST_USER.password);
  await page.getByTestId('login-submit-btn').click();
  await page.waitForURL(/\/campaigns/, { timeout: 10000 });
}

export async function navigateToDMScreen(page: Page) {
  await page.goto(`/dm-screen/${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');
}

export async function selectEncounterAndStartCombat(page: Page) {
  await expect(page.getByTestId(`encounter-${TEST_SCENARIO_ID}`)).toBeVisible({ timeout: 10000 });
  await page.getByTestId(`encounter-${TEST_SCENARIO_ID}`).click();
  await expect(page.getByTestId('start-combat-btn')).toBeEnabled({ timeout: 5000 });
  await page.getByTestId('start-combat-btn').click();
  await page.waitForURL(/\/combat/, { timeout: 10000 });
  // Wait for page to load - the Initiative Order heading
  await expect(page.getByRole('heading', { name: 'Initiative Order' })).toBeVisible({ timeout: 15000 });
}
