import argon2 from 'argon2';
import { describe, expect, it } from 'vitest';

import { hashPassword } from '../../src/lib/password.js';

const PASSWORD = 'correct horse battery staple';

describe('hashPassword', () => {
  it('SETUP-4: hashes with Argon2id and never keeps the plain password', async () => {
    const hash = await hashPassword(PASSWORD);

    expect(hash).toMatch(/^\$argon2id\$/);
    expect(hash).not.toContain(PASSWORD);
  });

  it('SETUP-4: meets the OWASP minimum strength', async () => {
    const hash = await hashPassword(PASSWORD);

    const settings = /m=(\d+),t=(\d+),p=(\d+)/.exec(hash);
    expect(Number(settings?.[1])).toBeGreaterThanOrEqual(19_456);
    expect(Number(settings?.[2])).toBeGreaterThanOrEqual(2);
    expect(Number(settings?.[3])).toBeGreaterThanOrEqual(1);
  });

  it('SETUP-4: the hash matches only the original password', async () => {
    const hash = await hashPassword(PASSWORD);

    expect(await argon2.verify(hash, PASSWORD)).toBe(true);
    expect(await argon2.verify(hash, 'wrong password')).toBe(false);
  });

  it('SETUP-4: the same password gets a different hash each time', async () => {
    expect(await hashPassword(PASSWORD)).not.toBe(await hashPassword(PASSWORD));
  });
});
