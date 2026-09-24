import { fetchReviewContext, submitReview } from './review';

const changesJson = (overrides: Record<string, unknown> = {}) => ({
  payload: {
    pullRequestsChangesRoute: {
      comparison: { fullDiff: { headOid: 'abc123' } },
      pullRequest: { state: 'OPEN', viewerAllowedNonCommentReviewTypes: ['APPROVE', 'REQUEST_CHANGES'] },
      viewerPendingReview: { id: 1, comments: [{}, {}] },
      ...overrides,
    },
  },
});

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('github review API', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    document.head.innerHTML = '<meta name="fetch-nonce" content="nonce-1">';
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('loads review context from the changes route with GitHub headers', async () => {
    fetchMock.mockResolvedValue(jsonResponse(changesJson()));

    await expect(fetchReviewContext('/o/r/pull/1')).resolves.toEqual({
      headSha: 'abc123',
      state: 'OPEN',
      allowedReviewTypes: ['APPROVE', 'REQUEST_CHANGES'],
      pendingCommentCount: 2,
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(`${location.origin}/o/r/pull/1/changes`);
    expect(init?.headers).toMatchObject({
      Accept: 'application/json',
      'GitHub-Verified-Fetch': 'true',
      'X-Fetch-Nonce': 'nonce-1',
    });
  });

  it('defaults to no permissions and no pending comments when fields are missing', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        changesJson({ pullRequest: { comparison: { headOid: 'def' } }, viewerPendingReview: null, comparison: {} }),
      ),
    );

    await expect(fetchReviewContext('/o/r/pull/1')).resolves.toEqual({
      headSha: 'def',
      state: 'UNKNOWN',
      allowedReviewTypes: [],
      pendingCommentCount: 0,
    });
  });

  it('fails clearly when the payload format is unexpected', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ payload: {} }));
    await expect(fetchReviewContext('/o/r/pull/1')).rejects.toThrow(/page format/);
  });

  it('fails with the HTTP status when loading context fails', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 404));
    await expect(fetchReviewContext('/o/r/pull/1')).rejects.toThrow(/HTTP 404/);
  });

  it('submits a review with PUT and returns the redirect URL', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ redirectUrl: '/o/r/pull/1#review' }));

    await expect(submitReview('/o/r/pull/1', { event: 'approve', body: 'LGTM', headSha: 'abc123' })).resolves.toEqual({
      redirectUrl: '/o/r/pull/1#review',
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(`${location.origin}/o/r/pull/1/page_data/submit_review`);
    expect(init?.method).toBe('PUT');
    expect(JSON.parse(init?.body as string)).toEqual({ event: 'approve', body: 'LGTM', headSha: 'abc123' });
  });

  it("surfaces GitHub's error message when a submission is rejected", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'Review body is required' }, 422));
    await expect(submitReview('/o/r/pull/1', { event: 'comment', body: '', headSha: 'a' })).rejects.toThrow(
      'Review body is required',
    );
  });
});
