import { resolve } from 'node:path';
import { chromium, expect, test, type BrowserContext, type Page } from '@playwright/test';

const extensionPath = resolve(import.meta.dirname, '../../dist');

// Minimal stand-in for GitHub's PR page: the header title and actions containers and the fetch nonce.
const prPageHtml = `<!doctype html><html><head><meta name="fetch-nonce" content="test-nonce"></head>
<body><div data-component="PageHeader"><div data-component="TitleArea"><div><h1 data-component="PH_Title"><span class="markdown-title">Fix <code>&lt;Foo&gt;</code> [bug]</span></h1><span class="suffix"><span>#1</span></span></div></div>
<div data-component="PH_Actions"><button>Code</button></div></div></body></html>`;

const changesJson = {
  payload: {
    pullRequestsChangesRoute: {
      comparison: { fullDiff: { headOid: 'headsha123' } },
      pullRequest: { state: 'OPEN', viewerAllowedNonCommentReviewTypes: ['APPROVE', 'REQUEST_CHANGES'] },
      viewerPendingReview: { id: null, comments: [] },
    },
  },
};

interface Submission {
  headers: Record<string, string>;
  body: unknown;
}

async function mockGitHub(page: Page, origin: string) {
  const submissions: Submission[] = [];
  await page.route(`${origin}/**`, async (route) => {
    const request = route.request();
    const { pathname } = new URL(request.url());
    if (pathname.endsWith('/changes')) {
      await route.fulfill({ json: changesJson });
    } else if (pathname.endsWith('/page_data/submit_review') && request.method() === 'PUT') {
      submissions.push({ headers: await request.allHeaders(), body: request.postDataJSON() });
      await route.fulfill({ json: { redirectUrl: `${origin}/o/r/pull/1?reviewed=1` } });
    } else {
      await route.fulfill({ contentType: 'text/html', body: prPageHtml });
    }
  });
  return submissions;
}

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

for (const origin of ['https://github.com', 'https://tenant.ghe.com']) {
  test(`approves in one click on ${origin}`, async () => {
    const page = await context.newPage();
    const submissions = await mockGitHub(page, origin);
    await page.goto(`${origin}/o/r/pull/1/commits`);

    const approve = page.getByRole('button', { name: 'Approve', exact: true });
    await expect(approve).toBeEnabled();
    await expect(page.locator('[data-component="PH_Actions"] > :first-child')).toHaveId('gh-pr-review-root');

    await approve.click();
    await page.waitForURL('**/o/r/pull/1?reviewed=1');

    expect(submissions).toHaveLength(1);
    expect(submissions[0].body).toEqual({ event: 'approve', body: '', headSha: 'headsha123' });
    expect(submissions[0].headers).toMatchObject({
      'github-verified-fetch': 'true',
      'x-fetch-nonce': 'test-nonce',
      'content-type': 'application/json',
    });
  });
}

test('submits a review with a comment from the dropdown', async () => {
  const page = await context.newPage();
  const submissions = await mockGitHub(page, 'https://github.com');
  await page.goto('https://github.com/o/r/pull/1');

  await page.getByRole('button', { name: 'More review actions' }).click();
  const dialog = page.getByRole('dialog', { name: 'Finish your review' });
  await dialog.getByRole('textbox', { name: 'Review comment' }).fill('Please rename this');
  await dialog.getByRole('radio', { name: /Request changes/ }).check();
  await dialog.getByRole('button', { name: 'Submit review' }).click();
  await page.waitForURL('**/o/r/pull/1?reviewed=1');

  expect(submissions.map((s) => s.body)).toEqual([
    { event: 'request changes', body: 'Please rename this', headSha: 'headsha123' },
  ]);
});

test('copies the PR title with a link', async () => {
  const origin = 'https://tenant.ghe.com';
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin });
  const page = await context.newPage();
  await mockGitHub(page, origin);
  await page.goto(`${origin}/o/r/pull/1/files?diff=split#top`);

  await expect(page.locator('.suffix > :last-child')).toHaveId('gh-evolved-copy-title-root');
  const copy = page.getByRole('button', { name: 'Copy title with link' });
  await copy.click();

  await expect(copy).toHaveClass(/copied/);
  await expect(page.getByText('Copied!')).toBeVisible();
  const clipboard = await page.evaluate(async () => {
    const [item] = await navigator.clipboard.read();
    return {
      html: await (await item.getType('text/html')).text(),
      text: await (await item.getType('text/plain')).text(),
    };
  });
  expect(clipboard.html).toContain('<a href="https://tenant.ghe.com/o/r/pull/1">PR#1: Fix &lt;Foo&gt; [bug]</a>');
  expect(clipboard.text).toBe('[PR#1: Fix <Foo> \\[bug\\]](https://tenant.ghe.com/o/r/pull/1)');

  await expect(copy).not.toHaveClass(/copied/, { timeout: 5000 });
  await expect(page.getByText('Copied!')).toHaveCount(0);
});

test('does not inject on non-PR pages or other sites', async () => {
  const page = await context.newPage();
  await mockGitHub(page, 'https://github.com');
  await page.goto('https://github.com/o/r/issues/1');
  await page.waitForTimeout(1000);
  await expect(page.locator('#gh-pr-review-root, #gh-evolved-copy-title-root')).toHaveCount(0);

  await page.route('https://example.com/**', (route) => route.fulfill({ contentType: 'text/html', body: prPageHtml }));
  await page.goto('https://example.com/o/r/pull/1');
  await page.waitForTimeout(1000);
  await expect(page.locator('#gh-pr-review-root, #gh-evolved-copy-title-root')).toHaveCount(0);
});
