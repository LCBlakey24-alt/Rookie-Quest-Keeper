import { test, expect, type Page } from '@playwright/test';

// This suite exercises a fresh built web app, not an existing PWA installation.
// Prevent a previously installed service worker from replaying stale assets
// while asserting route changes and final CSS.
test.use({ serviceWorkers: 'block' });

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


// Live Play should use one sticky vertical rail on large screens, but one
// horizontally swipeable navigation row on phones. Never make the full page
// wider than the viewport merely to show all six tool choices.
for (const viewport of [
  { label: 'phone', width: 390, height: 844 },
  { label: 'small phone', width: 320, height: 780 },
  { label: 'desktop', width: 1440, height: 900 },
]) {
  test(`Live Play navigation geometry uses the correct ${viewport.label} layout`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await avoidThirdPartyRequests(page);
    await page.goto('/gm-screen/preview-campaign?demo=1');
    const nav = page.getByRole('navigation', { name: 'Live Play' });
    await expect(nav).toBeVisible();
    const geometry = await nav.evaluate(element => {
      const buttons = [...element.querySelectorAll('button')];
      const first = buttons[0]?.getBoundingClientRect();
      const last = buttons[buttons.length - 1]?.getBoundingClientRect();
      return {
        display: getComputedStyle(element).display,
        direction: getComputedStyle(element).flexDirection,
        navWidth: Math.round(element.getBoundingClientRect().width),
        scrollWidth: element.scrollWidth,
        firstY: first?.y,
        lastY: last?.y,
      };
    });
    if (viewport.width < 720) {
      expect(geometry.display).toBe('flex');
      expect(geometry.direction).toBe('row');
      expect(Math.abs((geometry.firstY || 0) - (geometry.lastY || 0))).toBeLessThan(3);
      expect(geometry.scrollWidth).toBeGreaterThan(geometry.navWidth);
    } else {
      expect(geometry.display).toBe('flex');
      expect(geometry.direction).toBe('column');
    }
    await assertFitsViewport(page, viewport.width);
  });
}

for (const size of appSizes) {
  test(`GM Live Play keeps display controls usable at ${size.label} (${size.width}x${size.height})`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await avoidThirdPartyRequests(page);
    await page.goto('/gm-screen/preview-campaign?demo=1');
    await expect(page.getByTestId('live-session-grid')).toBeVisible();
    const nav = page.getByRole('navigation', { name: 'Live Play' });
    const navBounds = await nav.boundingBox();
    expect(navBounds?.y, 'GM tools should be reachable within the first screen').toBeLessThan(size.height);
    const dock = page.getByTestId('live-second-screen-dock');
    await expect(dock).toHaveCount(1);

    const toggle = page.getByRole('button', { name: 'Display controls' });
    if (size.width <= 1180) {
      await expect(toggle).toBeVisible();
      const toggleBounds = await toggle.boundingBox();
      expect(toggleBounds, 'Display controls need a visible, reachable place before GM tools').not.toBeNull();
      expect((toggleBounds?.y || 0) + (toggleBounds?.height || 0)).toBeLessThanOrEqual(navBounds?.y || 0);
      await expect(dock).toBeHidden();
      await toggle.click();
      await expect(page.getByRole('dialog', { name: 'Live display controls' })).toBeVisible();
      await expect(dock).toBeVisible();
      const buttonHeights = await dock.locator('button').evaluateAll(buttons => buttons.map(button => button.getBoundingClientRect().height));
      expect(Math.min(...buttonHeights), 'Tablet and phone display controls need 44px targets').toBeGreaterThanOrEqual(44);
      await page.getByRole('button', { name: 'Close display controls' }).click();
      await expect(dock).toBeHidden();
    } else {
      await expect(toggle).toBeHidden();
      await expect(dock).toBeVisible();
      const buttonHeights = await dock.locator('button').evaluateAll(buttons => buttons.map(button => button.getBoundingClientRect().height));
      expect(Math.min(...buttonHeights), 'Desktop display controls need 40px targets').toBeGreaterThanOrEqual(40);
    }
    await assertFitsViewport(page, size.width);
  });
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
    await expect(page).toHaveURL(/\/auth(?:\?|$)/);
    await expect(page.getByTestId('auth-page')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await expect(page.locator('#login-identifier')).toBeVisible();
    await expect(page.locator('#login-password')).toBeVisible();
    await assertFitsViewport(page, size.width);
  });
}

// Touch targets. docs/DESIGN_SYSTEM.md sets ~44px as the floor on phones.
//
// This is a browser check rather than a stylesheet scan because the
// stylesheets set heights for the same control in several places across
// several breakpoints, and public/rq-polish.css then overrides some of them
// with !important. Reading the CSS found three undersized controls; measuring
// the rendered page found nine, including footer links at 30px and the
// landing card links at 24px.
for (const size of [
  { label: 'small phone', width: 320 },
  { label: 'phone', width: 390 },
]) {
  for (const route of ['/', '/auth', '/auth?mode=register']) {
    test(`every control on ${route} clears 44px at ${size.label} (${size.width}px)`, async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: 780 });
      await avoidThirdPartyRequests(page);
      await page.goto(route);
      await expect(page.locator('#root')).toBeVisible();
      // Let entrance motion and any responsive JS settle before measuring.
      await page.waitForTimeout(1200);

      const undersized = await page.evaluate(() => {
        const visible = (el: Element) => {
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && getComputedStyle(el).visibility !== 'hidden';
        };
        return [...document.querySelectorAll('button, [role="button"], [role="tab"]')]
          .filter(visible)
          .map(el => ({ height: Math.round(el.getBoundingClientRect().height), label: (el.textContent || '').trim().slice(0, 24) }))
          .filter(item => item.height < 44)
          .map(item => `${item.label || '(unlabelled)'} -> ${item.height}px`);
      });

      expect(undersized, 'controls below the 44px touch-target floor').toEqual([]);
      await assertFitsViewport(page, size.width);
    });
  }
}

// The landing hero puts a mock app screenshot beside the copy. It is the
// first thing a visitor sees, and it has a lot of internal structure -- a
// sidebar, a tab row, a four-up stat grid -- so it needs real width.
//
// It used to stay two-column down to 761px, because public/rq-polish.css is
// linked outside the build and its !important rules beat the bundled
// stylesheet's 1040px collapse. At 768px, iPad portrait, the preview was
// squeezed to roughly 330px and its labels broke mid-word: "Overvie/w",
// "SES/SIO/NS", "CHA/RAC/TER/S".
//
// 1181px is where desktop starts per docs/DESIGN_SYSTEM.md.
for (const size of [
  { label: 'tablet portrait', width: 768, height: 1024 },
  { label: 'tablet landscape', width: 1024, height: 768 },
  { label: 'tablet ceiling', width: 1180, height: 900 },
]) {
  test(`landing hero is one column at ${size.label} (${size.width}px)`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await avoidThirdPartyRequests(page);
    await page.goto('/');
    await expect(page.getByTestId('landing-page')).toBeVisible();

    const columns = await page.evaluate(() => {
      const hero = document.querySelector('.landing-final-hero');
      return hero ? getComputedStyle(hero).gridTemplateColumns.trim().split(/\s+/).length : 0;
    });
    expect(columns, 'hero should be a single column below the desktop breakpoint').toBe(1);

    // The preview must get enough width that its labels stop wrapping.
    const previewWidth = await page.evaluate(() => {
      const preview = document.querySelector('.landing-app-preview');
      return preview ? Math.round(preview.getBoundingClientRect().width) : 0;
    });
    expect(previewWidth).toBeGreaterThan(420);

    await assertFitsViewport(page, size.width);
  });
}

test('landing hero is two columns on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await avoidThirdPartyRequests(page);
  await page.goto('/');
  await expect(page.getByTestId('landing-page')).toBeVisible();

  const columns = await page.evaluate(() => {
    const hero = document.querySelector('.landing-final-hero');
    return hero ? getComputedStyle(hero).gridTemplateColumns.trim().split(/\s+/).length : 0;
  });
  expect(columns, 'the two-column hero should still apply on desktop').toBe(2);
});

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


test('desktop blue control reveals only the citrus gradient underline on hover', async ({ page }) => {
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
  expect(resting.backgroundColor).toBe('rgb(11, 27, 43)');
  expect(resting.backgroundImage).toContain('255, 138, 31');
  expect(resting.backgroundSize).toMatch(/^0(?:px|%) 3px$/);
  expect(resting.transitionDuration).toContain('0.34s');

  await button.hover();
  await expect(button).toHaveCSS('background-size', '100% 3px');
  await page.mouse.move(4, 600);
  await expect.poll(async () => (await readStyle()).backgroundSize).toMatch(/^0(?:px|%) 3px$/);
});

test('auth selected tabs keep blue fill with a persistent citrus underline', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await avoidThirdPartyRequests(page);
  await page.goto('/');
  await page.getByTestId('landing-signin-btn').click();
  const login = page.getByRole('tab', { name: 'Sign in' });
  const register = page.getByRole('tab', { name: 'Create account' });
  await expect(login).toHaveAttribute('aria-selected', 'true');
  await expect(login).toHaveCSS('background-size', '100% 3px');
  await register.click();
  await expect(register).toHaveAttribute('aria-selected', 'true');
  await expect(register).toHaveCSS('background-size', '100% 3px');
  await expect(login).toHaveAttribute('aria-selected', 'false');
  await page.mouse.move(4, 600);
  await expect(login).toHaveCSS('background-size', /^0(?:px|%) 3px$/);
  await assertFitsViewport(page, 390);
});

test('reduced-motion preference keeps instant citrus underline without animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await avoidThirdPartyRequests(page);
  await page.goto('/');
  const button = page.getByTestId('landing-signin-btn');
  await expect(button).toBeVisible();
  await expect(button).toHaveCSS('transition-duration', '0s');
  await button.hover();
  await expect(button).toHaveCSS('background-size', '100% 3px');
});

test('page surfaces are flat navy and never use the retired craft-paper texture', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await avoidThirdPartyRequests(page);
  await page.goto('/');
  const landing = page.getByTestId('landing-page');
  await expect(landing).toBeVisible();
  await expect(landing).toHaveCSS('background-image', 'none');
  await expect(landing).toHaveCSS('background-color', 'rgb(11, 27, 43)');
  await page.getByTestId('landing-signin-btn').click();
  const login = page.getByTestId('auth-page');
  await expect(login).toBeVisible();
  await expect(login).toHaveCSS('background-image', 'none');
  await expect(login).toHaveCSS('background-color', 'rgb(11, 27, 43)');
});

test('1080p player display keeps a flat dark-navy frame without wallpaper', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await avoidThirdPartyRequests(page);
  await page.addInitScript(() => {
    sessionStorage.setItem('rqk.readOnlyDemo.v1', '1');
  });
  await page.goto('/player-display/browser-smoke-flat-navy?target=standing-tv');
  const screen = page.getByTestId('player-display-page');
  await expect(screen).toBeVisible();
  await expect(screen).toHaveAttribute('data-display-target', 'standing-tv');
  const frame = page.locator('.rqk-player-display__frame');
  await expect(frame).toBeVisible();
  await expect(frame).toHaveCSS('background-image', 'none');
  await expect(frame).toHaveCSS('background-color', 'rgb(11, 27, 43)');
});


// Synthetic campaign GM Home: measure actual controls and real clicks.
// Sidebar expansion belongs to pending PR #744; do not duplicate it here.
const gmHomeSizes = [
  { label: 'small phone', width: 360, height: 800, minTarget: 46 },
  { label: 'phone', width: 390, height: 844, minTarget: 46 },
  { label: 'tablet portrait', width: 768, height: 1024, minTarget: 44 },
  { label: 'tablet landscape', width: 1024, height: 768, minTarget: 44 },
  { label: 'scaled laptop', width: 1180, height: 820, minTarget: 44 },
  { label: 'desktop', width: 1440, height: 900, minTarget: 40 },
];
for (const size of gmHomeSizes) {
  test(`GM Home controls are reachable and meet the ${size.minTarget}px floor at ${size.label`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await avoidThirdPartyRequests(page);
    await page.goto('/campaign/preview-campaign?demo=1');
    await expect(page.locator('.campaign-dashboard-simple')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Campaign Command Centre' })).toBeVisible();

    const targets = await page.evaluate(() => {
      const controls = [...document.querySelectorAll(
        '.campaign-home-command-actions button, .campaign-home-session-rail__action, ' +
        '.campaign-dashboard-actions button, .campaign-icon-button'
      )];
      return controls.filter(el => {
        const bounds = el.getBoundingClientRect();
        return bounds.width > 0 && bounds.height > 0 && getComputedStyle(el).visibility !== 'hidden';
      }).map(el => ({
        name: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 42),
        height: Math.round(el.getBoundingClientRect().height),
      }));
    });
    expect(targets.length).toBeGreaterThan(3);
    expect(targets.filter(x => x.height < size.minTarget), 'Undersized GM buttons').toEqual([]);

    const focusTarget = page.locator('.campaign-home-command-actions button').first();
    await focusTarget.focus();
    await expect(focusTarget).toBeFocused();
    const color = await focusTarget.evaluate(el => getComputedStyle(el).outlineColor);
    expect(color, 'Focus must use the shared ledger blue').toBe('rgb(60, 146, 224)');

    // Real pointer click: Playwright will reject covered controls.
    await page.locator('.campaign-home-command-actions button').last().click();
    await assertFitsViewport(page, size.width);
  });
}
