import { waitFor } from '@testing-library/react';
import { fetchReviewContext } from '../github/review';
import { HOST_ID, startReviewButton } from './mount';

vi.mock('../github/review', () => ({ fetchReviewContext: vi.fn(), submitReview: vi.fn() }));

const host = () => document.getElementById(HOST_ID);
const anchorHtml = '<div data-component="PH_Actions"><button>Code</button></div>';

describe('startReviewButton', () => {
  beforeAll(() => {
    vi.stubGlobal('requestIdleCallback', (cb: () => void) => setTimeout(cb, 0));
    vi.mocked(fetchReviewContext).mockResolvedValue({
      headSha: 'sha',
      state: 'OPEN',
      allowedReviewTypes: ['APPROVE'],
      pendingCommentCount: 0,
    });
    history.replaceState(null, '', '/o/r/pull/1');
    document.body.innerHTML = anchorHtml;
    startReviewButton();
  });

  it('mounts as the first header action on a PR page', async () => {
    await waitFor(() => expect(host()?.parentElement).toHaveAttribute('data-component', 'PH_Actions'));
    expect(host()?.nextElementSibling).toHaveTextContent('Code');
    await waitFor(() => expect(host()?.shadowRoot?.textContent).toContain('Approve'));
  });

  it('re-mounts when GitHub re-renders the header during navigation', async () => {
    history.pushState(null, '', '/o/r/pull/1/commits');
    document.body.innerHTML = anchorHtml;
    await waitFor(() =>
      expect(document.querySelector('[data-component="PH_Actions"]')?.firstElementChild?.id).toBe(HOST_ID),
    );
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
  });
});
