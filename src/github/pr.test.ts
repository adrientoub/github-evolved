import { parsePullRequestPath } from './pr';

describe('parsePullRequestPath', () => {
  it.each([
    ['/octo/repo/pull/12', 12],
    ['/octo/repo/pull/12/files', 12],
    ['/octo/repo/pull/12/changes', 12],
    ['/octo/repo/pull/12/commits/abc123', 12],
  ])('parses %s', (path, number) => {
    expect(parsePullRequestPath(path)).toEqual({
      owner: 'octo',
      repo: 'repo',
      number,
      basePath: `/octo/repo/pull/${number}`,
    });
  });

  it.each(['/octo/repo', '/octo/repo/pulls', '/octo/repo/issues/12', '/octo/repo/pull/abc', '/octo/repo/pull/12abc'])(
    'rejects %s',
    (path) => {
      expect(parsePullRequestPath(path)).toBeNull();
    },
  );
});
