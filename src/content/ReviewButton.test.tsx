import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReviewContext } from '../github/review';
import { fetchReviewContext, submitReview } from '../github/review';
import { ReviewButton } from './ReviewButton';

vi.mock('../github/review', () => ({ fetchReviewContext: vi.fn(), submitReview: vi.fn() }));

const pr = { owner: 'o', repo: 'r', number: 1, basePath: '/o/r/pull/1' };
const context = (overrides: Partial<ReviewContext> = {}): ReviewContext => ({
  headSha: 'sha1',
  state: 'OPEN',
  allowedReviewTypes: ['APPROVE', 'REQUEST_CHANGES'],
  pendingCommentCount: 0,
  ...overrides,
});

const fetchMock = vi.mocked(fetchReviewContext);
const submitMock = vi.mocked(submitReview);

function setup(ctx = context()) {
  fetchMock.mockResolvedValue(ctx);
  submitMock.mockResolvedValue({ redirectUrl: '/o/r/pull/1' });
  const onSubmitted = vi.fn();
  const user = userEvent.setup();
  render(<ReviewButton pr={pr} onSubmitted={onSubmitted} />);
  return { user, onSubmitted };
}

const approveButton = () => screen.getByRole('button', { name: 'Approve' });
const openPanel = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: 'More review actions' }));
  return screen.getByRole('dialog', { name: 'Finish your review' });
};

afterEach(() => vi.clearAllMocks());

describe('ReviewButton', () => {
  it('approves in one click using the latest head commit', async () => {
    const { user, onSubmitted } = setup();
    await waitFor(() => expect(approveButton()).toBeEnabled());
    fetchMock.mockResolvedValue(context({ headSha: 'sha2' }));

    await user.click(approveButton());

    expect(submitMock).toHaveBeenCalledWith('/o/r/pull/1', { event: 'approve', body: '', headSha: 'sha2' });
    expect(onSubmitted).toHaveBeenCalledWith('/o/r/pull/1');
  });

  it('disables Approve while loading and when the viewer may not approve', async () => {
    let resolve!: (ctx: ReviewContext) => void;
    fetchMock.mockReturnValue(new Promise((r) => (resolve = r)));
    render(<ReviewButton pr={pr} onSubmitted={vi.fn()} />);
    expect(approveButton()).toBeDisabled();

    await act(async () => resolve(context({ allowedReviewTypes: [] })));
    expect(approveButton()).toBeDisabled();
    expect(approveButton()).toHaveAttribute('title', "You can't approve this pull request");
  });

  it('offers the same review options as GitHub, respecting permissions', async () => {
    const { user } = setup(context({ allowedReviewTypes: ['APPROVE'] }));
    const panel = await openPanel(user);

    expect(panel).toHaveTextContent('Submit general feedback without explicit approval.');
    expect(screen.getByRole('radio', { name: /^Comment/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /^Approve/ })).toBeEnabled();
    expect(screen.getByRole('radio', { name: /^Request changes/ })).toBeDisabled();
    expect(screen.getByRole('textbox', { name: 'Review comment' })).toHaveFocus();
  });

  it('requires a comment for Comment and Request changes, but not for Approve', async () => {
    const { user } = setup();
    await openPanel(user);
    const submitButton = screen.getByRole('button', { name: 'Submit review' });

    expect(submitButton).toBeDisabled();
    await user.click(screen.getByRole('radio', { name: /^Request changes/ }));
    expect(submitButton).toBeDisabled();
    await user.click(screen.getByRole('radio', { name: /^Approve/ }));
    expect(submitButton).toBeEnabled();
    await user.click(screen.getByRole('radio', { name: /^Comment/ }));
    await user.type(screen.getByRole('textbox', { name: 'Review comment' }), 'Looks good');
    expect(submitButton).toBeEnabled();
  });

  it('submits the selected review with the comment body', async () => {
    const { user, onSubmitted } = setup();
    await openPanel(user);

    await user.type(screen.getByRole('textbox', { name: 'Review comment' }), 'Please fix');
    await user.click(screen.getByRole('radio', { name: /^Request changes/ }));
    await user.click(screen.getByRole('button', { name: 'Submit review' }));

    expect(submitMock).toHaveBeenCalledWith('/o/r/pull/1', {
      event: 'request changes',
      body: 'Please fix',
      headSha: 'sha1',
    });
    expect(onSubmitted).toHaveBeenCalled();
  });

  it('allows an empty comment review when there are pending inline comments', async () => {
    const { user } = setup(context({ pendingCommentCount: 3 }));
    const panel = await openPanel(user);

    expect(panel).toHaveTextContent('3 pending comments will be submitted with this review.');
    expect(screen.getByRole('button', { name: 'Submit review' })).toBeEnabled();
  });

  it('submits with Ctrl+Enter and keeps keystrokes away from GitHub hotkeys', async () => {
    const { user } = setup();
    const pageHotkey = vi.fn();
    document.addEventListener('keydown', pageHotkey);
    await openPanel(user);

    await user.type(screen.getByRole('textbox', { name: 'Review comment' }), 'st{Control>}{Enter}{/Control}');

    expect(pageHotkey).not.toHaveBeenCalled();
    expect(submitMock).toHaveBeenCalledWith('/o/r/pull/1', { event: 'comment', body: 'st', headSha: 'sha1' });
    document.removeEventListener('keydown', pageHotkey);
  });

  it('closes on Escape and on outside click', async () => {
    const { user } = setup();
    await openPanel(user);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'More review actions' })).toHaveFocus();

    await openPanel(user);
    await user.click(document.body);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows the error and does not navigate when submission fails', async () => {
    const { user, onSubmitted } = setup();
    await waitFor(() => expect(approveButton()).toBeEnabled());
    submitMock.mockRejectedValue(new Error('Head commit changed'));

    await user.click(approveButton());

    expect(await screen.findByRole('alert')).toHaveTextContent('Head commit changed');
    expect(onSubmitted).not.toHaveBeenCalled();
    expect(approveButton()).toBeEnabled();
  });
});
