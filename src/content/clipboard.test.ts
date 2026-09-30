import { formatLink, writeLink } from './clipboard';

const link = { html: '<a href="u">t</a>', text: '[t](u)' };

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('formatLink', () => {
  it('builds an HTML link and a Markdown fallback', () => {
    expect(formatLink('Fix <b> & "quotes"', 'https://github.com/o/r/pull/1')).toEqual({
      html: '<a href="https://github.com/o/r/pull/1">Fix &lt;b&gt; &amp; &quot;quotes&quot;</a>',
      text: '[Fix <b> & "quotes"](https://github.com/o/r/pull/1)',
    });
  });

  it('escapes brackets in the Markdown label', () => {
    expect(formatLink('[WIP] a\\b', 'https://x').text).toBe('[\\[WIP\\] a\\\\b](https://x)');
  });
});

describe('writeLink', () => {
  it('writes HTML and plain text with the async clipboard API', async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { write } });
    vi.stubGlobal(
      'ClipboardItem',
      class {
        constructor(public items: Record<string, Blob>) {}
      },
    );

    await writeLink(link);

    const [[item]] = write.mock.calls[0] as [[{ items: Record<string, Blob> }]];
    expect(Object.keys(item.items)).toEqual(['text/html', 'text/plain']);
    expect(await item.items['text/html'].text()).toBe(link.html);
    expect(await item.items['text/plain'].text()).toBe(link.text);
  });

  it('falls back to a copy event when the async API is unavailable', async () => {
    const setData = vi.fn();
    document.execCommand = vi.fn(() => {
      const event = new Event('copy', { cancelable: true }) as ClipboardEvent;
      Object.defineProperty(event, 'clipboardData', { value: { setData } });
      document.dispatchEvent(event);
      return true;
    });

    await writeLink(link);

    expect(setData).toHaveBeenCalledWith('text/html', link.html);
    expect(setData).toHaveBeenCalledWith('text/plain', link.text);
  });

  it('rejects when every strategy fails', async () => {
    vi.stubGlobal('navigator', { clipboard: { write: vi.fn().mockRejectedValue(new Error('denied')) } });
    vi.stubGlobal('ClipboardItem', class {});
    document.execCommand = vi.fn(() => false);

    await expect(writeLink(link)).rejects.toThrow('Copy command was rejected.');
  });
});
