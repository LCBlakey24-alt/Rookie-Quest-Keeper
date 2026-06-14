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

## Use an existing system browser

If the environment blocks Playwright browser downloads but already has Chrome/Chromium installed, point Playwright at it:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium node tests/scripts/check-playwright-screenshot.mjs
```

## If downloads are blocked

If `playwright install chromium` fails with `403 Forbidden`, the environment/proxy must allow Playwright browser downloads or provide a system Chromium package. Without a browser binary, Playwright can be installed but screenshots cannot be captured.
