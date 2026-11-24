import { describe, expect, it } from 'vitest';

import { memberPageSchema, memberSchema } from './members.js';

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
