import { test, expect, type Page } from '@playwright/test';

// Horizontal workspaces should retain their own tablet/desktop rail, useful
// content width, navigation hitboxes, and readable public-entry controls.
// We never use a real account, campaign or production API in this smoke suite.
test.use({ serviceWorkers: 'block' });

const viewports = [
  { label: 'landscape tablet', width: 1024, height: 768, device: 'tablet' },
  { label: 'wide landscape tablet', width: 1180, height: 820, device: 'tablet' },
  { label: 'laptop', width: 1366, height: 768, device: 'desktop' },
  { label: 'desktop', width: 1440, height: 900, device: 'desktop' },
  { label: 'large monitor', width: 1920, height: 1080, device: 'desktop' },
] as const;

const shellPages = [
  '/home',
  '/characters',
  '/campaigns',
  '/homebrew',
  '/community',
  '/account',
  '/uploads',
  '/characters/import',
  '/characters/new',
] as const;

const token = (() => {
  const b64 = (v: object) => Buffer.from(JSON.stringify(v)).toString('base64url');
  return `${b64({ alg: 'HS256' })}.${b64({ sub: 'horizontal-audit-user', exp: 4102444800 })}.sig`;
})();

async function mockIsolatedAccount(page: Page) {
  await page.addInitScript(t => {
    localStorage.setItem('dm_token', t);
    localStorage.setItem('dm_username', 'horizontal-audit-user');
  }, token);

  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    let data: unknown = {};
    if (path === '/api/auth/me') data = { username: 'horizontal-audit-user' };
    else if (path === '/api/admin/check') data = { is_admin: false };
    else if (path === '/api/dashboard/bootstrap') data = { characters: [], campaigns: [], homebrew_items: [], site_settings: {}, is_admin: false };
    else if (path === '/api/characters' || path === '/api/campaigns' || path === '/api/uploads') data = [];
    else if (path === '/api/homebrew') data = { homebrew: {} };
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
  });
  await page.route('**/*', route => route.request().url().startsWith('http://127.0.0.1:4173/')
    ? route.continue() : route.abort());
}

async function assertNoPageOverflow(page: Page, width: number, description: string) {
  const actual = await page.evaluate(() => ({
    windowWidth: innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
  }));
  expect(actual.windowWidth, description).toBe(width);
  expect(actual.documentWidth, description + ' scrollWidth').toBeLessThanOrEqual(width + 2);
  expect(actual.bodyWidth, description + ' body width').toBeLessThanOrEqual(width + 2);
}

for (const size of viewports) {
  test(`public pages stay readable at ${size.label} (${size.width}x${size.height})`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await page.route('**/*', route => route.request().url().startsWith('http://127.0.0.1:4173/')
      ? route.continue() : route.abort());

    await page.goto('/');
    await expect(page.getByTestId('landing-page')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Your campaign/i })).toBeVisible();
    await expect(page.getByTestId('landing-signin-btn')).toBeVisible();
    await assertNoPageOverflow(page, size.width, 'landing');

    await page.getByTestId('landing-signin-btn').click();
    await expect(page.getByTestId('auth-page')).toBeVisible();
    await expect(page.locator('#login-identifier')).toBeVisible();
    await expect(page.locator('#login-password')).toBeVisible();
    await assertNoPageOverflow(page, size.width, 'sign in');

    // The main login action must not fall back to invisible navy-on-navy text.
    const contrast = await page.locator('.rqk-auth-primary').first().evaluate(el => {
      const style = getComputedStyle(el);
      return { text: style.color, background: style.backgroundColor, width: el.getBoundingClientRect().width };
    });
    expect(contrast.text).not.toBe(contrast.background);
    expect(contrast.width).toBeGreaterThan(100);

    await page.getByRole('tab', { name: 'Create account' }).click();
    await expect(page.getByTestId('auth-page')).toBeVisible();
    await assertNoPageOverflow(page, size.width, 'create account');
  });

  test(`core signed-in page families keep aligned rails at ${size.label} (${size.width}x${size.height})`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await mockIsolatedAccount(page);

    for (const path of shellPages) {
      await page.goto(path);
      const shell = page.locator('.rqk-app-shell');
      const rail = page.getByRole('complementary', { name: 'App navigation' });
      const content = shell.locator('.rqk-app-shell-content');
      await expect(shell, path).toBeVisible();
      await expect(shell, path).toHaveAttribute('data-rq-device', size.device);
      await expect(rail, path).toBeVisible();
      await expect(content, path).toBeVisible();
      await expect(rail.getByRole('navigation', { name: 'Main app sections' }).getByRole('link')).toHaveCount(5);

      const geometry = await shell.evaluate(el => {
        const box = (target: Element | null) => {
          if (!target) return null;
          const r = target.getBoundingClientRect();
          return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom };
        };
        return {
          rail: box(el.querySelector('.rqk-app-rail')),
          workspace: box(el.querySelector('.rqk-app-workspace')),
          content: box(el.querySelector('.rqk-app-shell-content')),
          firstNav: box(el.querySelector('.rqk-app-rail-nav a')),
          shell: box(el),
        };
      });
      expect(geometry.rail, path + ' rail').not.toBeNull();
      expect(geometry.workspace, path + ' workspace').not.toBeNull();
      expect(geometry.content, path + ' content').not.toBeNull();
      expect(geometry.firstNav, path + ' navigation').not.toBeNull();
      expect(geometry.rail!.width, path + ' rail width').toBeGreaterThanOrEqual(64);
      expect(geometry.rail!.width, path + ' rail width').toBeLessThanOrEqual(250);
      expect(geometry.rail!.right, path + ' rail covers main workspace').toBeLessThanOrEqual(geometry.workspace!.x + 2);
      expect(geometry.content!.x, path + ' content crosses rail').toBeGreaterThanOrEqual(geometry.workspace!.x - 2);
      expect(geometry.content!.right, path + ' content leaves viewport').toBeLessThanOrEqual(size.width + 2);
      expect(geometry.workspace!.width, path + ' workspace too cramped').toBeGreaterThan(size.device === 'tablet' ? 550 : 900);
      expect(geometry.firstNav!.width, path + ' navigation not clickable').toBeGreaterThanOrEqual(40);
      await assertNoPageOverflow(page, size.width, path);
    }
  });
}

// This long-form working surface previously stacked a global rail, campaign
// sidebar, record list, and detail panel and can look fine on Home but break
// once a campaign opens. Exercise it separately at the key horizontal sizes.
for (const size of [viewports[0], viewports[2], viewports[4]]) {
  test(`campaign workspace remains accessible at ${size.label} (${size.width}x${size.height})`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await mockIsolatedAccount(page);
    await page.goto('/campaign/preview-campaign');
    const shell = page.locator('.rqk-app-shell');
    const rail = page.getByRole('complementary', { name: 'App navigation' });
    await expect(shell).toBeVisible();
    await expect(rail).toBeVisible();
    await expect(shell).toHaveAttribute('data-rq-device', size.device);
    await assertNoPageOverflow(page, size.width, 'campaign workspace');
    const side = await rail.boundingBox();
    const space = await shell.locator('.rqk-app-workspace').boundingBox();
    expect(side && space).toBeTruthy();
    expect(side!.x + side!.width).toBeLessThanOrEqual(space!.x + 2);
    expect(space!.width).toBeGreaterThan(size.device === 'tablet' ? 550 : 900);
  });
}
