import { resolve } from 'node:path';
import { chromium, expect, test, type BrowserContext } from '@playwright/test';

const extensionPath = resolve(import.meta.dirname, '../../dist');

let context: BrowserContext;

test.beforeAll(async () => {
  // Extensions require a persistent context; the "chromium" channel supports them headless.
  context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
  });
});

test.afterAll(async () => {
  await context.close();
});

test('shows the badge on github.com', async () => {
  const page = await context.newPage();
  await page.goto('https://github.com/');
  await expect(page.getByRole('status').filter({ hasText: 'PR Review 2.0 active' })).toBeVisible();
});

test('does not inject on other sites', async () => {
  const page = await context.newPage();
  await page.goto('https://example.com/');
  await page.waitForLoadState('load');
  await expect(page.locator('#gh-pr-review-root')).toHaveCount(0);
});
