import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import styles from './styles.css?inline';

export const HOST_ID = 'gh-pr-review-root';

function mount() {
  if (document.getElementById(HOST_ID)) return;

  const host = document.createElement('div');
  host.id = HOST_ID;
  // Attach to <html> so GitHub's Turbo body swaps don't remove it.
  document.documentElement.append(host);

  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = styles;
  const container = document.createElement('div');
  shadow.append(style, container);

  createRoot(container).render(
    <StrictMode>
      <App version={chrome.runtime.getManifest().version} />
    </StrictMode>,
  );
}

mount();
