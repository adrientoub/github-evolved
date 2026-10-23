import { StrictMode, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { parsePullRequestPath, readPullRequestTitle, type PullRequestRef } from '../github/pr';
import { CopyTitleButton } from './CopyTitleButton';
import { ReviewButton } from './ReviewButton';
import styles from './styles.css?inline';

export const HOST_ID = 'gh-pr-review-root';
export const COPY_TITLE_HOST_ID = 'gh-evolved-copy-title-root';

interface Widget {
  hostId: string;
  name: string;
  /** Moves the host into place; returns false when its anchor isn't on the page. */
  place: (host: HTMLElement) => boolean;
  render: (pr: PullRequestRef) => ReactNode;
}

// React PR header (all tabs) first, then the legacy server-rendered header.
const ACTIONS_SELECTORS = ['[data-component="PH_Actions"]', '.gh-header-actions'];

function findActions(): Element | null {
  for (const selector of ACTIONS_SELECTORS) {
    const el = document.querySelector(selector);
    if (el) return el;
  }
  return null;
}

// Main React header title (PH_Title now only marks the compact sticky header), then the older React header.
const REACT_TITLE_SELECTORS = ['[data-component="TitleArea"] h1', '[data-component="PH_Title"]'];

function findTitleSlot(): Element | null {
  const title = REACT_TITLE_SELECTORS.map((s) => document.querySelector(s)).find((el) => el !== null);
  if (title) {
    // The React header renders "#123" in a nowrap sibling; joining it keeps the button on the number's line.
    const suffix = title.nextElementSibling;
    return suffix && /#\s*\d+/.test(suffix.textContent ?? '') ? suffix : title;
  }
  return document.querySelector('.gh-header-show .gh-header-title');
}

function navigateAfterSubmit(redirectUrl: string | undefined) {
  const target = redirectUrl ? new URL(redirectUrl, location.origin) : null;
  if (target && target.origin === location.origin) location.assign(target.href);
  else location.reload();
}

const reviewButton: Widget = {
  hostId: HOST_ID,
  name: 'review',
  place(host) {
    const anchor = findActions();
    if (!anchor) return false;
    if (host.parentElement !== anchor) anchor.prepend(host);
    return true;
  },
  render: (pr) => <ReviewButton key={pr.basePath} pr={pr} onSubmitted={navigateAfterSubmit} />,
};

const copyTitleButton: Widget = {
  hostId: COPY_TITLE_HOST_ID,
  name: 'copy-title',
  place(host) {
    const slot = findTitleSlot();
    if (!slot) return false;
    if (host.parentElement !== slot) slot.append(host);
    return true;
  },
  render: (pr) => (
    <CopyTitleButton
      key={pr.basePath}
      number={pr.number}
      url={location.origin + pr.basePath}
      getTitle={() => readPullRequestTitle()}
    />
  ),
};

function createWidget(widget: Widget): (() => void) | null {
  if (document.getElementById(widget.hostId)) return null;

  const host = document.createElement('div');
  host.id = widget.hostId;
  host.dataset.widget = widget.name;
  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = styles;
  const container = document.createElement('div');
  shadow.append(style, container);

  let root: Root | null = null;
  let currentPr: PullRequestRef | null = null;

  return () => {
    const pr = parsePullRequestPath(location.pathname);
    if (!pr || !widget.place(host)) {
      host.remove();
      return;
    }
    if (pr.basePath !== currentPr?.basePath) {
      currentPr = pr;
      root ??= createRoot(container);
      root.render(<StrictMode>{widget.render(pr)}</StrictMode>);
    }
  };
}

export function startContentScript(): void {
  const syncs = [reviewButton, copyTitleButton].map(createWidget).filter((sync) => sync !== null);
  if (!syncs.length) return;

  // Idle scheduling avoids touching GitHub's React tree while it's still hydrating.
  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestIdleCallback(
      () => {
        scheduled = false;
        for (const sync of syncs) sync();
      },
      { timeout: 3000 },
    );
  };

  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
  schedule();
}
