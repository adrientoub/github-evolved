export interface ClipboardLink {
  html: string;
  text: string;
}

const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
const escapeMarkdownLabel = (value: string) => value.replace(/[\\[\]]/g, '\\$&');

/** Rich-text apps (Teams, Outlook, Slack, Docs) paste the HTML link; plain-text targets get Markdown. */
export function formatLink(title: string, url: string): ClipboardLink {
  return {
    html: `<a href="${escapeHtml(url)}">${escapeHtml(title)}</a>`,
    text: `[${escapeMarkdownLabel(title)}](${url})`,
  };
}

function copyWithExecCommand({ html, text }: ClipboardLink): void {
  const onCopy = (e: ClipboardEvent) => {
    e.preventDefault();
    e.clipboardData?.setData('text/html', html);
    e.clipboardData?.setData('text/plain', text);
  };
  document.addEventListener('copy', onCopy, { capture: true, once: true });
  try {
    if (!document.execCommand('copy')) throw new Error('Copy command was rejected.');
  } finally {
    document.removeEventListener('copy', onCopy, { capture: true });
  }
}

export async function writeLink(link: ClipboardLink): Promise<void> {
  if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([link.html], { type: 'text/html' }),
          'text/plain': new Blob([link.text], { type: 'text/plain' }),
        }),
      ]);
      return;
    } catch {
      // Fall through: the async API can be blocked (e.g. by permissions policy) while execCommand still works.
    }
  }
  copyWithExecCommand(link);
}
