import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ErrorState } from './error-state';

describe('ErrorState', () => {
  it('SETUP-5: announces the error and retries when "Try again" is clicked', async () => {
    const handleRetry = vi.fn();
    render(<ErrorState message="Couldn't load your projects." onRetry={handleRetry} />);

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load your projects.");
    expect(handleRetry).toHaveBeenCalledOnce();
  });

  it('SETUP-5: has no "Try again" button when the error cannot be retried', () => {
    render(<ErrorState message="Couldn't load the board." />);

    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load the board.");
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });
});
