export type ReviewEvent = 'approve' | 'comment' | 'request changes';
export type NonCommentReviewType = 'APPROVE' | 'REQUEST_CHANGES';

export interface ReviewContext {
  headSha: string;
  state: string;
  allowedReviewTypes: NonCommentReviewType[];
  pendingCommentCount: number;
}

interface ChangesRouteJson {
  payload?: {
    pullRequestsChangesRoute?: {
      comparison?: { fullDiff?: { headOid?: string } };
      pullRequest?: {
        state?: string;
        comparison?: { headOid?: string };
        viewerAllowedNonCommentReviewTypes?: NonCommentReviewType[];
      };
      viewerPendingReview?: { comments?: unknown[] } | null;
    };
  };
}

// Mirrors the headers GitHub's own React fetch helpers send to PR endpoints.
function githubHeaders(): Record<string, string> {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'GitHub-Verified-Fetch': 'true',
    'GitHub-Is-React': 'true',
    'X-Requested-With': 'XMLHttpRequest',
    'X-Fetch-Nonce': document.querySelector<HTMLMetaElement>('meta[name="fetch-nonce"]')?.content ?? '',
  };
}

/** Loads the same data GitHub's "Review changes" dialog uses, from any PR tab. */
export async function fetchReviewContext(basePath: string): Promise<ReviewContext> {
  const res = await fetch(new URL(`${basePath}/changes`, location.origin), {
    headers: githubHeaders(),
    credentials: 'same-origin',
  });
  if (!res.ok) throw new Error(`Couldn't load review details (HTTP ${res.status}).`);

  const route = ((await res.json()) as ChangesRouteJson).payload?.pullRequestsChangesRoute;
  const headSha = route?.comparison?.fullDiff?.headOid ?? route?.pullRequest?.comparison?.headOid;
  if (!route || !headSha) throw new Error("Couldn't read review details. GitHub may have changed its page format.");

  return {
    headSha,
    state: route.pullRequest?.state ?? 'UNKNOWN',
    allowedReviewTypes: route.pullRequest?.viewerAllowedNonCommentReviewTypes ?? [],
    pendingCommentCount: route.viewerPendingReview?.comments?.length ?? 0,
  };
}

export interface SubmitReviewRequest {
  event: ReviewEvent;
  body: string;
  headSha: string;
}

/** Submits a review (including any pending inline comments) exactly like GitHub's own dialog. */
export async function submitReview(basePath: string, request: SubmitReviewRequest): Promise<{ redirectUrl?: string }> {
  const res = await fetch(new URL(`${basePath}/page_data/submit_review`, location.origin), {
    method: 'PUT',
    headers: githubHeaders(),
    credentials: 'same-origin',
    body: JSON.stringify(request),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string; redirectUrl?: string };
  if (!res.ok) throw new Error(data.error ?? `GitHub rejected the review (HTTP ${res.status}).`);
  return data;
}
