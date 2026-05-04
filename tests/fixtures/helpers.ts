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

export async function removeBlockingBadges(page: Page) {
  await page.evaluate(() => {
    document
      .querySelectorAll('[data-hosted-badge], [data-testid="hosted-badge"]')
      .forEach((badge) => (badge as HTMLElement).remove());
  });
}

// Updated for email-based auth
export async function loginUser(page: Page, email: string, password: string) {
  await page.goto('/auth', { waitUntil: 'domcontentloaded' });
  await waitForAppReady(page);
  await page.getByTestId('login-email').fill(email);
  await page.getByTestId('login-password').fill(password);
  await page.getByTestId('login-btn').click();
}

// Updated for email-based registration
export async function registerUser(page: Page, email: string, username: string, password: string) {
  await page.goto('/auth', { waitUntil: 'domcontentloaded' });
  await waitForAppReady(page);
  
  // Click CREATE ACCOUNT button to switch to register form
  await page.getByRole('button', { name: /create account/i }).click();
  
  // Wait for register form elements
  await expect(page.getByTestId('register-email')).toBeVisible();
  
  await page.getByTestId('register-email').fill(email);
  await page.getByTestId('register-username').fill(username);
  await page.getByTestId('register-password').fill(password);
  await page.getByTestId('register-btn').click();
}

export function generateTestEmail(): string {
  return `test_${Date.now()}_${Math.random().toString(36).substring(2, 7)}@test.com`;
}

export function generateTestUsername(): string {
  return `TEST_user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

// Test campaign and scenario constants - Stress Test Campaign
export const TEST_CAMPAIGN_ID = '1e6a6d0d-ad88-4b8a-9cc5-a1672119343c';
export const TEST_SCENARIO_ID = '7bd4be2a-2821-4daf-97d7-af5ddbe34968';
// Scenario with abilities - Shadow Wolf Hunt
export const TEST_ABILITIES_SCENARIO_ID = 'd719e646-688f-482f-a97a-8d02d80f2807';
// Custom creature with abilities
export const TEST_CUSTOM_CREATURE_ID = '7bc77fba-92ff-47bc-83dc-cf3e5ac1703a';

// Updated test user with email - Admin Test User
export const TEST_USER = { 
  email: 'lcblakey24@outlook.com',
  username: 'lcblakey24',
  password: 'LCBlakey24?!'
};

export async function loginTestUser(page: Page) {
  await loginUser(page, TEST_USER.email, TEST_USER.password);
  // After login, user goes to /home (UnifiedDashboard)
  await page.waitForURL(/\/home/, { timeout: 15000 });
}

export async function navigateToGMScreen(page: Page) {
  // Correct route is /gm-screen/ not /dm-screen/
  await page.goto(`/gm-screen/${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
  // Wait for GM screen content to load
  await expect(page.getByRole('heading', { name: 'Combat Control' })).toBeVisible({ timeout: 15000 });
}

// Alias for backwards compatibility
export async function navigateToDMScreen(page: Page) {
  await navigateToGMScreen(page);
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

// Test character for Character Sheet testing
export const TEST_CHARACTER_ID = '5c200c1f-d584-4b3d-a3a2-e1b49b404e8d';

export async function navigateToCharacterSheet(page: Page, characterId: string = TEST_CHARACTER_ID) {
  await page.goto(`/characters/${characterId}`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('character-sheet-full')).toBeVisible({ timeout: 10000 });
}
