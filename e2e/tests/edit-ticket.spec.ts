import { SEED_USERS } from '../support/auth-api.js';
import { expect, test } from '../support/fixtures.js';
import { collectPageErrors } from '../support/page-errors.js';
import { addMemberThroughApi, createProjectThroughApi } from '../support/projects-api.js';
import { createTicketThroughApi } from '../support/tickets-api.js';

// TKT-3: any member edits a ticket on its page. The seed owner creates a fresh project (random
// key) with the seed member and one ticket, so the test has its own data.

test.describe('Edit a ticket (TKT-3)', () => {
  test('TKT-3: a member edits the title and priority, and the change is still there after a reload', async ({
    seedSession,
    memberPage,
  }) => {
    const ownerSession = await seedSession('owner');
    const project = await createProjectThroughApi(ownerSession);
    await addMemberThroughApi(ownerSession, project.key, SEED_USERS.member.email);
    const ticketKey = await createTicketThroughApi(ownerSession, project.key, {
      title: 'Fix login redirect',
      priority: 'MEDIUM',
    });
    const consoleErrors = collectPageErrors(memberPage);

    await memberPage.goto(`/projects/${project.key}/tickets/${ticketKey}`);
    await memberPage.getByRole('button', { name: 'Edit' }).click();
    const form = memberPage.getByRole('form', { name: 'Edit ticket' });
    await form.getByLabel('Title').fill('Fix login redirect after the session expires');
    await form.getByLabel('Priority').selectOption({ label: 'Critical' });
    await form.getByRole('button', { name: 'Save changes' }).click();

    await expect(memberPage.getByText('Changes saved')).toBeVisible();
    await expectSaved();
    await memberPage.reload();
    await expectSaved();
    expect(consoleErrors).toEqual([]);

    async function expectSaved(): Promise<void> {
      await expect(
        memberPage.getByRole('heading', {
          level: 1,
          name: 'Fix login redirect after the session expires',
        }),
      ).toBeVisible();
      const priority = memberPage
        .getByRole('complementary', { name: 'Details' })
        .locator('div')
        .filter({ has: memberPage.getByText('Priority', { exact: true }) });
      await expect(priority).toContainText('Critical');
    }
  });
});
