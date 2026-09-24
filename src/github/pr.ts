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
