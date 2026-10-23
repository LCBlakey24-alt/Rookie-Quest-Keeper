import { test, expect, type Page } from '@playwright/test';

type Size = { label: string; width: number; height: number };

const appSizes: Size[] = [
  { label: 'phone', width: 390, height: 844 },
  { label: 'tablet', width: 768, height: 1024 },
  { label: 'tablet-landscape', width: 1024, height: 768 },
  { label: 'desktop', width: 1440, height: 900 },
];

async function assertFitsViewport(page: Page, width: number) {
  const metrics = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    pageWidth: document.documentElement.scrollWidth,
  }));
  expect(metrics.pageWidth, 'Unexpected horizontal page overflow').toBeLessThanOrEqual(width + 2);
  expect(metrics.viewportWidth).toBe(width);
}

async function avoidThirdPartyRequests(page: Page) {
  // Visual/layout smoke tests work entirely from a built frontend. No
  // production credentials, external analytics or test campaign API required.
  await page.route('**/*', route => route.request().url().startsWith('http://127.0.0.1:4173/')
    ? route.continue() : route.abort());
}

for (const size of appSizes) {
  test(`public landing and sign-in fit ${size.label} (${size.width}x${size.height})`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await avoidThirdPartyRequests(page);
    await page.goto('/');
    await expect(page.getByTestId('landing-page')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Your campaign/i })).toBeVisible();
    await assertFitsViewport(page, size.width);

    const signIn = page.getByTestId('landing-signin-btn');
    await expect(signIn).toBeVisible();
    await signIn.click();
    await expect(page.getByTestId('auth-page')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await expect(page.locator('#login-identifier')).toBeVisible();
    await expect(page.locator('#login-password')).toBeVisible();
    await assertFitsViewport(page, size.width);
  });
}

for (const size of [
  { label: '720p TV', width: 1280, height: 720 },
  { label: '1080p TV', width: 1920, height: 1080 },
]) {
  test(`four revealed NPCs fit a ${size.label} screen without scrolling`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await avoidThirdPartyRequests(page);

    const campaignId = 'browser-smoke-fixture';
    await page.addInitScript(id => {
      sessionStorage.setItem('rqk.readOnlyDemo.v1', '1');
      localStorage.setItem(`rqk.liveDisplay.${id}`, JSON.stringify({
        sync_id: 'browser-smoke-npcs',
        mode: 'npc-grid',
        updated_at: '2099-12-31T23:59:59.000Z',
        sequence: 4102444799000,
        payload: {
          display_target: 'standing-tv',
          title: 'The Forest Council',
          eyebrow: 'NPCs revealed',
          npcs: [
            { id: 'one', name: 'Elder Rowan' },
            { id: 'two', name: 'Scout Brin' },
            { id: 'three', name: 'Mara Ember' },
            { id: 'four', name: 'Captain Thorn' },
          ],
        },
      }));
    }, campaignId);
    await page.goto(`/player-display/${campaignId}?target=standing-tv`);
    const display = page.getByTestId('player-display-page');
    await expect(display).toHaveAttribute('data-display-mode', 'npc-grid');
    await expect(display).toHaveAttribute('data-display-target', 'standing-tv');
    await expect(page.locator('.rqk-player-display__npc-card')).toHaveCount(4);
    await assertFitsViewport(page, size.width);

    const bounds = await page.locator('.rqk-player-display__npc-card').evaluateAll(nodes =>
      nodes.map(node => {
        const rect = node.getBoundingClientRect();
        return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
      }));
    for (const rect of bounds) {
      expect(rect.left).toBeGreaterThanOrEqual(-1);
      expect(rect.top).toBeGreaterThanOrEqual(-1);
      expect(rect.right).toBeLessThanOrEqual(size.width + 1);
      expect(rect.bottom).toBeLessThanOrEqual(size.height + 1);
      expect(rect.bottom - rect.top, 'An NPC must have nonzero card height').toBeGreaterThan(50);
    }
    const vertical = await display.evaluate(node => ({
      content: node.scrollHeight,
      viewport: node.clientHeight,
    }));
    expect(vertical.content, 'TV display must fit into one screen').toBeLessThanOrEqual(vertical.viewport + 2);
  });
}


test('large 720p NPC scenes paginate instead of squeezing 17 portraits into one screen', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await avoidThirdPartyRequests(page);
  await page.addInitScript(() => {
    sessionStorage.setItem('rqk.readOnlyDemo.v1', '1');
    localStorage.setItem('rqk.liveDisplay.browser-smoke-large', JSON.stringify({
      mode: 'npc-grid', sync_id: 'paging-test', sequence: 4102444799000,
      updated_at: '2099-12-31T23:59:59.000Z',
      payload: {
        display_target: 'standing-tv', title: 'The Full Council',
        npcs: Array.from({ length: 17 }, (_, index) => ({
          id: String(index + 1), name: `NPC ${index + 1}`,
        })),
      },
    }));
  });
  await page.goto('/player-display/browser-smoke-large?target=standing-tv');
  await expect(page.getByTestId('player-display-page')).toHaveAttribute('data-display-mode', 'npc-grid');
  await expect(page.locator('.rqk-player-display__npc-card')).toHaveCount(8);
  await expect(page.getByText('Page 1 of 3 · 17 NPCs')).toBeVisible();
  await page.getByRole('button', { name: 'Next NPC page' }).click();
  await expect(page.getByText('Page 2 of 3 · 17 NPCs')).toBeVisible();
  await expect(page.locator('.rqk-player-display__npc-card')).toHaveCount(8);
  await page.getByRole('button', { name: 'Next NPC page' }).click();
  await expect(page.getByText('Page 3 of 3 · 17 NPCs')).toBeVisible();
  await expect(page.locator('.rqk-player-display__npc-card')).toHaveCount(1);
  await expect(page.getByText('NPC 17')).toBeVisible();
  await assertFitsViewport(page, 1280);
});

test('a physical TV keeps its layout even when the last GM broadcast targeted a table', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await avoidThirdPartyRequests(page);
  await page.addInitScript(() => {
    sessionStorage.setItem('rqk.readOnlyDemo.v1', '1');
    localStorage.setItem('rqk.liveDisplay.browser-smoke-target', JSON.stringify({
      mode: 'title', sync_id: 'layout-test', sequence: 4102444799000,
      updated_at: '2099-12-31T23:59:59.000Z',
      payload: {
        display_target: 'virtual-table', title: 'A New Scene',
      },
    }));
  });
  await page.goto('/player-display/browser-smoke-target?target=standing-tv');
  await expect(page.getByTestId('player-display-page')).toHaveAttribute('data-display-target', 'standing-tv');
  await expect(page.getByRole('heading', { name: 'A New Scene' })).toBeVisible();
  await page.goto('/player-display/browser-smoke-target?target=virtual-table');
  await expect(page.getByTestId('player-display-page')).toHaveAttribute('data-display-target', 'virtual-table');
});


test('desktop primary control sweeps wax-red left to right and returns to blue', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await avoidThirdPartyRequests(page);
  await page.goto('/');
  const button = page.getByTestId('landing-signin-btn');
  await expect(button).toBeVisible();
  const readStyle = () => button.evaluate(node => {
    const style = getComputedStyle(node);
    return {
      backgroundColor: style.backgroundColor,
      backgroundImage: style.backgroundImage,
      backgroundSize: style.backgroundSize,
      transitionDuration: style.transitionDuration,
    };
  });
  const resting = await readStyle();
  expect(resting.backgroundColor).toBe('rgb(38, 63, 89)');
  expect(resting.backgroundImage).toContain('126, 45, 45');
  expect(resting.backgroundSize).toContain('0% 100%');
  expect(resting.transitionDuration).toContain('0.34s');

  await button.hover();
  await expect.poll(async () => (await readStyle()).backgroundSize).toContain('100% 100%');
  await page.mouse.move(4, 600);
  await expect.poll(async () => (await readStyle()).backgroundSize).toContain('0% 100%');
});

test('auth selected tabs remain red, while inactive tabs stay blue', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await avoidThirdPartyRequests(page);
  await page.goto('/');
  await page.getByTestId('landing-signin-btn').click();
  const login = page.getByRole('tab', { name: 'Sign in' });
  const register = page.getByRole('tab', { name: 'Create account' });
  await expect(login).toHaveAttribute('aria-selected', 'true');
  await expect(login).toHaveCSS('background-size', '100% 100%');
  await register.click();
  await expect(register).toHaveAttribute('aria-selected', 'true');
  await expect(register).toHaveCSS('background-size', '100% 100%');
  await expect(login).toHaveAttribute('aria-selected', 'false');
  await page.mouse.move(4, 600);
  await expect(login).toHaveCSS('background-size', '0% 100%');
  await assertFitsViewport(page, 390);
});

test('reduced-motion preference keeps instant wax selection without animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await avoidThirdPartyRequests(page);
  await page.goto('/');
  const button = page.getByTestId('landing-signin-btn');
  await expect(button).toBeVisible();
  await expect(button).toHaveCSS('transition-duration', '0s');
  await button.hover();
  await expect(button).toHaveCSS('background-size', '100% 100%');
});
