import type { Page } from '@playwright/test';

import { SEED_USERS } from '../support/auth-api.js';
import { expect, test } from '../support/fixtures.js';
import { collectPageErrors } from '../support/page-errors.js';
import { addMemberThroughApi, createProjectThroughApi } from '../support/projects-api.js';
import type { CreatedProject } from '../support/projects-api.js';
import { createTicketThroughApi } from '../support/tickets-api.js';

// TKT-4: the ticket's reporter or the project owner can delete it, after a confirmation; others
// don't see Delete. The seed owner creates a fresh project (random key) with the seed member, so
// every test has its own data.

/** Deletes the open ticket through its page: Delete, then Delete in the confirmation dialog. */
async function deleteOpenTicket(page: Page, ticketKey: string): Promise<void> {
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  const dialog = page.getByRole('alertdialog', { name: `Delete ${ticketKey}?` });
  await expect(dialog).toContainText(
    "This also deletes its comments and history. This can't be undone.",
  );
  await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(dialog).toBeHidden();
}

test.describe('Delete a ticket (TKT-4)', () => {
  let project: CreatedProject;

  test.beforeEach(async ({ seedSession }) => {
    const ownerSession = await seedSession('owner');
    project = await createProjectThroughApi(ownerSession);
    await addMemberThroughApi(ownerSession, project.key, SEED_USERS.member.email);
  });

  test('TKT-4: the reporter deletes their ticket, lands on the board, and the URL then shows "Ticket not found"', async ({
    memberPage,
    seedSession,
  }) => {
    const ticketKey = await createTicketThroughApi(await seedSession('member'), project.key, {
      title: 'A ticket the member reported',
    });
    const ticketPath = `/projects/${project.key}/tickets/${ticketKey}`;
    const consoleErrors = collectPageErrors(memberPage);
    await memberPage.goto(ticketPath);

    await deleteOpenTicket(memberPage, ticketKey);

    await expect(memberPage).toHaveURL(`/projects/${project.key}/board`);
    await expect(memberPage.getByRole('status').filter({ hasText: 'deleted' })).toHaveText(
      `${ticketKey} deleted`,
    );
    expect(consoleErrors).toEqual([]);

    await memberPage.goto(ticketPath);
    await expect(
      memberPage.getByRole('heading', { level: 1, name: 'Ticket not found' }),
    ).toBeVisible();
  });

  test('TKT-4: the project owner deletes a ticket another member reported', async ({
    ownerPage,
    seedSession,
  }) => {
    const ticketKey = await createTicketThroughApi(await seedSession('member'), project.key, {
      title: 'Reported by the member',
    });
    await ownerPage.goto(`/projects/${project.key}/tickets/${ticketKey}`);

    await deleteOpenTicket(ownerPage, ticketKey);

    await expect(ownerPage).toHaveURL(`/projects/${project.key}/board`);
    await expect(ownerPage.getByRole('status').filter({ hasText: 'deleted' })).toHaveText(
      `${ticketKey} deleted`,
    );
  });

  test('TKT-4: a member who is not the reporter does not see Delete', async ({
    memberPage,
    seedSession,
  }) => {
    const ticketKey = await createTicketThroughApi(await seedSession('owner'), project.key, {
      title: 'Reported by the owner',
    });

    await memberPage.goto(`/projects/${project.key}/tickets/${ticketKey}`);

    await expect(
      memberPage.getByRole('heading', { level: 1, name: 'Reported by the owner' }),
    ).toBeVisible();
    await expect(memberPage.getByRole('button', { name: 'Copy link' })).toBeVisible();
    await expect(memberPage.getByRole('button', { name: 'Delete', exact: true })).toHaveCount(0);
  });
});
