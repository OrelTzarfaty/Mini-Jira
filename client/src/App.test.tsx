import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from '@/App';

describe('App', () => {
  it('SETUP-5: opens on the landing page', async () => {
    render(<App />);

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: "Plan, track and ship your team's work.",
      }),
    ).toBeInTheDocument();
  });
});
