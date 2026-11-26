import type { Locator, Page } from '@playwright/test';

import { SEED_USERS } from '../support/auth-api.js';
import { expect, test } from '../support/fixtures.js';
import { collectPageErrors } from '../support/page-errors.js';
import { addMemberThroughApi, createProjectThroughApi } from '../support/projects-api.js';
import { createTicketThroughApi } from '../support/tickets-api.js';

// TKT-5: any member assigns a ticket. The seed owner creates a fresh project (random key) with
// the seed member and one unassigned ticket, so the test has its own data.

/** The "Assigned to" value in the ticket page's details panel. */
function assignedTo(page: Page): Locator {
  return page
    .getByRole('complementary', { name: 'Details' })
    .locator('div')
    .filter({ has: page.getByText('Assigned to', { exact: true }) });
}

test.describe('Assign a ticket (TKT-5)', () => {
  test('TKT-5: a member assigns the ticket to another member in edit mode, then takes it with "Assign to me", and it stays after a reload', async ({
    seedSession,
    memberPage,
  }) => {
    const ownerSession = await seedSession('owner');
    const project = await createProjectThroughApi(ownerSession);
    await addMemberThroughApi(ownerSession, project.key, SEED_USERS.member.email);
    const ticketKey = await createTicketThroughApi(ownerSession, project.key, {
      title: 'Fix login redirect',
    });
    const consoleErrors = collectPageErrors(memberPage);

    await memberPage.goto(`/projects/${project.key}/tickets/${ticketKey}`);
    await expect(assignedTo(memberPage)).toContainText('Unassigned');
    await memberPage.getByRole('button', { name: 'Edit' }).click();
    const form = memberPage.getByRole('form', { name: 'Edit ticket' });
    await form.getByLabel('Assigned to').selectOption({ label: SEED_USERS.owner.name });
    await form.getByRole('button', { name: 'Save changes' }).click();

    await expect(memberPage.getByText('Changes saved')).toBeVisible();
    await expect(assignedTo(memberPage)).toContainText(SEED_USERS.owner.name);

    await memberPage.getByRole('button', { name: 'Assign to me' }).click();

    await expect(memberPage.getByText('Assigned to you')).toBeVisible();
    await expect(assignedTo(memberPage)).toContainText(SEED_USERS.member.name);
    await expect(memberPage.getByRole('button', { name: 'Assign to me' })).toBeHidden();

    await memberPage.reload();

    await expect(assignedTo(memberPage)).toContainText(SEED_USERS.member.name);
    await expect(memberPage.getByRole('button', { name: 'Assign to me' })).toBeHidden();
    expect(consoleErrors).toEqual([]);
  });
});
