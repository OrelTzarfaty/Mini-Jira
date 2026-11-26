import { SEED_USERS } from '../support/auth-api.js';
import { expect, test } from '../support/fixtures.js';
import { collectPageErrors } from '../support/page-errors.js';
import { addMemberThroughApi, createProjectThroughApi } from '../support/projects-api.js';
import type { CreatedProject } from '../support/projects-api.js';
import { createTicketThroughApi } from '../support/tickets-api.js';

// TKT-2: every ticket has its own URL, /projects/KEY/tickets/KEY-N. The seed owner creates a
// fresh project (random key) with the seed member and one ticket, so every test has its own data.

test.describe('Ticket page (TKT-2)', () => {
  let project: CreatedProject;
  let ticketKey: string;

  test.beforeEach(async ({ seedSession }) => {
    const ownerSession = await seedSession('owner');
    project = await createProjectThroughApi(ownerSession);
    await addMemberThroughApi(ownerSession, project.key, SEED_USERS.member.email);
    ticketKey = await createTicketThroughApi(ownerSession, project.key, {
      title: 'Fix login redirect',
      description: 'Steps:\n1. Log in\n2. Wait 7 days',
      type: 'BUG',
      priority: 'HIGH',
      dueDate: '2099-12-01',
    });
  });

  test('TKT-2: a member opens a ticket by its URL, and it is still there after a reload', async ({
    memberPage,
  }) => {
    const consoleErrors = collectPageErrors(memberPage);
    const ticketPath = `/projects/${project.key}/tickets/${ticketKey}`;

    await memberPage.goto(ticketPath);
    await expectTicketShown();
    await memberPage.reload();
    await expectTicketShown();

    await expect(memberPage).toHaveURL(ticketPath);
    expect(consoleErrors).toEqual([]);

    async function expectTicketShown(): Promise<void> {
      await expect(
        memberPage.getByRole('heading', { level: 1, name: 'Fix login redirect' }),
      ).toBeVisible();
      await expect(memberPage).toHaveTitle(`${ticketKey} Fix login redirect · Mini-Jira`);
      const details = memberPage.getByRole('complementary', { name: 'Details' });
      // One label and its value: "Assigned to" → "Unassigned".
      const detail = (label: string) =>
        details.locator('div').filter({ has: memberPage.getByText(label, { exact: true }) });
      await expect(detail('Assigned to')).toContainText('Unassigned');
      await expect(detail('Created by')).toContainText(SEED_USERS.owner.name);
      await expect(detail('Priority')).toContainText('High');
      await expect(detail('Due date')).toContainText('Dec 1, 2099');
      await expect(memberPage.getByRole('region', { name: 'Description' })).toContainText(
        '1. Log in',
      );
    }
  });

  test('TKT-2: "Copy link" copies the ticket URL', async ({ memberPage, baseURL }) => {
    await memberPage.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    const ticketPath = `/projects/${project.key}/tickets/${ticketKey}`;
    await memberPage.goto(ticketPath);

    await memberPage.getByRole('button', { name: 'Copy link' }).click();

    await expect(memberPage.getByRole('status')).toHaveText('Link copied');
    // A string expression: the e2e workspace has no DOM types, and the page returns a string.
    const copied: unknown = await memberPage.evaluate('navigator.clipboard.readText()');
    expect(copied).toBe(new URL(ticketPath, baseURL).href);
  });

  test('TKT-2: a ticket key from another project under this project URL shows "Ticket not found"', async ({
    ownerPage,
    seedSession,
  }) => {
    const ownerSession = await seedSession('owner');
    const otherProject = await createProjectThroughApi(ownerSession);
    const otherTicketKey = await createTicketThroughApi(ownerSession, otherProject.key, {
      title: 'A ticket in another project',
    });

    await ownerPage.goto(`/projects/${project.key}/tickets/${otherTicketKey}`);

    await expect(
      ownerPage.getByRole('heading', { level: 1, name: 'Ticket not found' }),
    ).toBeVisible();
    await expect(ownerPage.getByText('A ticket in another project')).toHaveCount(0);
    await ownerPage.getByRole('link', { name: 'Back to board' }).click();
    await expect(ownerPage).toHaveURL(`/projects/${project.key}/board`);
  });
});
