import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Avatar } from './avatar';

describe('Avatar', () => {
  it.each([
    ['Dana Levi', 'DL'],
    ['Mary Ann Smith', 'MS'],
    ['Dana', 'D'],
    ['  dana   levi  ', 'DL'],
  ])('SETUP-5: shows "%s" as the initials %s', (name, initials) => {
    render(<Avatar name={name} />);

    expect(screen.getByRole('img')).toHaveTextContent(initials, { normalizeWhitespace: false });
  });

  it('SETUP-5: gives screen readers the full name', () => {
    render(<Avatar name="Dana Levi" />);

    expect(screen.getByRole('img', { name: 'Dana Levi' })).toBeInTheDocument();
  });
});
