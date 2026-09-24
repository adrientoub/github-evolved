import { StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { parsePullRequestPath, type PullRequestRef } from '../github/pr';
import { ReviewButton } from './ReviewButton';
import styles from './styles.css?inline';

export const HOST_ID = 'gh-pr-review-root';

// React PR header (all tabs) first, then the legacy server-rendered header.
const ANCHOR_SELECTORS = ['[data-component="PH_Actions"]', '.gh-header-actions'];

function findAnchor(): Element | null {
  for (const selector of ANCHOR_SELECTORS) {
    const el = document.querySelector(selector);
    if (el) return el;
  }
  return null;
}

function navigateAfterSubmit(redirectUrl: string | undefined) {
  const target = redirectUrl ? new URL(redirectUrl, location.origin) : null;
  if (target && target.origin === location.origin) location.assign(target.href);
  else location.reload();
}

export function startReviewButton(): void {
  if (document.getElementById(HOST_ID)) return;

  const host = document.createElement('div');
  host.id = HOST_ID;
  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = styles;
  const container = document.createElement('div');
  shadow.append(style, container);

  let root: Root | null = null;
  let currentPr: PullRequestRef | null = null;

  const sync = () => {
    const pr = parsePullRequestPath(location.pathname);
    const anchor = pr ? findAnchor() : null;
    if (!pr || !anchor) {
      host.remove();
      return;
    }
    if (host.parentElement !== anchor) anchor.prepend(host);
    if (pr.basePath !== currentPr?.basePath) {
      currentPr = pr;
      root ??= createRoot(container);
      root.render(
        <StrictMode>
          <ReviewButton key={pr.basePath} pr={pr} onSubmitted={navigateAfterSubmit} />
        </StrictMode>,
      );
    }
  };

  // Idle scheduling avoids touching GitHub's React tree while it's still hydrating.
  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestIdleCallback(
      () => {
        scheduled = false;
        sync();
      },
      { timeout: 3000 },
    );
  };

  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
  schedule();
}
