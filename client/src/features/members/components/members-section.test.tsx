import { alreadyMemberMessage, ErrorCode, Role, USER_NOT_FOUND_MESSAGE } from '@mini-jira/shared';
import type { ErrorResponse, Member } from '@mini-jira/shared';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { createQueryClient } from '@/api/query-client';
import { PROJECTS_QUERY_KEY } from '@/api/query-keys';
import { memberPage, mockMembers, TEST_MEMBERS } from '@/test/members';
import { mockProject } from '@/test/project';
import { renderRoute } from '@/test/render-route';
import { server } from '@/test/server';
import { mockLoggedIn } from '@/test/session';

const MEMBERS_URL = '/api/projects/:projectKey/members';
const NEW_MEMBER: Member = {
  userId: '8b3e4c5a-6d7f-4a81-8cbd-2e3f4a5b6c7d',
  name: 'Avi Ben',
  email: 'avi@example.com',
  role: Role.MEMBER,
  joinedAt: '2026-11-24T09:00:00.000Z',
};

/** Opens the settings page of WEB as its owner. */
function openSettings(queryClient = createQueryClient()): void {
  mockLoggedIn();
  mockProject();
  renderRoute('/projects/WEB/settings', undefined, { queryClient });
}

function memberRows(): HTMLElement[] {
  return within(screen.getByRole('list', { name: 'Members' })).getAllByRole('listitem');
}

function respondToAddWith(status: number, error: ErrorResponse['error']): void {
  server.use(http.post(MEMBERS_URL, () => HttpResponse.json({ error }, { status })));
}

async function addByEmail(email: string): Promise<HTMLElement> {
  const field = await screen.findByLabelText('Add a member by email');
  await userEvent.type(field, email);
  await userEvent.click(screen.getByRole('button', { name: 'Add' }));

  return field;
}

/** `count` members after the owner, with stable made-up ids. */
function manyMembers(count: number, firstNumber = 1): Member[] {
  return Array.from({ length: count }, (_, index) => {
    const number = firstNumber + index;

    return {
      userId: `00000000-0000-4000-8000-${String(number).padStart(12, '0')}`,
      name: `Member ${String(number)}`,
      email: `member${String(number)}@example.com`,
      role: Role.MEMBER,
      joinedAt: '2026-11-22T09:00:00.000Z',
    };
  });
}

describe('Members list', () => {
  it('PRJ-3: shows loading rows while the members load', async () => {
    server.use(
      http.get(MEMBERS_URL, async () => {
        await delay('infinite');
      }),
    );

    openSettings();

    expect(await screen.findByText('Loading members')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Members' })).toBeInTheDocument();
  });

  it('PRJ-3: shows each member with name, email, and role, owner first, and the count', async () => {
    mockMembers();

    openSettings();

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Members (2)' }),
    ).toBeInTheDocument();
    const [ownerRow, memberRow] = memberRows();
    expect(ownerRow).toHaveTextContent('Dana Levi');
    expect(ownerRow).toHaveTextContent('dana@example.com');
    expect(ownerRow).toHaveTextContent('Owner');
    expect(memberRow).toHaveTextContent('Noa Katz');
    expect(memberRow).toHaveTextContent('noa@example.com');
    expect(memberRow).toHaveTextContent('Member');
    expect(screen.queryByRole('button', { name: 'Show more' })).not.toBeInTheDocument();
  });

  it('PRJ-3: a failed load shows an error with "Try again", which loads the members', async () => {
    let requests = 0;
    server.use(
      http.get(MEMBERS_URL, () => {
        requests += 1;

        return requests === 1
          ? HttpResponse.json(
              { error: { code: ErrorCode.INTERNAL_ERROR, message: 'Something went wrong' } },
              { status: 500 },
            )
          : HttpResponse.json(memberPage(TEST_MEMBERS));
      }),
    );
    // The app retries a 5xx three times with growing waits; the test checks the error state now.
    const queryClient = createQueryClient();
    queryClient.setQueryDefaults(PROJECTS_QUERY_KEY, { retry: false });

    openSettings(queryClient);

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load the members.");
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Noa Katz')).toBeInTheDocument();
    expect(requests).toBe(2);
  });

  it('PRJ-3: "Show more" adds the next page under the first', async () => {
    const firstPage = [...TEST_MEMBERS.slice(0, 1), ...manyMembers(19)];
    const secondPage = manyMembers(1, 20);
    const requestedPages: string[] = [];
    server.use(
      http.get(MEMBERS_URL, ({ request }) => {
        const page = new URL(request.url).searchParams.get('page') ?? '';
        requestedPages.push(page);

        return HttpResponse.json(
          page === '2' ? memberPage(secondPage, 2, 21) : memberPage(firstPage, 1, 21),
        );
      }),
    );

    openSettings();

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Members (21)' }),
    ).toBeInTheDocument();
    expect(memberRows()).toHaveLength(20);

    await userEvent.click(screen.getByRole('button', { name: 'Show more' }));

    expect(await screen.findByText('Member 20')).toBeInTheDocument();
    expect(memberRows()).toHaveLength(21);
    expect(screen.queryByRole('button', { name: 'Show more' })).not.toBeInTheDocument();
    expect(requestedPages).toEqual(['1', '2']);
  });
});

describe('Add a member by email', () => {
  it('PRJ-3: a badly formed email shows the error under the field and sends nothing', async () => {
    mockMembers();
    let addRequests = 0;
    server.use(
      http.post(MEMBERS_URL, () => {
        addRequests += 1;

        return HttpResponse.json(NEW_MEMBER, { status: 201 });
      }),
    );
    openSettings();

    const field = await addByEmail('not-an-email');

    expect(field).toHaveAccessibleDescription('Enter a valid email address');
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveValue('not-an-email');
    expect(addRequests).toBe(0);
  });

  it('PRJ-3: an unknown email (404) shows the server message under the field and keeps the input', async () => {
    mockMembers();
    respondToAddWith(404, {
      code: ErrorCode.USER_NOT_FOUND,
      message: USER_NOT_FOUND_MESSAGE,
      details: [{ field: 'email', message: USER_NOT_FOUND_MESSAGE }],
    });
    openSettings();

    const field = await addByEmail('nobody@example.com');

    await waitFor(() => {
      expect(field).toHaveAccessibleDescription(USER_NOT_FOUND_MESSAGE);
    });
    expect(field).toHaveValue('nobody@example.com');
    expect(field).toHaveFocus();
  });

  it('PRJ-3: an existing member (409) shows "<name> is already a member." under the field', async () => {
    mockMembers();
    respondToAddWith(409, {
      code: ErrorCode.ALREADY_MEMBER,
      message: alreadyMemberMessage('Noa Katz'),
      details: [{ field: 'email', message: alreadyMemberMessage('Noa Katz') }],
    });
    openSettings();

    const field = await addByEmail('noa@example.com');

    await waitFor(() => {
      expect(field).toHaveAccessibleDescription('Noa Katz is already a member.');
    });
    expect(field).toHaveValue('noa@example.com');
  });

  it('PRJ-3: Add is disabled while the email is being sent', async () => {
    mockMembers();
    server.use(
      http.post(MEMBERS_URL, async () => {
        await delay('infinite');
      }),
    );
    openSettings();

    await addByEmail('avi@example.com');

    expect(await screen.findByRole('button', { name: 'Adding…' })).toBeDisabled();
  });

  it('PRJ-3: a successful add clears the field, announces "<name> added", and reloads the list', async () => {
    let members = TEST_MEMBERS;
    let sentBody: unknown;
    server.use(
      http.get(MEMBERS_URL, () => HttpResponse.json(memberPage(members))),
      http.post(MEMBERS_URL, async ({ request }) => {
        sentBody = await request.json();
        members = [...TEST_MEMBERS, NEW_MEMBER];

        return HttpResponse.json(NEW_MEMBER, { status: 201 });
      }),
    );
    openSettings();

    const field = await addByEmail('  Avi@Example.com ');

    expect(await screen.findByText('Avi Ben added')).toHaveAttribute('role', 'status');
    expect(field).toHaveValue('');
    // Trimmed and lowercased by the shared schema, like the server does.
    expect(sentBody).toEqual({ email: 'avi@example.com' });
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Members (3)' }),
    ).toBeInTheDocument();
    expect(memberRows()[2]).toHaveTextContent('Avi Ben');
  });
});
