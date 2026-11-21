import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ConfirmDialog } from './confirm-dialog';
import { Button } from './ui/button';

// A page that opens the dialog from a button, the way a real delete action would.
function DeleteTicketExample({ onConfirm }: { onConfirm: () => void }): ReactElement {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => {
          setIsOpen(true);
        }}
      >
        Delete ticket
      </Button>
      <ConfirmDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        title="Delete WEB-12?"
        description="This can't be undone."
        confirmLabel="Delete"
        onConfirm={onConfirm}
      />
    </>
  );
}

async function openDialog(): Promise<void> {
  await userEvent.click(screen.getByRole('button', { name: 'Delete ticket' }));
}

describe('ConfirmDialog', () => {
  it('SETUP-5: asks the question and focuses "Cancel" first', async () => {
    render(<DeleteTicketExample onConfirm={vi.fn()} />);

    await openDialog();

    const dialog = screen.getByRole('alertdialog', { name: 'Delete WEB-12?' });
    expect(dialog).toHaveAccessibleDescription("This can't be undone.");
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  });

  it('SETUP-5: runs the action when the user confirms', async () => {
    const handleConfirm = vi.fn();
    render(<DeleteTicketExample onConfirm={handleConfirm} />);
    await openDialog();

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(handleConfirm).toHaveBeenCalledOnce();
  });

  it('SETUP-5: "Cancel" closes the dialog without running the action', async () => {
    const handleConfirm = vi.fn();
    render(<DeleteTicketExample onConfirm={handleConfirm} />);
    await openDialog();

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(handleConfirm).not.toHaveBeenCalled();
    // Radix moves focus back to the opening button right after the dialog closes.
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Delete ticket' })).toHaveFocus();
    });
  });

  it('SETUP-5: Escape closes the dialog without running the action', async () => {
    const handleConfirm = vi.fn();
    render(<DeleteTicketExample onConfirm={handleConfirm} />);
    await openDialog();

    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(handleConfirm).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Delete ticket' })).toHaveFocus();
    });
  });
});
