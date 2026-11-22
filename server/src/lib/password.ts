import { randomBytes } from 'node:crypto';

import argon2 from 'argon2';

const DUMMY_PASSWORD_BYTES = 32;

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}

/** True when the password matches the stored Argon2id hash. */
export function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password);
}

// AUTH-2: made once, on first use, by hashPassword itself, so it always has the same cost
// settings as real hashes. Its password is random and never kept, so nothing can match it.
let dummyHash: Promise<string> | undefined;

function getDummyHash(): Promise<string> {
  dummyHash ??= hashPassword(randomBytes(DUMMY_PASSWORD_BYTES).toString('hex')).catch(
    (error: unknown) => {
      // Don't keep a failed promise: the next login tries again.
      dummyHash = undefined;
      throw error;
    },
  );

  return dummyHash;
}

/**
 * AUTH-2: runs a real Argon2id verify for a login with an unknown email, so it takes as long
 * as a wrong password and the response time doesn't reveal whether the account exists.
 */
export async function verifyDummyPassword(password: string): Promise<void> {
  await argon2.verify(await getDummyHash(), password);
}
