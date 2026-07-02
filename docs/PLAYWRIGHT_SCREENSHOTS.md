# Playwright screenshots

The E2E tests and visual screenshot tooling live in the `tests/` workspace. The frontend app does **not** install Playwright directly, so use the scripts below from `tests/`.

## One-time setup

```bash
cd tests
npm install
npm run install:browsers
```

If the machine also needs Linux browser dependencies, use:

```bash
cd tests
npm run install:browsers:deps
```

## Check screenshots work

```bash
cd tests
npm run check:screenshot
```

The check writes a smoke screenshot to `tests/test-results/playwright-smoke.png`.


## Capture site review screenshots

To capture the main sunset rebrand review routes at desktop and mobile widths, run:

```bash
cd tests
npm run screenshots:site
```

The script starts the local frontend on port `3100` by default and writes screenshots to `tests/test-results/site-screenshots/`. Generated screenshots are ignored by git.

Use an existing preview or local server instead of starting the frontend:

```bash
cd tests
ROOK_SCREENSHOT_BASE_URL=https://your-preview-url.example npm run screenshots:site
```

Limit the route set for a focused review:

```bash
cd tests
ROOK_SCREENSHOT_ROUTES=/characters/new,/characters/new/premade npm run screenshots:site
```

## Use an existing system browser

If the environment blocks Playwright browser downloads but already has Chrome/Chromium installed, point Playwright at it:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium node tests/scripts/check-playwright-screenshot.mjs
```

## If downloads are blocked

If `playwright install chromium` fails with `403 Forbidden`, the environment/proxy must allow Playwright browser downloads or provide a system Chromium package. Without a browser binary, Playwright can be installed but screenshots cannot be captured.
