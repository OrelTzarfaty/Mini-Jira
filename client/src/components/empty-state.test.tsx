import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { EmptyState } from './empty-state';
import { Button } from './ui/button';

describe('EmptyState', () => {
  it('SETUP-5: shows the title, the description, and the next step', async () => {
    const handleCreate = vi.fn();
    render(
      <EmptyState
        title="No projects yet"
        description="Create a project to start tracking your team's work."
        action={<Button onClick={handleCreate}>Create project</Button>}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Create project' }));

    expect(screen.getByRole('heading', { name: 'No projects yet' })).toBeInTheDocument();
    expect(
      screen.getByText("Create a project to start tracking your team's work."),
    ).toBeInTheDocument();
    expect(handleCreate).toHaveBeenCalledOnce();
  });

  it('SETUP-5: shows only the title when nothing else is given', () => {
    render(<EmptyState title="No tickets yet" />);

    expect(screen.getByRole('heading', { name: 'No tickets yet' })).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
