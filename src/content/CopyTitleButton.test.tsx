import { act, fireEvent, render, screen } from '@testing-library/react';
import { writeLink } from './clipboard';
import { CopyTitleButton, FEEDBACK_MS } from './CopyTitleButton';

vi.mock('./clipboard', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./clipboard')>()),
  writeLink: vi.fn(),
}));

const writeMock = vi.mocked(writeLink);
const url = 'https://github.com/o/r/pull/1';
const button = () => screen.getByRole('button', { name: 'Copy title with link' });

async function click() {
  await act(async () => {
    fireEvent.click(button());
  });
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('CopyTitleButton', () => {
  it('copies the current title as a link and animates confirmation', async () => {
    writeMock.mockResolvedValue();
    let title = 'Old title';
    render(<CopyTitleButton number={1} url={url} getTitle={() => title} />);
    title = 'Edited [title]';

    await click();

    expect(writeMock).toHaveBeenCalledWith({
      html: `<a href="${url}">PR#1: Edited [title]</a>`,
      text: `[PR#1: Edited \\[title\\]](${url})`,
    });
    expect(button()).toHaveClass('copied');
    expect(screen.getByText('Copied!')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Copied title with link');
    expect(button().querySelector('.ripple')).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(FEEDBACK_MS));

    expect(button()).not.toHaveClass('copied');
    expect(screen.queryByText('Copied!')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('replays the animation and keeps focus on repeated clicks', async () => {
    writeMock.mockResolvedValue();
    render(<CopyTitleButton number={1} url={url} getTitle={() => 'Title'} />);
    button().focus();

    await click();
    const firstIcon = button().querySelector('svg');
    act(() => vi.advanceTimersByTime(FEEDBACK_MS / 2));
    await click();

    expect(button().querySelector('svg')).not.toBe(firstIcon);
    expect(button()).toHaveFocus();
    act(() => vi.advanceTimersByTime(FEEDBACK_MS / 2 + 1));
    expect(button()).toHaveClass('copied');
  });

  it('shows an error state when copying fails', async () => {
    writeMock.mockRejectedValue(new Error('denied'));
    render(<CopyTitleButton number={1} url={url} getTitle={() => 'Title'} />);

    await click();

    expect(button()).toHaveClass('failed');
    expect(screen.getByText('Copy failed')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent("Couldn't copy to clipboard");
  });

  it('fails without touching the clipboard when the title is missing', async () => {
    render(<CopyTitleButton number={1} url={url} getTitle={() => null} />);

    await click();

    expect(writeMock).not.toHaveBeenCalled();
    expect(button()).toHaveClass('failed');
  });
});
