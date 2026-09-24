import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type SyntheticEvent } from 'react';
import type { PullRequestRef } from '../github/pr';
import { fetchReviewContext, submitReview, type ReviewContext, type ReviewEvent } from '../github/review';

const OPTIONS: { event: ReviewEvent; label: string; description: string }[] = [
  { event: 'comment', label: 'Comment', description: 'Submit general feedback without explicit approval.' },
  { event: 'approve', label: 'Approve', description: 'Submit feedback and approve merging these changes.' },
  { event: 'request changes', label: 'Request changes', description: 'Submit feedback suggesting changes.' },
];

function isAllowed(context: ReviewContext | null, event: ReviewEvent): boolean {
  if (event === 'comment') return true;
  return !!context?.allowedReviewTypes.includes(event === 'approve' ? 'APPROVE' : 'REQUEST_CHANGES');
}

const PANEL_WIDTH = 480;

// Keeps GitHub's page-level hotkeys (e.g. "t", "s") from firing while typing in our shadow DOM.
const stopPropagation = (e: SyntheticEvent) => e.stopPropagation();

export interface ReviewButtonProps {
  pr: PullRequestRef;
  onSubmitted: (redirectUrl: string | undefined) => void;
}

export function ReviewButton({ pr, onSubmitted }: ReviewButtonProps) {
  const [context, setContext] = useState<ReviewContext | null>(null);
  const [open, setOpen] = useState(false);
  const [event, setEvent] = useState<ReviewEvent>('comment');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState<ReviewEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [alignLeft, setAlignLeft] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const panelId = useId();

  const loadContext = useCallback(async () => {
    try {
      const next = await fetchReviewContext(pr.basePath);
      setContext(next);
      return next;
    } catch (e) {
      setError((e as Error).message);
      return null;
    }
  }, [pr.basePath]);

  useEffect(() => {
    void loadContext();
  }, [loadContext]);

  const close = useCallback(() => {
    setOpen(false);
    toggleRef.current?.focus();
  }, []);

  // Popovers are right-aligned by default; flip them if that would overflow the viewport's left edge.
  const measureAlignment = () =>
    setAlignLeft((rootRef.current?.getBoundingClientRect().right ?? Infinity) < PANEL_WIDTH + 16);

  useEffect(() => {
    if (!open) return;
    textareaRef.current?.focus();
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !e.composedPath().includes(rootRef.current)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [open]);

  const submit = async (reviewEvent: ReviewEvent, reviewBody: string) => {
    measureAlignment();
    setSubmitting(reviewEvent);
    setError(null);
    try {
      // Refresh so the review targets the latest head commit and includes new pending comments.
      const fresh = await fetchReviewContext(pr.basePath);
      setContext(fresh);
      if (!isAllowed(fresh, reviewEvent)) throw new Error(`You can't ${reviewEvent} this pull request.`);
      const { redirectUrl } = await submitReview(pr.basePath, {
        event: reviewEvent,
        body: reviewBody,
        headSha: fresh.headSha,
      });
      onSubmitted(redirectUrl);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(null);
    }
  };

  const toggle = () => {
    if (!open) {
      setError(null);
      measureAlignment();
      void loadContext();
    }
    setOpen(!open);
  };

  const canApprove = isAllowed(context, 'approve');
  const needsBody = event !== 'approve' && !body.trim() && !context?.pendingCommentCount;
  const canSubmit = !submitting && isAllowed(context, event) && !needsBody;
  const busy = submitting !== null;

  const onPanelKeyDown = (e: KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Escape') close();
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && canSubmit) void submit(event, body);
  };

  return (
    <div className="review" ref={rootRef}>
      <div className="split">
        <button
          type="button"
          className="btn btn-primary btn-main"
          disabled={!context || !canApprove || busy}
          title={
            !context
              ? 'Loading review options…'
              : canApprove
                ? 'Approve this pull request'
                : "You can't approve this pull request"
          }
          onClick={() => void submit('approve', '')}
        >
          <svg className="octicon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
          </svg>
          {submitting === 'approve' && !open ? 'Approving…' : 'Approve'}
        </button>
        <button
          ref={toggleRef}
          type="button"
          className="btn btn-primary btn-toggle"
          aria-label="More review actions"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          disabled={busy && !open}
          onClick={toggle}
        >
          <svg className="octicon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <path d="m4.427 7.427 3.396 3.396a.25.25 0 0 0 .354 0l3.396-3.396A.25.25 0 0 0 11.396 7H4.604a.25.25 0 0 0-.177.427Z" />
          </svg>
        </button>
      </div>

      {error && !open && (
        <div className={alignLeft ? 'toast align-left' : 'toast'} role="alert">
          {error}
        </div>
      )}

      {open && (
        <div
          id={panelId}
          className={alignLeft ? 'panel align-left' : 'panel'}
          role="dialog"
          aria-label="Finish your review"
          onKeyDown={onPanelKeyDown}
          onKeyUp={stopPropagation}
          onKeyPress={stopPropagation}
        >
          <div className="panel-header">Finish your review</div>
          <div className="panel-body">
            <textarea
              ref={textareaRef}
              aria-label="Review comment"
              placeholder="Leave a comment"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={busy}
            />
            {!!context?.pendingCommentCount && (
              <p className="note">
                {context.pendingCommentCount === 1
                  ? '1 pending comment will be submitted with this review.'
                  : `${context.pendingCommentCount} pending comments will be submitted with this review.`}
              </p>
            )}
            <fieldset disabled={busy}>
              <legend className="sr-only">Review event</legend>
              {OPTIONS.map((option) => {
                const allowed = isAllowed(context, option.event);
                return (
                  <label key={option.event} className={allowed ? 'option' : 'option disabled'}>
                    <input
                      type="radio"
                      name="review-event"
                      value={option.event}
                      checked={event === option.event}
                      disabled={!allowed}
                      onChange={() => setEvent(option.event)}
                    />
                    <span>
                      <strong>{option.label}</strong>
                      <span className="description">{option.description}</span>
                    </span>
                  </label>
                );
              })}
            </fieldset>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
          </div>
          <div className="panel-footer">
            <button type="button" className="btn" onClick={close} disabled={busy}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!canSubmit}
              onClick={() => void submit(event, body)}
            >
              {busy ? 'Submitting…' : 'Submit review'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
