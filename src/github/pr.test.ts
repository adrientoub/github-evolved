import { parsePullRequestPath, readPullRequestTitle } from './pr';

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

describe('readPullRequestTitle', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    document.title = '';
  });

  it('prefers the main header title over the sticky header', () => {
    document.body.innerHTML = `<div data-component="TitleArea"><h2 data-component="PH_Title"><span class="markdown-title">Stale</span></h2></div>
      <div data-component="TitleArea"><div><h1><span class="markdown-title">Fix <code>foo</code></span><span class="sr-only"> - #12</span></h1><span>#12</span></div></div>`;
    expect(readPullRequestTitle()).toBe('Fix foo');
  });

  it('reads the React header title without the PR number', () => {
    document.body.innerHTML = `<h1 data-component="PH_Title"><span class="markdown-title">Fix  <code>foo</code>
      bug</span><span class="sr-only"> - #12</span></h1><span>#12</span>`;
    expect(readPullRequestTitle()).toBe('Fix foo bug');
  });

  it('reads the legacy header title', () => {
    document.body.innerHTML = `<div class="gh-header-show"><h1 class="gh-header-title">
      <bdi class="js-issue-title markdown-title">Legacy title</bdi> <span class="gh-header-number">#12</span></h1></div>`;
    expect(readPullRequestTitle()).toBe('Legacy title');
  });

  it('falls back to the document title', () => {
    document.title = 'Bump deps by dependabot[bot] · Pull Request #12 · octo/repo · GitHub';
    expect(readPullRequestTitle()).toBe('Bump deps');
  });

  it('returns null when no title is available', () => {
    document.title = 'octo/repo · GitHub';
    expect(readPullRequestTitle()).toBeNull();
  });
});
