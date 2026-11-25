import argon2 from 'argon2';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { hashPassword, verifyDummyPassword, verifyPassword } from '../../src/lib/password.js';

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

describe('verifyPassword', () => {
  it('AUTH-2: accepts the right password and rejects a wrong one', async () => {
    const hash = await hashPassword(PASSWORD);

    expect(await verifyPassword(hash, PASSWORD)).toBe(true);
    expect(await verifyPassword(hash, 'wrong password')).toBe(false);
  });
});

describe('verifyDummyPassword', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** The cost settings of a hash, like `m=65536,t=3,p=4`. */
  const costOf = (hash: string): string | undefined => /m=\d+,t=\d+,p=\d+/.exec(hash)?.[0];

  it('AUTH-2: runs a real Argon2id verify with the same cost as real hashes, reusing one hash', async () => {
    const verify = vi.spyOn(argon2, 'verify');

    await verifyDummyPassword(PASSWORD);
    await verifyDummyPassword('another password');

    expect(verify).toHaveBeenCalledTimes(2);
    const [firstHash, secondHash] = verify.mock.calls.map(([hash]) => hash);
    expect(firstHash).toMatch(/^\$argon2id\$/);
    expect(costOf(firstHash ?? '')).toBe(costOf(await hashPassword(PASSWORD)));
    expect(secondHash).toBe(firstHash);
  });
});
