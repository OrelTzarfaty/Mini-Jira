import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PageSkeleton } from './page-skeleton';

describe('PageSkeleton', () => {
  it('SETUP-5: tells screen readers what is loading', () => {
    render(<PageSkeleton label="Loading your projects" />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading your projects');
  });

  it('SETUP-5: says "Loading" when no label is given', () => {
    render(<PageSkeleton />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading');
  });
});
