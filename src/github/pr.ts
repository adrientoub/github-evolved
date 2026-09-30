export interface PullRequestRef {
  owner: string;
  repo: string;
  number: number;
  /** e.g. `/owner/repo/pull/123` */
  basePath: string;
}

const PR_PATH = /^\/([^/]+)\/([^/]+)\/pull\/(\d+)(?:\/|$)/;

export function parsePullRequestPath(pathname: string): PullRequestRef | null {
  const match = PR_PATH.exec(pathname);
  if (!match) return null;
  const [, owner, repo, number] = match;
  return { owner, repo, number: Number(number), basePath: `/${owner}/${repo}/pull/${number}` };
}

// React PR header first, then the legacy server-rendered header.
const TITLE_TEXT_SELECTOR = '[data-component="PH_Title"] .markdown-title, .gh-header-show .js-issue-title';
// e.g. "Fix bug by octocat · Pull Request #12 · octo/repo · GitHub"
const DOCUMENT_TITLE = /^(.+) by \S+ · Pull Request #\d+ · /;

/** Reads the PR title as currently rendered, so in-page title edits are picked up. */
export function readPullRequestTitle(doc: Document = document): string | null {
  const text = doc.querySelector(TITLE_TEXT_SELECTOR)?.textContent?.replace(/\s+/g, ' ').trim();
  if (text) return text;
  return DOCUMENT_TITLE.exec(doc.title)?.[1].trim() || null;
}
