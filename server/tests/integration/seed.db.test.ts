import { execSync } from 'node:child_process';

import argon2 from 'argon2';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { resetDatabase, testPrisma } from '../helpers/database.js';
import { TEST_DATABASE_URL } from '../helpers/test-database-url.js';

const SEED_TIMEOUT_MS = 60_000;
const DEMO_EMAILS = ['member@minijira.test', 'outsider@minijira.test', 'owner@minijira.test'];

function runSeed(): void {
  execSync('npx prisma db seed', {
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: 'pipe',
  });
}

describe('database seed', () => {
  beforeEach(resetDatabase);

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  it(
    'SETUP-4: creates the demo accounts with a working hashed password',
    async () => {
      runSeed();

      const users = await testPrisma.user.findMany({ orderBy: { email: 'asc' } });
      expect(users.map(({ email }) => email)).toEqual(DEMO_EMAILS);

      for (const { passwordHash } of users) {
        expect(passwordHash).toMatch(/^\$argon2id\$/);
        expect(await argon2.verify(passwordHash, 'MiniJira-demo-2026')).toBe(true);
      }
    },
    SEED_TIMEOUT_MS,
  );

  it(
    'SETUP-4: running the seed again changes nothing',
    async () => {
      runSeed();
      const firstRun = await testPrisma.user.findMany({ orderBy: { email: 'asc' } });

      runSeed();
      const secondRun = await testPrisma.user.findMany({ orderBy: { email: 'asc' } });

      expect(secondRun).toEqual(firstRun);
    },
    SEED_TIMEOUT_MS,
  );
});
