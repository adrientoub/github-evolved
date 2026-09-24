import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';

describe('App', () => {
  it('shows the active badge with the version', () => {
    render(<App version="1.2.3" />);
    expect(screen.getByRole('status')).toHaveTextContent('PR Review 2.0 active (v1.2.3)');
  });

  it('can be dismissed', async () => {
    render(<App version="1.2.3" />);
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
