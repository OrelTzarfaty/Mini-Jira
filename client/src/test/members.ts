import { PAGE_SIZE, Role } from '@mini-jira/shared';
import type { Member, MemberPage } from '@mini-jira/shared';
import { http, HttpResponse } from 'msw';

import { server } from './server';

/** The members of the test project, owner first (wireframe 06 A). */
export const TEST_MEMBERS: Member[] = [
  {
    userId: '6f1c2a3e-4b5d-4e6f-8a9b-0c1d2e3f4a5b',
    name: 'Dana Levi',
    email: 'dana@example.com',
    role: Role.OWNER,
    joinedAt: '2026-11-20T09:00:00.000Z',
  },
  {
    userId: '7a2d3b4f-5c6e-4f70-9bac-1d2e3f4a5b6c',
    name: 'Noa Katz',
    email: 'noa@example.com',
    role: Role.MEMBER,
    joinedAt: '2026-11-21T09:00:00.000Z',
  },
];

/** One page of members, with the totals the API would send for `total` members. */
export function memberPage(items: Member[], page = 1, total = items.length): MemberPage {
  return { items, page, pageSize: PAGE_SIZE, total, totalPages: Math.ceil(total / PAGE_SIZE) };
}

/** Makes GET /api/projects/:projectKey/members answer with one page of members (PRJ-3). */
export function mockMembers(members: Member[] = TEST_MEMBERS): void {
  server.use(
    http.get('/api/projects/:projectKey/members', () => HttpResponse.json(memberPage(members))),
  );
}
