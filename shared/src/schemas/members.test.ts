import { describe, expect, it } from 'vitest';

import {
  addMemberSchema,
  alreadyMemberMessage,
  INVALID_USER_ID_MESSAGE,
  memberPageSchema,
  memberParamsSchema,
  memberSchema,
  USER_NOT_FOUND_MESSAGE,
} from './members.js';

/** The messages zod reports for the email field, so tests check the exact text the user sees. */
const emailMessages = (input: unknown): string[] => {
  const result = addMemberSchema.safeParse(input);
  if (result.success) return [];

  return result.error.issues.map((issue) => issue.message);
};

describe('addMemberSchema', () => {
  it('PRJ-3: trims and lowercases the email like register does', () => {
    expect(addMemberSchema.parse({ email: '  Avi@MiniJira.TEST ' })).toEqual({
      email: 'avi@minijira.test',
    });
  });

  it.each([
    ['missing', {}, 'Email is required'],
    ['empty', { email: '   ' }, 'Email is required'],
    ['not an email', { email: 'avi' }, 'Enter a valid email address'],
  ])('PRJ-3: rejects an email that is %s', (_description, input, message) => {
    expect(emailMessages(input)).toEqual([message]);
  });

  it('PRJ-3: rejects unknown fields, so a role can never be sent', () => {
    expect(addMemberSchema.safeParse({ email: 'avi@minijira.test', role: 'OWNER' }).success).toBe(
      false,
    );
  });
});

describe('member messages', () => {
  it('PRJ-3: uses the wireframe 06 C texts', () => {
    expect(USER_NOT_FOUND_MESSAGE).toBe(
      'No Mini-Jira user with this email. They need to register first.',
    );
    expect(alreadyMemberMessage('Avi Ben')).toBe('Avi Ben is already a member.');
  });
});

const member = {
  userId: '0b7c9f3e-4a51-4c4e-9a52-2f1f7f0f9d11',
  name: 'Avi Ben',
  email: 'avi@minijira.test',
  role: 'MEMBER',
  joinedAt: '2026-11-24T10:00:00.000Z',
};

describe('memberSchema', () => {
  it('PRJ-3: accepts a member with their role and join time', () => {
    expect(memberSchema.parse(member)).toEqual(member);
  });

  it('PRJ-3: drops fields that are not part of the response, like a password hash', () => {
    expect(memberSchema.parse({ ...member, passwordHash: 'secret' })).toEqual(member);
  });

  it('PRJ-3: rejects an unknown role', () => {
    expect(memberSchema.safeParse({ ...member, role: 'ADMIN' }).success).toBe(false);
  });
});

describe('memberPageSchema', () => {
  it('LST-4: accepts a page of members', () => {
    const page = { items: [member], page: 1, pageSize: 20, total: 1, totalPages: 1 };

    expect(memberPageSchema.parse(page)).toEqual(page);
  });

  it('LST-4: rejects a page without its totals', () => {
    expect(memberPageSchema.safeParse({ items: [member], page: 1 }).success).toBe(false);
  });
});

describe('memberParamsSchema', () => {
  const userId = '0b6f2c1e-8f4a-4c3b-9a7d-2e5f1a3b4c6d';

  it('PRJ-4: accepts a UUID and drops the other path parameters', () => {
    expect(memberParamsSchema.parse({ projectKey: 'WEB', userId })).toEqual({ userId });
  });

  it.each([
    ['not a UUID', { userId: 'abc' }],
    ['missing', {}],
    ['a UUID with extra characters', { userId: `${userId}x` }],
  ])('PRJ-4: rejects a user id that is %s', (_description, input) => {
    const result = memberParamsSchema.safeParse(input);

    expect(result.success).toBe(false);
    expect(result.error?.issues.map(({ path }) => path)).toEqual([['userId']]);
  });

  it('PRJ-4: a bad UUID gets the shared message', () => {
    expect(memberParamsSchema.safeParse({ userId: 'abc' }).error?.issues[0]?.message).toBe(
      INVALID_USER_ID_MESSAGE,
    );
  });
});
