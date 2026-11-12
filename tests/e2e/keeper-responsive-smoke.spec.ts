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

const syntheticDisplayToken = (() => {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'HS256' })}.${encode({ sub: 'responsive-display-user', exp: 4102444800 })}.sig`;
})();

function rectanglesOverlap(left: { x: number; y: number; width: number; height: number } | null, right: { x: number; y: number; width: number; height: number } | null) {
  if (!left || !right) return false;
  return left.x < right.x + right.width
    && left.x + left.width > right.x
    && left.y < right.y + right.height
    && left.y + left.height > right.y;
}

test('Player Display fixed controls never cover its security and sync status', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.addInitScript(token => {
    localStorage.setItem('dm_token', token);
    localStorage.setItem('dm_username', 'responsive-display-user');
    class QuietWebSocket {
      readyState = 0;
      send() {}
      close() { this.readyState = 3; }
    }
    window.WebSocket = QuietWebSocket as unknown as typeof WebSocket;
  }, syntheticDisplayToken);
  await page.route('**/api/**', route => {
    const url = route.request().url();
    if (url.endsWith('/auth/me')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{"username":"responsive-display-user"}' });
    if (url.endsWith('/display-state')) return route.fulfill({ status: 403, contentType: 'application/json', body: '{"detail":"Forbidden"}' });
    if (url.endsWith('/players')) return route.fulfill({ status: 503, contentType: 'application/json', body: '{"detail":"Synthetic party outage"}' });
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  await page.goto('/player-display/responsive-campaign');
  const display = page.getByTestId('player-display-page');
  const fullscreen = display.locator('.rqk-player-display__fullscreen');
  const warning = display.getByText(/Party sync unavailable/i);
  const footerContext = display.locator('.rqk-player-display__footer > span').first();
  const syncStatus = page.getByTestId('player-display-sync-status');
  const feedback = page.getByTestId('global-feedback-btn');
  const dice = page.locator('.rq-floating-dice');
  await expect(syncStatus).toContainText('No access');
  await expect(warning).toBeVisible();
  await expect(feedback).toBeVisible();
  await expect(dice).toBeVisible();

  const [fullscreenBox, warningBox, feedbackBox, syncBox, diceBox, contextBox] = await Promise.all([
    fullscreen.boundingBox(), warning.boundingBox(), feedback.boundingBox(), syncStatus.boundingBox(), dice.boundingBox(), footerContext.boundingBox(),
  ]);
  expect(await fullscreen.evaluate(element => element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  expect(rectanglesOverlap(fullscreenBox, warningBox), 'Fullscreen covered the party-sync warning').toBe(false);
  expect(rectanglesOverlap(feedbackBox, syncBox), 'Feedback covered the access/sync status').toBe(false);
  expect(rectanglesOverlap(diceBox, contextBox), 'Dice covered the display context footer').toBe(false);
  await assertFitsViewport(page, 1024);
});


// Live Play now has a grouped vertical rail on desktop and tablet, and a
// Tools button + accessible drawer on phones. Assert the actual navigation
// contract, rather than the retired horizontal six-tool strip.
for (const viewport of [
  { label: 'phone', width: 390, height: 844 },
  { label: 'small phone', width: 320, height: 780 },
  { label: 'desktop', width: 1440, height: 900 },
]) {
  test(`Live Play navigation geometry uses the correct ${viewport.label} layout`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await avoidThirdPartyRequests(page);
    await page.goto('/gm-screen/preview-campaign?demo=1');

    const grid = page.getByTestId('live-session-grid');
    await expect(grid).toBeVisible();
    if (viewport.width < 720) {
      await expect(grid).toHaveAttribute('data-rq-live-variant', 'phone');
      const menu = page.getByTestId('live-tool-menu');
      await expect(menu).toBeVisible();
      await expect(page.getByTestId('live-tool-rail')).toHaveCount(0);
      await menu.focus();
      await page.keyboard.press('Enter');

      const drawer = page.getByTestId('live-tool-rail');
      await expect(drawer).toBeVisible();
      await expect(drawer).toHaveAttribute('role', 'dialog');
      await expect(drawer.getByTestId('live-tool-combat')).toBeVisible();
      const bounds = await drawer.boundingBox();
      expect(bounds?.width).toBeLessThanOrEqual(viewport.width);
      expect(bounds?.x).toBeGreaterThanOrEqual(0);
      await page.keyboard.press('Escape');
      await expect(drawer).toHaveCount(0);
      await expect(menu).toBeFocused();
    } else {
      await expect(grid).toHaveAttribute('data-rq-live-variant', 'desktop');
      const rail = page.getByTestId('live-tool-rail');
      await expect(rail).toBeVisible();
      const bounds = await rail.boundingBox();
      expect(bounds?.width).toBeGreaterThanOrEqual(220);
      expect(bounds?.width).toBeLessThanOrEqual(260);
      await expect(rail.getByTestId('live-tool-combat')).toBeVisible();
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
    const navAnchor = size.width < 720 ? page.getByTestId('live-tool-menu') : page.getByTestId('live-tool-rail');
    await expect(navAnchor).toBeVisible();
    const navBounds = await navAnchor.boundingBox();
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
  test(`Encounter Review is keyboard-usable and fits ${size.label} (${size.width}x${size.height})`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await avoidThirdPartyRequests(page);
    await page.goto('/gm-screen/preview-campaign?demo=1');

    // On phones the encounter control lives in the closed Tools drawer.
    // Keyboard users open the drawer first, then activate Encounters.
    let encounters;
    if (size.width < 720) {
      const menu = page.getByTestId('live-tool-menu');
      await menu.focus();
      await page.keyboard.press('Enter');
      const drawer = page.getByTestId('live-tool-rail');
      await expect(drawer).toBeVisible();
      encounters = drawer.getByTestId('live-tool-combat');
    } else {
      encounters = page.getByTestId('live-tool-combat');
    }
    await encounters.focus();
    await expect(encounters).toBeFocused();
    await page.keyboard.press('Enter');
    if (size.width < 720) await expect(page.getByTestId('live-tool-rail')).toHaveCount(0);

    const launcher = page.getByTestId('live-encounter-launcher');
    await expect(launcher).toBeVisible();
    const choice = launcher.getByRole('combobox', { name: 'Choose battle type' });
    await expect(choice).toHaveValue('');
    await expect(choice.getByRole('option', { name: /Impromptu Battle/i })).toBeAttached();
    const launch = launcher.getByRole('button', { name: 'Start Impromptu Battle' });
    await expect(launch).toBeVisible();
    await expect(page.getByText(/No preparation needed/i)).toBeVisible();
    await expect(page.getByTestId('live-data-warning')).toHaveCount(0);

    // The battle-map choice belongs in keyboard order between encounter
    // selection and the Reset/Start controls. Preserve 44px tap targets.
    const battleMap = launcher.getByRole('combobox', { name: 'Battle map for this encounter' });
    const reset = launcher.getByRole('button', { name: 'Reset review' });
    const [choiceBounds, mapBounds, resetBounds, launchBounds] = await Promise.all([
      choice.boundingBox(), battleMap.boundingBox(), reset.boundingBox(), launch.boundingBox(),
    ]);
    expect(choiceBounds?.height).toBeGreaterThanOrEqual(44);
    expect(mapBounds?.height).toBeGreaterThanOrEqual(44);
    expect(resetBounds?.height).toBeGreaterThanOrEqual(44);
    expect(launchBounds?.height).toBeGreaterThanOrEqual(44);
    await choice.focus();
    await expect(choice).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(battleMap).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(reset).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(launch).toBeFocused();
    await assertFitsViewport(page, size.width);

    await testInfo.attach(`encounter-review-${size.label}`, {
      body: await page.screenshot(),
      contentType: 'image/png',
    });
  });
}

// No fixed Offline pill may cover the global nav, GM rail or encounter controls.
// The campaign pack manager remains accessible only after a deliberate action.
for (const size of [
  { label: 'phone', width: 390, height: 844 },
  { label: 'tablet', width: 768, height: 1024 },
  { label: 'desktop', width: 1440, height: 900 },
]) {
  test('GM Live has no floating Offline tab at ' + size.label, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await avoidThirdPartyRequests(page);
    await page.goto('/gm-screen/preview-campaign?demo=1');
    await expect(page.getByTestId('live-session-grid')).toBeVisible();
    await expect(page.locator('.rqk-offline-launcher')).toHaveCount(0);
    await expect(page.locator('.rqk-offline-card')).toHaveCount(0);
    await assertFitsViewport(page, size.width);
  });
}

test('GM More opens offline-copy manager and can close it without a floating launcher', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await avoidThirdPartyRequests(page);
  await page.goto('/campaign/preview-campaign?demo=1');
  await expect(page.getByTestId('gm-active-workspace')).toBeVisible();
  await expect(page.locator('.rqk-offline-launcher')).toHaveCount(0);
  // The PWA manager discovers the route using a light 600ms observer.
  await page.waitForTimeout(700);
  await page.locator('.campaign-dashboard-group-row').getByRole('button', { name: 'More', exact: true }).click();
  await page.getByTestId('gm-offline-copy-action').click();
  await expect(page.getByRole('region', { name: 'Offline campaign' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Download Campaign|Refresh Copy/ })).toBeVisible();
  await page.getByRole('button', { name: 'Close offline campaign panel' }).click();
  await expect(page.locator('.rqk-offline-card')).toHaveCount(0);
  await expect(page.locator('.rqk-offline-launcher')).toHaveCount(0);
});

test('players can still access their offline copy from their campaign details', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await avoidThirdPartyRequests(page);
  await page.goto('/player/campaign/preview-campaign?demo=1');
  const saveOffline = page.getByRole('button', { name: /Save for offline play/ });
  await expect(saveOffline).toBeVisible();
  await page.waitForTimeout(700);
  await saveOffline.click();
  await expect(page.getByRole('region', { name: 'Offline campaign' })).toBeVisible();
  await expect(page.getByText('Offline Player Pack')).toBeVisible();
  await page.getByRole('button', { name: 'Close offline campaign panel' }).click();
});

for (const size of [
  { label: 'phone', width: 390, height: 844 },
  { label: 'desktop', width: 1440, height: 900 },
]) {
  test('dice opens from integrated navigation without a floating launcher on ' + size.label, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await avoidThirdPartyRequests(page);
    await page.goto('/campaign/preview-campaign?demo=1');
    await expect(page.getByTestId('gm-active-workspace')).toBeVisible();
    const floating = page.getByTestId('dice-roller-toggle');
    await expect(floating).toBeHidden();
    if (size.width >= 720) {
      const rail = page.getByRole('complementary', { name: 'App navigation' });
      const trigger = rail.getByRole('button', { name: 'Open dice roller' });
      await expect(trigger).toBeVisible();
      const [triggerBox, railBox] = await Promise.all([trigger.boundingBox(), rail.boundingBox()]);
      expect(triggerBox && railBox).toBeTruthy();
      expect((triggerBox?.x || 0) + (triggerBox?.width || 0), 'Dice action must fit inside the real app rail')
        .toBeLessThanOrEqual((railBox?.x || 0) + (railBox?.width || 0) + 2);
      await trigger.click();
    } else {
      await page.getByRole('button', { name: 'Open more tools' }).click();
      await page.getByRole('menuitem', { name: 'Dice roller' }).click();
    }
    await expect(page.getByTestId('dice-roller-panel')).toBeVisible();
    const panel = await page.getByTestId('dice-roller-panel').boundingBox();
    expect(panel).not.toBeNull();
    expect((panel?.x || 0) + (panel?.width || 0)).toBeLessThanOrEqual(size.width + 1);
    // The desktop tray leaves a protected right-hand lane for Rook and
    // feedback buttons, rather than covering those fixed launchers.
    if (size.width >= 720) {
      expect(size.width - ((panel?.x || 0) + (panel?.width || 0))).toBeGreaterThanOrEqual(100);
    }
    await page.getByTestId('dice-roller-close').click();
    await expect(page.getByTestId('dice-roller-panel')).toHaveCount(0);
    await expect(floating).toBeHidden();
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

    // The hero picture is the character sheet's wheel; it must get room to
    // read (its own size caps at 440px, as on the sheet).
    const wheelWidth = await page.evaluate(() => {
      const wheel = document.querySelector('.landing-wheel');
      return wheel ? Math.round(wheel.getBoundingClientRect().width) : 0;
    });
    expect(wheelWidth).toBeGreaterThan(300);

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

    // The demo workspace's own campaign: a campaign that does not exist is
    // refused (404) and its display is blanked, by design (#773).
    const campaignId = 'preview-campaign';
    // Display records are owned (#773): the read-only demo's scope is
    // 'local-preview', and an unowned v1 record is refused by design.
    await page.addInitScript(id => {
      sessionStorage.setItem('rqk.readOnlyDemo.v1', '1');
      localStorage.setItem(`rqk.liveDisplay.v2.local-preview.${encodeURIComponent(id)}`, JSON.stringify({ owner: 'local-preview', campaign_id: id, state: {
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
      } }));
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
    localStorage.setItem('rqk.liveDisplay.v2.local-preview.preview-campaign', JSON.stringify({ owner: 'local-preview', campaign_id: 'preview-campaign', state: {
      mode: 'npc-grid', sync_id: 'paging-test', sequence: 4102444799000,
      updated_at: '2099-12-31T23:59:59.000Z',
      payload: {
        display_target: 'standing-tv', title: 'The Full Council',
        npcs: Array.from({ length: 17 }, (_, index) => ({
          id: String(index + 1), name: `NPC ${index + 1}`,
        })),
      },
    } }));
  });
  await page.goto('/player-display/preview-campaign?target=standing-tv');
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
    localStorage.setItem('rqk.liveDisplay.v2.local-preview.preview-campaign', JSON.stringify({ owner: 'local-preview', campaign_id: 'preview-campaign', state: {
      mode: 'title', sync_id: 'layout-test', sequence: 4102444799000,
      updated_at: '2099-12-31T23:59:59.000Z',
      payload: {
        display_target: 'virtual-table', title: 'A New Scene',
      },
    } }));
  });
  await page.goto('/player-display/preview-campaign?target=standing-tv');
  await expect(page.getByTestId('player-display-page')).toHaveAttribute('data-display-target', 'standing-tv');
  await expect(page.getByRole('heading', { name: 'A New Scene' })).toBeVisible();
  await page.goto('/player-display/preview-campaign?target=virtual-table');
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
  expect(resting.backgroundColor).toBe('rgb(10, 35, 66)');
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
  await expect(landing).toHaveCSS('background-color', 'rgb(10, 35, 66)');
  await page.getByTestId('landing-signin-btn').click();
  const login = page.getByTestId('auth-page');
  await expect(login).toBeVisible();
  await expect(login).toHaveCSS('background-image', 'none');
  await expect(login).toHaveCSS('background-color', 'rgb(10, 35, 66)');
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
  await expect(frame).toHaveCSS('background-color', 'rgb(10, 35, 66)');
});


// Browser regression for #779. These are real interactions against the built
// frontend, but every /api request is answered by an in-memory fixture. The
// test never sends writes to the hosted API or uses a real account.
for (const size of [
  { label: 'phone', width: 390, height: 844 },
  { label: 'desktop', width: 1440, height: 900 },
]) {
  test('rapid HP and temporary HP taps persist through a slow server on ' + size.label, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await page.addInitScript(token => {
      localStorage.setItem('dm_token', token);
      localStorage.setItem('dm_username', 'responsive-display-user');
    }, syntheticDisplayToken);
    await avoidThirdPartyRequests(page);

    const characterId = 'browser-fixture-hp';
    let stored = {
      id: characterId, user_id: 'responsive-display-user',
      name: 'Synthetic Hero', level: 3, character_class: 'Rogue',
      race: 'Human', edition: '2014',
      strength: 10, dexterity: 16, constitution: 12,
      intelligence: 10, wisdom: 12, charisma: 10,
      max_hit_points: 20, current_hit_points: 20,
      temporary_hit_points: 0, armor_class: 14, hit_dice: '3d8',
    };
    const patches: Record<string, unknown>[] = [];
    let completed = 0;
    await page.route('**/api/**', async route => {
      const request = route.request();
      const url = new URL(request.url());
      const path = url.pathname;
      if (path === '/api/auth/me') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ username: 'responsive-display-user' }) });
      }
      if (path === '/api/characters/' + characterId && request.method() === 'GET') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(stored) });
      }
      if (path === '/api/characters/' + characterId && request.method() === 'PATCH') {
        const changes = request.postDataJSON() as Record<string, unknown>;
        // A deliberately slow API demonstrates that clicks remain usable
        // while the character save queue serialises its server requests.
        await new Promise(resolve => setTimeout(resolve, 750));
        patches.push(changes);
        stored = { ...stored, ...changes };
        completed += 1;
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(stored) });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: request.method() === 'GET' ? '[]' : '{}' });
    });

    // The classic sheet: the hexagon sheet now answers /characters/:id.
    await page.goto('/characters/' + characterId + '/classic');
    const hp = page.getByRole('meter', { name: 'Hit points remaining' });
    const damage = page.getByRole('button', { name: 'Take 1 hit point of damage' });
    const addTemp = page.getByRole('button', { name: 'Add 1 temporary hit point' });
    const saveStatus = page.getByTestId('hp-save-status');
    await expect(hp).toHaveAttribute('aria-valuenow', '20');
    await expect(damage).toBeEnabled();

    await damage.click();
    await damage.click();
    await damage.click();
    // Every click counts now, before the 750ms server responses arrive.
    await expect(hp).toHaveAttribute('aria-valuenow', '17');
    await expect(saveStatus).toContainText('Saving');
    await expect(damage).toBeEnabled();

    await addTemp.click();
    await addTemp.click();
    await damage.click(); // consumes one pending temporary HP, not real HP
    await expect(hp).toHaveAttribute('aria-valuenow', '17');
    await expect(page.locator('.clean-sheet-combat-temp-pill')).toHaveText('Temp 1');

    await expect.poll(() => completed, { timeout: 25_000 }).toBe(6);
    await expect(saveStatus).toHaveText('');
    expect(patches.filter(p => 'current_hit_points' in p).map(p => p.current_hit_points)).toEqual([19, 18, 17, 17]);
    // Damage PATCHes also carry the current temp HP (zero for the first
    // three damage taps); temp changes then produce 1, 2, and finally 1.
    expect(patches.filter(p => 'temporary_hit_points' in p).map(p => p.temporary_hit_points)).toEqual([0, 0, 0, 1, 2, 1]);
    expect(stored.current_hit_points).toBe(17);
    expect(stored.temporary_hit_points).toBe(1);

    await page.reload();
    await expect(hp).toHaveAttribute('aria-valuenow', '17');
    await expect(page.locator('.clean-sheet-combat-temp-pill')).toHaveText('Temp 1');
    await assertFitsViewport(page, size.width);
  });
}


// Reproduces the screenshot where the desktop campaign workspace is obscured
// by the global icon-only rail. Uses the isolated read-only preview campaign.
for (const size of [
  { label: 'laptop', width: 1366, height: 768 },
  { label: 'desktop', width: 1640, height: 900 },
  { label: 'tablet', width: 1024, height: 768 },
]) {
  test('campaign workspace sidebar stays beside the app rail on ' + size.label, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await avoidThirdPartyRequests(page);
    await page.goto('/campaign/preview-campaign?demo=1');
    const heading = page.getByRole('heading', { name: 'Preview campaign', exact: true });
    await expect(heading).toBeVisible();
    await expect(page.getByTestId('gm-active-workspace')).toBeVisible();
    const [rail, header, nav, main, title] = await Promise.all([
      page.locator('.rqk-app-rail').boundingBox(),
      page.locator('.campaign-dashboard-header').boundingBox(),
      page.getByRole('navigation', { name: 'Campaign workspace' }).boundingBox(),
      page.locator('.guild-command-main').boundingBox(),
      heading.boundingBox(),
    ]);
    const railRight = (rail?.x || 0) + (rail?.width || 0);
    const positions = JSON.stringify({ railRight, header, nav, main, title });
    expect(rail && header && nav && main && title, 'All navigation layout surfaces must be visible').toBeTruthy();
    expect((header?.x || 0) + 2, 'Campaign heading hidden behind global nav: ' + positions).toBeGreaterThanOrEqual(railRight);
    expect((nav?.x || 0) + 2, 'Campaign tool menu hidden behind global nav: ' + positions).toBeGreaterThanOrEqual(railRight);
    expect((main?.x || 0) + 2, 'Campaign contents hidden behind global nav: ' + positions).toBeGreaterThanOrEqual(railRight);
    expect((title?.x || 0) + 2, 'Campaign title hidden behind global nav: ' + positions).toBeGreaterThanOrEqual(railRight);
    await assertFitsViewport(page, size.width);
  });
}
