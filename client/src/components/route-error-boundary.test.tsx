import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { RootErrorBoundary, RouteErrorBoundary } from './route-error-boundary';

import { renderRoute } from '@/test/render-route';

function BrokenPage(): ReactElement {
  throw new Error('Cannot read properties of undefined');
}

function hideExpectedCrashLogs(): void {
  // React and React Router log the crash to the console; that is expected here.
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
}

describe('RouteErrorBoundary', () => {
  it('SETUP-5: a page that crashes shows a message instead of a blank screen', async () => {
    hideExpectedCrashLogs();

    renderRoute('/', [
      { ErrorBoundary: RouteErrorBoundary, children: [{ path: '/', Component: BrokenPage }] },
    ]);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Something went wrong' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent("This page couldn't be shown.");
    expect(screen.queryByText(/Cannot read properties/)).not.toBeInTheDocument();
    expect(document.title).toBe('Something went wrong · Mini-Jira');
  });

  it('SETUP-5: "Try again" reloads the page', async () => {
    hideExpectedCrashLogs();
    const reload = vi.fn();
    vi.stubGlobal('location', { ...window.location, reload });
    renderRoute('/', [
      { ErrorBoundary: RouteErrorBoundary, children: [{ path: '/', Component: BrokenPage }] },
    ]);

    await userEvent.click(await screen.findByRole('button', { name: 'Try again' }));

    expect(reload).toHaveBeenCalledOnce();
  });
});

describe('RootErrorBoundary', () => {
  it('SETUP-5: a crash in a page layout still shows the message inside a main landmark', async () => {
    hideExpectedCrashLogs();
    renderRoute('/', [
      {
        ErrorBoundary: RootErrorBoundary,
        // The crashing component is the layout here, around the page route.
        children: [{ Component: BrokenPage, children: [{ path: '/' }] }],
      },
    ]);

    const main = await screen.findByRole('main');
    expect(
      within(main).getByRole('heading', { level: 1, name: 'Something went wrong' }),
    ).toBeInTheDocument();
  });
});
