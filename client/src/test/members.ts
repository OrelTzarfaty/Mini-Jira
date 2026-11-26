import { PAGE_SIZE, Role } from '@mini-jira/shared';
import type { Member, MemberPage } from '@mini-jira/shared';
import { http, HttpResponse } from 'msw';

import { server } from './server';

/** A member of the test project who isn't the logged-in user (TEST_USER is the owner). */
export const OTHER_MEMBER: Member = {
  userId: '7a2d3b4f-5c6e-4f70-9bac-1d2e3f4a5b6c',
  name: 'Noa Katz',
  email: 'noa@example.com',
  role: Role.MEMBER,
  joinedAt: '2026-11-21T09:00:00.000Z',
};

/** The members of the test project, owner first (wireframe 06 A). */
export const TEST_MEMBERS: Member[] = [
  {
    userId: '6f1c2a3e-4b5d-4e6f-8a9b-0c1d2e3f4a5b',
    name: 'Dana Levi',
    email: 'dana@example.com',
    role: Role.OWNER,
    joinedAt: '2026-11-20T09:00:00.000Z',
  },
  OTHER_MEMBER,
];

/** One page of members, with the totals the API would send for `total` members. */
export function memberPage(items: Member[], page = 1, total = items.length): MemberPage {
  return { items, page, pageSize: PAGE_SIZE, total, totalPages: Math.ceil(total / PAGE_SIZE) };
}

/**
 * Makes GET /api/projects/:projectKey/members answer with the members, 20 per page as the API
 * does (PRJ-3, LST-4). Returns the pages it was asked for.
 */
export function mockMembers(members: Member[] = TEST_MEMBERS): number[] {
  const requestedPages: number[] = [];

  server.use(
    http.get('/api/projects/:projectKey/members', ({ request }) => {
      const page = Number(new URL(request.url).searchParams.get('page') ?? '1');
      requestedPages.push(page);
      const items = members.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

      return HttpResponse.json(memberPage(items, page, members.length));
    }),
  );

  return requestedPages;
}

/** `count` members of the test project: the test members first, then made-up ones. */
export function manyMembers(count: number): Member[] {
  const extra = Array.from({ length: count - TEST_MEMBERS.length }, (_, index) => ({
    userId: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    name: `Member ${String(index + 1).padStart(2, '0')}`,
    email: `member${String(index + 1)}@example.com`,
    role: Role.MEMBER,
    joinedAt: '2026-11-22T09:00:00.000Z',
  }));

  return [...TEST_MEMBERS, ...extra];
}
