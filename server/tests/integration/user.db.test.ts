import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { resetDatabase, testPrisma } from '../helpers/database.js';

const USER = {
  name: 'Dana Levi',
  email: 'dana@minijira.test',
  passwordHash: 'not-a-real-hash',
};

describe('User table', () => {
  beforeEach(resetDatabase);

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  it('SETUP-4: tests run against the test database', async () => {
    const [database] = await testPrisma.$queryRaw<{ name: string }[]>`
      SELECT current_database() AS name
    `;

    expect(database?.name).toBe('minijira_test');
  });

  it('SETUP-4: stores a user with an ID and timestamps', async () => {
    const user = await testPrisma.user.create({ data: USER });

    expect(user).toMatchObject(USER);
    expect(user.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(user.createdAt).toBeInstanceOf(Date);
    expect(user.updatedAt).toBeInstanceOf(Date);
  });

  it('SETUP-4: rejects a second user with the same email', async () => {
    await testPrisma.user.create({ data: USER });

    await expect(testPrisma.user.create({ data: USER })).rejects.toMatchObject({ code: 'P2002' });
    expect(await testPrisma.user.count()).toBe(1);
  });

  it('SETUP-4: resetting the database removes all rows', async () => {
    await testPrisma.user.create({ data: USER });

    await resetDatabase();

    expect(await testPrisma.user.count()).toBe(0);
  });
});
