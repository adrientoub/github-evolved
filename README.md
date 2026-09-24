# GitHub PR Review 2.0

Microsoft Edge (Manifest V3) extension that improves the GitHub pull request review experience. Built with Vite, React, and TypeScript.

It only runs on `https://github.com/*` and `https://*.ghe.com/*`.

## Setup

```sh
npm install
npx playwright install chromium   # only needed for E2E tests
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Rebuild `dist/` on every change (unminified, inline sourcemaps) |
| `npm run build` | Type-check and produce a production build in `dist/` |
| `npm test` | Unit tests (Vitest + Testing Library) |
| `npm run test:e2e` | Build, then load the extension in Chromium and smoke test github.com (needs network) |
| `npm run package` | Build and zip `dist/` into `release/github-pr-review-2.0-v<version>.zip` |

## Load in Edge

**From VS Code:** press **F5**. This runs a development build, then opens Edge on github.com in a separate profile with the extension loaded. You can set breakpoints in `src/`. Press **Ctrl+Shift+F5** to rebuild and restart.

**Manually:**

1. Run `npm run build` (or `npm run dev`).
2. Open `edge://extensions`, turn on **Developer mode**.
3. Click **Load unpacked** and select the `dist/` folder.
4. Open any page on github.com. A blue "PR Review 2.0 active" badge appears in the bottom-right corner.

When using `npm run dev`, click **Reload** on the extension card in `edge://extensions` and refresh the GitHub tab to pick up changes.

## Layout

- `src/manifest.ts` — manifest source; version comes from `package.json`
- `src/content/` — content script; React UI is mounted in a shadow root so GitHub styles don't leak in
- `scripts/package.mjs` — zips `dist/` for sideloading or store upload
- `tests/e2e/` — Playwright smoke tests
