import { useState } from 'react';

export function App({ version }: { version: string }) {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;

  return (
    <div className="badge" role="status">
      <span className="dot" aria-hidden="true" />
      <span>PR Review 2.0 active (v{version})</span>
      <button type="button" aria-label="Dismiss" onClick={() => setVisible(false)}>
        ×
      </button>
    </div>
  );
}
