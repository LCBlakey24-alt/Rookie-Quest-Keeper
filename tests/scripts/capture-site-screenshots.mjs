#!/usr/bin/env node
import { mkdir } from 'node:fs/promises';
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const testsDir = path.resolve(path.dirname(__filename), '..');
const repoRoot = path.resolve(testsDir, '..');
const frontendDir = path.join(repoRoot, 'frontend');

const DEFAULT_ROUTES = [
  '/',
  '/characters/new',
  '/characters/new/full',
  '/characters/new/basic',
  '/characters/new/premade',
  '/characters/new/kids',
];

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 1100 },
  { name: 'mobile', width: 390, height: 900 },
];

const args = new Set(process.argv.slice(2));

function printHelp() {
  console.log(`Capture route screenshots for sunset rebrand review.\n\nUsage:\n  cd tests && npm run screenshots:site\n\nOptional environment variables:\n  ROOK_SCREENSHOT_BASE_URL     Use an already-running frontend instead of starting one.\n                               Example: http://localhost:3000\n  ROOK_SCREENSHOT_ROUTES       Comma-separated routes to capture.\n                               Default: ${DEFAULT_ROUTES.join(',')}\n  ROOK_SCREENSHOT_OUTPUT_DIR   Output directory.\n                               Default: tests/test-results/site-screenshots\n  ROOK_SCREENSHOT_PORT         Port used when this script starts the frontend.\n                               Default: 3100\n  PLAYWRIGHT_CHROMIUM_EXECUTABLE  Path to system Chrome/Chromium if browsers are not installed.\n`);
}

if (args.has('--help') || args.has('-h')) {
  printHelp();
  process.exit(0);
}

const port = Number(process.env.ROOK_SCREENSHOT_PORT || 3100);
const baseUrl = (process.env.ROOK_SCREENSHOT_BASE_URL || `http://127.0.0.1:${port}`).replace(/\/$/, '');
const outputDir = process.env.ROOK_SCREENSHOT_OUTPUT_DIR
  ? path.resolve(process.env.ROOK_SCREENSHOT_OUTPUT_DIR)
  : path.join(testsDir, 'test-results', 'site-screenshots');
const routes = (process.env.ROOK_SCREENSHOT_ROUTES || DEFAULT_ROUTES.join(','))
  .split(',')
  .map((route) => route.trim())
  .filter(Boolean);

function slugifyRoute(route) {
  if (route === '/') return 'home';
  return route
    .replace(/^\//, '')
    .replace(/[:/]+/g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'route';
}

function waitForUrl(url, timeoutMs = 120000) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const check = () => {
      const client = url.startsWith('https:') ? https : http;
      const req = client.get(url, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode < 500) {
          resolve();
          return;
        }
        retry();
      });

      req.on('error', retry);
      req.setTimeout(2000, () => {
        req.destroy();
        retry();
      });
    };

    const retry = () => {
      if (Date.now() - startedAt > timeoutMs) {
        reject(new Error(`Timed out waiting for ${url}`));
        return;
      }
      setTimeout(check, 1000);
    };

    check();
  });
}

function launchFrontendIfNeeded() {
  if (process.env.ROOK_SCREENSHOT_BASE_URL) {
    return null;
  }

  const child = spawn('npm', ['start'], {
    cwd: frontendDir,
    env: {
      ...process.env,
      BROWSER: 'none',
      HOST: '127.0.0.1',
      PORT: String(port),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: process.platform !== 'win32',
  });

  child.stdout.on('data', (chunk) => process.stdout.write(`[frontend] ${chunk}`));
  child.stderr.on('data', (chunk) => process.stderr.write(`[frontend] ${chunk}`));

  return child;
}

function printBrowserHelp(error) {
  console.error('\nPlaywright is installed, but Chromium could not be launched.');
  console.error('Reason:', error?.message || error);
  console.error('\nTo fix locally/CI, run:');
  console.error('  cd tests && npm run install:browsers');
  console.error('\nIf your environment already has Chrome/Chromium installed, set:');
  console.error('  PLAYWRIGHT_CHROMIUM_EXECUTABLE=/path/to/chromium npm run screenshots:site');
}

async function main() {
  const frontend = launchFrontendIfNeeded();

  try {
    await waitForUrl(baseUrl);
    await mkdir(outputDir, { recursive: true });

    const { chromium } = await import('playwright');
    const launchOptions = { headless: true };
    if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) {
      launchOptions.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
    }

    let browser;
    try {
      browser = await chromium.launch(launchOptions);
    } catch (error) {
      printBrowserHelp(error);
      process.exitCode = 1;
      return;
    }

    try {
      for (const viewport of VIEWPORTS) {
        const page = await browser.newPage({ viewport });
        for (const route of routes) {
          const url = new URL(route, `${baseUrl}/`).toString();
          const fileName = `${slugifyRoute(route)}-${viewport.name}.png`;
          const outputPath = path.join(outputDir, fileName);

          console.log(`Capturing ${url} at ${viewport.width}x${viewport.height} -> ${outputPath}`);
          await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
          await page.screenshot({ path: outputPath, fullPage: true });
        }
        await page.close();
      }
    } finally {
      await browser.close();
    }

    console.log(`Site screenshots written to: ${outputDir}`);
  } finally {
    if (frontend) {
      if (process.platform === 'win32') {
        frontend.kill('SIGTERM');
      } else {
        try {
          process.kill(-frontend.pid, 'SIGTERM');
        } catch {
          frontend.kill('SIGTERM');
        }
      }
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
