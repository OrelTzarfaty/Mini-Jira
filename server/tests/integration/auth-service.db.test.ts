import type { RegisterInput } from '@mini-jira/shared';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAuthService } from '../../src/modules/auth/auth.service.js';
import { resetDatabase, testPrisma } from '../helpers/database.js';

const INPUT: RegisterInput = {
  name: 'Dana Levi',
  email: 'dana@minijira.test',
  password: 'correct horse battery staple',
};

describe('auth service: register', () => {
  const authService = createAuthService(testPrisma);

  beforeEach(resetDatabase);

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  it('AUTH-1: creates the user with an Argon2id hash and returns only public fields', async () => {
    const user = await authService.register(INPUT);

    expect(Object.keys(user).sort()).toEqual(['email', 'id', 'name']);
    expect(user).toMatchObject({ name: INPUT.name, email: INPUT.email });
    const stored = await testPrisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(stored.passwordHash).toMatch(/^\$argon2id\$/);
    expect(stored.passwordHash).not.toContain(INPUT.password);
  });

  it('AUTH-1: a registered email gets 409 EMAIL_TAKEN', async () => {
    await authService.register(INPUT);

    await expect(authService.register({ ...INPUT, name: 'Other' })).rejects.toMatchObject({
      code: 'EMAIL_TAKEN',
      status: 409,
      message: 'This email is already registered',
    });
    expect(await testPrisma.user.count()).toBe(1);
  });

  it('AUTH-1: a sign-up that loses the race to the unique index still gets 409 EMAIL_TAKEN', async () => {
    await authService.register(INPUT);
    // Simulates a second request whose check ran before the first one saved the user.
    vi.spyOn(testPrisma.user, 'findUnique').mockResolvedValueOnce(null);

    await expect(authService.register(INPUT)).rejects.toMatchObject({
      code: 'EMAIL_TAKEN',
      status: 409,
    });
    expect(await testPrisma.user.count()).toBe(1);
  });
});
