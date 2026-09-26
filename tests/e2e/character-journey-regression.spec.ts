import { test, expect, Page, Response } from '@playwright/test';
import { loginTestUser } from '../fixtures/helpers';

const DRAFT_KEY = 'rqk.full_character_creator_v2.safe';

test.beforeEach(async ({ page }) => {
  test.skip(
    !process.env.RQK_E2E_EMAIL || !process.env.RQK_E2E_PASSWORD,
    'Requires RQK_E2E_EMAIL and RQK_E2E_PASSWORD',
  );
  await loginTestUser(page);
  await page.evaluate((key) => localStorage.removeItem(key), DRAFT_KEY);
});

async function next(page: Page) {
  await page.locator('.full-creator-footer').getByRole('button', { name: /next/i }).click();
}

async function chooseFromChoice(page: Page, title: RegExp, count: number) {
  const section = page.locator('section.full-creator-choice-block').filter({ hasText: title });
  await expect(section).toBeVisible();
  const buttons = section.locator('button');
  expect(await buttons.count()).toBeGreaterThanOrEqual(count);
  for (let index = 0; index < count; index += 1) {
    await buttons.nth(index).click();
  }
}

async function completeHumanLanguage(page: Page) {
  const section = page.locator('section.full-creator-choice-block').filter({ hasText: /Race languages 0\/1/i });
  await expect(section).toBeVisible();
  await section.locator('button').first().click();
}

async function chooseStartingGold(page: Page) {
  await page.getByRole('button', { name: /roll starting gold/i }).click();
  const rollButton = page.getByRole('button', { name: /^roll \d+d\d+/i });
  await expect(rollButton).toBeVisible();
  await rollButton.click();
}

async function cleanupCreatedCharacter(page: Page, response: Response, id: string) {
  const token = await page.evaluate(() => localStorage.getItem('dm_token'));
  if (!token || !id) return;
  const endpoint = response.url().replace(/\/$/, '');
  await page.request.delete(`${endpoint}/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => {});
}

async function createCharacter(page: Page, className: 'Fighter' | 'Wizard') {
  const uniqueName = `E2E_${className}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  await page.goto('/characters/new', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Create Character' })).toBeVisible({ timeout: 15_000 });
  await page.getByLabel('Character name').fill(uniqueName);
  await page.getByLabel('Rules edition').selectOption('2014');
  await next(page);

  await expect(page.getByRole('heading', { name: /choose race/i })).toBeVisible();
  await page.getByLabel('Race').selectOption('Human');
  await completeHumanLanguage(page);
  await next(page);

  await expect(page.getByRole('heading', { name: 'Choose class' })).toBeVisible();
  await page.getByLabel('Class').selectOption(className);

  if (className === 'Fighter') {
    await page.getByRole('button', { name: 'Defense' }).click();
    await chooseFromChoice(page, /Class skills 0\/2/i, 2);
  } else {
    await chooseFromChoice(page, /Class skills 0\/2/i, 2);
    await chooseFromChoice(page, /Cantrips 0\/3/i, 3);
    await chooseFromChoice(page, /Level 1 spells 0\/6/i, 6);
  }
  await next(page);

  await expect(page.getByRole('heading', { name: 'Choose background' })).toBeVisible();
  await page.getByLabel('Background').selectOption('Soldier');
  await next(page);

  await expect(page.getByRole('heading', { name: 'Ability scores' })).toBeVisible();
  await next(page);

  await expect(page.getByRole('heading', { name: 'Equipment' })).toBeVisible();
  await chooseStartingGold(page);
  await next(page);

  await expect(page.getByRole('heading', { name: 'Review and save' })).toBeVisible();
  const createButton = page.getByRole('button', { name: 'Create Character' });
  await expect(createButton).toBeEnabled();

  const responsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return response.request().method() === 'POST' && /\/api\/characters\/?$/.test(url.pathname);
  });

  await createButton.click();
  const response = await responsePromise;
  expect(response.ok()).toBeTruthy();

  const body = await response.json();
  const id = body?.character_id || body?.character?.id || body?.id;
  expect(id).toBeTruthy();

  try {
    await page.waitForURL(new RegExp(`/characters/${id}import { test, expect, Page, Response } from '@playwright/test';
import { loginTestUser } from '../fixtures/helpers';

const DRAFT_KEY = 'rqk.full_character_creator_v2.safe';

test.beforeEach(async ({ page }) => {
  test.skip(
    !process.env.RQK_E2E_EMAIL || !process.env.RQK_E2E_PASSWORD,
    'Requires RQK_E2E_EMAIL and RQK_E2E_PASSWORD',
  );
  await loginTestUser(page);
  await page.evaluate((key) => localStorage.removeItem(key), DRAFT_KEY);
});

async function next(page: Page) {
  await page.locator('.full-creator-footer').getByRole('button', { name: /next/i }).click();
}

async function chooseFromChoice(page: Page, title: RegExp, count: number) {
  const section = page.locator('section.full-creator-choice-block').filter({ hasText: title });
  await expect(section).toBeVisible();
  const buttons = section.locator('button');
  expect(await buttons.count()).toBeGreaterThanOrEqual(count);
  for (let index = 0; index < count; index += 1) {
    await buttons.nth(index).click();
  }
}

async function completeHumanLanguage(page: Page) {
  const section = page.locator('section.full-creator-choice-block').filter({ hasText: /Race languages 0\/1/i });
  await expect(section).toBeVisible();
  await section.locator('button').first().click();
}

async function chooseStartingGold(page: Page) {
  await page.getByRole('button', { name: /roll starting gold/i }).click();
  const rollButton = page.getByRole('button', { name: /^roll \d+d\d+/i });
  await expect(rollButton).toBeVisible();
  await rollButton.click();
}

async function cleanupCreatedCharacter(page: Page, response: Response, id: string) {
  const token = await page.evaluate(() => localStorage.getItem('dm_token'));
  if (!token || !id) return;
  const endpoint = response.url().replace(/\/$/, '');
  await page.request.delete(`${endpoint}/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => {});
}

async function createCharacter(page: Page, className: 'Fighter' | 'Wizard') {
  const uniqueName = `E2E_${className}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  await page.goto('/characters/new', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Create Character' })).toBeVisible({ timeout: 15_000 });
  await page.getByLabel('Character name').fill(uniqueName);
  await page.getByLabel('Rules edition').selectOption('2014');
  await next(page);

  await expect(page.getByRole('heading', { name: /choose race/i })).toBeVisible();
  await page.getByLabel('Race').selectOption('Human');
  await completeHumanLanguage(page);
  await next(page);

  await expect(page.getByRole('heading', { name: 'Choose class' })).toBeVisible();
  await page.getByLabel('Class').selectOption(className);

  if (className === 'Fighter') {
    await page.getByRole('button', { name: 'Defense' }).click();
    await chooseFromChoice(page, /Class skills 0\/2/i, 2);
  } else {
    await chooseFromChoice(page, /Class skills 0\/2/i, 2);
    await chooseFromChoice(page, /Cantrips 0\/3/i, 3);
    await chooseFromChoice(page, /Level 1 spells 0\/6/i, 6);
  }
  await next(page);

  await expect(page.getByRole('heading', { name: 'Choose background' })).toBeVisible();
  await page.getByLabel('Background').selectOption('Soldier');
  await next(page);

  await expect(page.getByRole('heading', { name: 'Ability scores' })).toBeVisible();
  await next(page);

  await expect(page.getByRole('heading', { name: 'Equipment' })).toBeVisible();
  await chooseStartingGold(page);
  await next(page);

  await expect(page.getByRole('heading', { name: 'Review and save' })).toBeVisible();
  const createButton = page.getByRole('button', { name: 'Create Character' });
  await expect(createButton).toBeEnabled();

  const responsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return response.request().method() === 'POST' && /\/api\/characters\/?$/.test(url.pathname);
  });

  await createButton.click();
  const response = await responsePromise;
  expect(response.ok()).toBeTruthy();

  const body = await response.json();
  const id = body?.character_id || body?.character?.id || body?.id;
  expect(id).toBeTruthy();

), { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: uniqueName })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByLabel(new RegExp(`Human.*${className}.*Level 1`, 'i'))).toBeVisible();
  } finally {
    await cleanupCreatedCharacter(page, response, id);
  }
}

async function assertNoHorizontalDocumentOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    documentScrollWidth: document.documentElement.scrollWidth,
    documentClientWidth: document.documentElement.clientWidth,
    bodyScrollWidth: document.body.scrollWidth,
  }));
  expect(dimensions.documentScrollWidth).toBeLessThanOrEqual(dimensions.documentClientWidth + 1);
  expect(dimensions.bodyScrollWidth).toBeLessThanOrEqual(dimensions.documentClientWidth + 1);
}

test.describe('Character journey regression', () => {
  test('creates a level 1 Fighter and opens the finished sheet', async ({ page }) => {
    await createCharacter(page, 'Fighter');
  });

  test('creates a level 1 Wizard with spellbook choices and opens the finished sheet', async ({ page }) => {
    await createCharacter(page, 'Wizard');
  });

  test('phone creator has no document overflow and keeps navigation usable', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/characters/new', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Create Character' })).toBeVisible();
    await assertNoHorizontalDocumentOverflow(page);
    await expect(page.locator('.full-creator-footer').getByRole('button', { name: /next/i })).toBeVisible();
  });

  test('tablet creator has no document overflow and keeps the workspace readable', async ({ page }) => {
    await page.setViewportSize({ width: 834, height: 1112 });
    await page.goto('/characters/new', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Create Character' })).toBeVisible();
    await assertNoHorizontalDocumentOverflow(page);
    await expect(page.locator('.full-creator-workspace')).toBeVisible();
    await expect(page.locator('.full-creator-footer').getByRole('button', { name: /next/i })).toBeVisible();
  });
});
