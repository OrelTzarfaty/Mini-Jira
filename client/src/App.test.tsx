import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from '@/App';

describe('App', () => {
  it('SETUP-5: shows the app name as the page heading', () => {
    render(<App />);

    expect(screen.getByRole('heading', { level: 1, name: 'Mini-Jira' })).toBeInTheDocument();
  });
});
