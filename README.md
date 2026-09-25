# GitHub Evolved

Microsoft Edge (Manifest V3) extension that improves the GitHub pull request review experience. Built with Vite, React, and TypeScript.

It only runs on `https://github.com/*` and `https://*.ghe.com/*`.

## Features

- **Approve button on every PR tab.** An Approve split button sits in the PR header on Conversation, Commits, Checks, and Files changed. One click approves the PR.
- **Review menu.** The arrow next to it opens the same options as GitHub's "Review changes" dialog: a comment box, Comment / Approve / Request changes, and Submit review (<kbd>Ctrl</kbd>+<kbd>Enter</kbd>). Options you aren't allowed to use, such as approving your own PR, are disabled. Pending inline comments are submitted with the review.

Reviews are submitted with your normal GitHub session, using the same endpoint as GitHub's own review dialog, so there's no token to set up.

## Setup

```sh
npm install
npx playwright install chromium   # only needed for E2E tests
```

## Scripts

| Command            | Description                                                                      |
| ------------------ | -------------------------------------------------------------------------------- |
| `npm run dev`      | Rebuild `dist/` on every change (unminified, inline sourcemaps)                  |
| `npm run build`    | Type-check and produce a production build in `dist/`                             |
| `npm test`         | Unit tests (Vitest + Testing Library)                                            |
| `npm run test:e2e` | Build, then load the extension in Chromium against mocked GitHub pages (offline) |
| `npm run package`  | Build and zip `dist/` into `release/github-evolved-v<version>.zip`               |

## Load in Edge

**From VS Code:** press **F5**. This runs a development build, then opens Edge on github.com in a separate profile with the extension loaded. You can set breakpoints in `src/`. Press **Ctrl+Shift+F5** to rebuild and restart.

**Manually:**

1. Run `npm run build` (or `npm run dev`).
2. Open `edge://extensions`, turn on **Developer mode**.
3. Click **Load unpacked** and select the `dist/` folder.
4. Open any pull request on github.com or `*.ghe.com`. The Approve button appears in the PR header.

When using `npm run dev`, click **Reload** on the extension card in `edge://extensions` and refresh the GitHub tab to pick up changes.

## Edge Add-ons package

Run `npm run package` to create `release/github-evolved-v<version>.zip`. The ZIP contains `manifest.json` and `content.js` at its root and the icons under `icons/`; upload that ZIP (not the `dist/` folder) to the Edge Add-ons Partner Center. The manifest version comes from `package.json`, so update the package version before submitting an update.

The [Build workflow](.github/workflows/build.yml) runs unit and browser tests, then builds and uploads the same store-ready ZIP as the `github-evolved-edge` artifact on pushes to `master`, pull requests, and manual runs. Download the artifact from a successful run and extract the inner `github-evolved-v<version>.zip` for submission; the GitHub Actions artifact itself is a wrapper ZIP.

## Layout

- `src/manifest.ts` — manifest source; version comes from `package.json`
- `public/icons/` — extension icons copied into `dist/` by Vite
- `src/github/` — PR URL parsing and GitHub's internal review endpoints
- `src/content/` — content script; React UI is mounted in a shadow root so GitHub styles don't leak in
- `scripts/package.mjs` — zips `dist/` for sideloading or store upload
- `tests/e2e/` — Playwright tests that load the built extension against mocked GitHub pages
