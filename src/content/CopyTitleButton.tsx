import { useEffect, useRef, useState } from 'react';
import { formatLink, writeLink } from './clipboard';

type Status = 'idle' | 'copied' | 'failed';

export const FEEDBACK_MS = 2000;

const MESSAGES: Record<Status, string> = {
  idle: '',
  copied: 'Copied title with link',
  failed: "Couldn't copy to clipboard",
};

const ICONS: Record<Status, string> = {
  idle: 'M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25ZM5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z',
  copied:
    'M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z',
  failed:
    'M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z',
};

export interface CopyTitleButtonProps {
  /** Called on click so the latest title (after in-page edits) is copied. */
  getTitle: () => string | null;
  number: number;
  url: string;
}

export function CopyTitleButton({ getTitle, number, url }: CopyTitleButtonProps) {
  const [status, setStatus] = useState<Status>('idle');
  // Bumped on every click so the animation replays even if the status doesn't change.
  const [clicks, setClicks] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    clearTimeout(timer.current);
    let next: Status = 'copied';
    try {
      const title = getTitle();
      if (!title) throw new Error('Pull request title not found.');
      await writeLink(formatLink(`PR#${number}: ${title}`, url));
    } catch {
      next = 'failed';
    }
    setStatus(next);
    setClicks((n) => n + 1);
    timer.current = setTimeout(() => setStatus('idle'), FEEDBACK_MS);
  };

  return (
    <span className="copy-title">
      <button
        type="button"
        className={`btn btn-icon copy-button ${status}`}
        aria-label="Copy title with link"
        title="Copy title with link"
        onClick={() => void copy()}
      >
        <svg
          key={`${status}-${clicks}`}
          className="octicon copy-icon"
          viewBox="0 0 16 16"
          width="16"
          height="16"
          aria-hidden="true"
        >
          <path d={ICONS[status]} />
        </svg>
        {status !== 'idle' && <span key={clicks} className="ripple" aria-hidden="true" />}
      </button>
      {status !== 'idle' && (
        <span key={clicks} className={`bubble ${status}`} aria-hidden="true">
          {status === 'copied' ? 'Copied!' : 'Copy failed'}
        </span>
      )}
      <span className="sr-only" role="status">
        {MESSAGES[status]}
      </span>
    </span>
  );
}
