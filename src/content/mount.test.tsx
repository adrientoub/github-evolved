import { waitFor } from '@testing-library/react';
import { fetchReviewContext } from '../github/review';
import { COPY_TITLE_HOST_ID, HOST_ID, startContentScript } from './mount';

vi.mock('../github/review', () => ({ fetchReviewContext: vi.fn(), submitReview: vi.fn() }));

const host = () => document.getElementById(HOST_ID);
const copyHost = () => document.getElementById(COPY_TITLE_HOST_ID);
const headerHtml = `<div data-component="TitleArea"><div><h1 data-component="PH_Title"><span class="markdown-title">Title</span></h1><span class="suffix"><span>#1</span></span></div></div>
<div data-component="PH_Actions"><button>Code</button></div>`;

describe('startContentScript', () => {
  beforeAll(() => {
    vi.stubGlobal('requestIdleCallback', (cb: () => void) => setTimeout(cb, 0));
    vi.mocked(fetchReviewContext).mockResolvedValue({
      headSha: 'sha',
      state: 'OPEN',
      allowedReviewTypes: ['APPROVE'],
      pendingCommentCount: 0,
    });
    history.replaceState(null, '', '/o/r/pull/1');
    document.body.innerHTML = headerHtml;
    startContentScript();
  });

  it('mounts as the first header action on a PR page', async () => {
    await waitFor(() => expect(host()?.parentElement).toHaveAttribute('data-component', 'PH_Actions'));
    expect(host()?.nextElementSibling).toHaveTextContent('Code');
    await waitFor(() => expect(host()?.shadowRoot?.textContent).toContain('Approve'));
  });

  it('mounts the copy button after the PR number next to the title', async () => {
    await waitFor(() => expect(copyHost()?.parentElement).toHaveClass('suffix'));
    expect(copyHost()?.previousElementSibling).toHaveTextContent('#1');
    expect(copyHost()).toHaveAttribute('data-widget', 'copy-title');
    await waitFor(() =>
      expect(copyHost()?.shadowRoot?.querySelector('button[aria-label="Copy title with link"]')).not.toBeNull(),
    );
  });

  it('re-mounts when GitHub re-renders the header during navigation', async () => {
    history.pushState(null, '', '/o/r/pull/1/commits');
    document.body.innerHTML = headerHtml;
    await waitFor(() =>
      expect(document.querySelector('[data-component="PH_Actions"]')?.firstElementChild?.id).toBe(HOST_ID),
    );
    await waitFor(() => expect(document.querySelector('.suffix')?.lastElementChild?.id).toBe(COPY_TITLE_HOST_ID));
  });

  it('falls back to the title itself when there is no number suffix', async () => {
    document.body.innerHTML = '<h1 data-component="PH_Title"><bdi class="markdown-title">Title</bdi> #1</h1>';
    await waitFor(() => expect(copyHost()?.parentElement).toHaveAttribute('data-component', 'PH_Title'));
  });

  it('supports the legacy header', async () => {
    document.body.innerHTML = `<div class="gh-header-show"><h1 class="gh-header-title"><bdi class="js-issue-title">Title</bdi>
      <span class="gh-header-number">#1</span></h1></div><div class="gh-header-actions"></div>`;
    await waitFor(() => expect(copyHost()?.parentElement).toHaveClass('gh-header-title'));
    expect(host()?.parentElement).toHaveClass('gh-header-actions');
  });

  it('loads the new PR after navigating to another PR', async () => {
    history.pushState(null, '', '/o/r/pull/2');
    document.body.append(document.createElement('span'));
    await waitFor(() => expect(fetchReviewContext).toHaveBeenLastCalledWith('/o/r/pull/2'));
  });

  it('removes itself when leaving pull request pages', async () => {
    history.pushState(null, '', '/o/r/issues/5');
    document.body.append(document.createElement('span'));
    await waitFor(() => expect(host()).toBeNull());
    expect(copyHost()).toBeNull();
  });
});
