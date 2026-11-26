import { SEED_USERS } from '../support/auth-api.js';
import { expect, test } from '../support/fixtures.js';
import { collectPageErrors } from '../support/page-errors.js';
import { addMemberThroughApi, createProjectThroughApi } from '../support/projects-api.js';
import type { CreatedProject } from '../support/projects-api.js';

// TKT-1: any project member creates a ticket from "+ Create ticket" in the project header. The
// seed owner creates a fresh project (random key) and adds the seed member, so every test has
// its own project and the first ticket is always KEY-1.

test.describe('Create a ticket (TKT-1)', () => {
  let project: CreatedProject;

  test.beforeEach(async ({ seedSession }) => {
    const ownerSession = await seedSession('owner');
    project = await createProjectThroughApi(ownerSession);
    await addMemberThroughApi(ownerSession, project.key, SEED_USERS.member.email);
  });

  test('TKT-1: a member creates a ticket and sees "KEY-1 created"', async ({ memberPage }) => {
    const consoleErrors = collectPageErrors(memberPage);
    await memberPage.goto(`/projects/${project.key}/board`);

    await memberPage.getByRole('button', { name: 'Create ticket' }).click();
    const popup = memberPage.getByRole('dialog', { name: `Create ticket in ${project.key}` });
    await expect(popup.getByLabel('Type')).toHaveValue('TASK');
    await expect(popup.getByLabel('Priority')).toHaveValue('MEDIUM');
    await popup.getByLabel('Title').fill('Fix login redirect');
    await popup.getByLabel('Description (optional)').fill('After the session expires');
    await popup.getByLabel('Type').selectOption({ label: 'Bug' });
    await popup.getByLabel('Priority').selectOption({ label: 'High' });
    await popup.getByLabel('Due date (optional)').fill('2026-12-01');
    const createResponse = memberPage.waitForResponse(`**/api/projects/${project.key}/tickets`);
    await popup.getByRole('button', { name: 'Create', exact: true }).click();

    const response = await createResponse;
    expect(response.status()).toBe(201);
    expect(await response.json()).toMatchObject({
      key: `${project.key}-1`,
      title: 'Fix login redirect',
      description: 'After the session expires',
      type: 'BUG',
      priority: 'HIGH',
      status: 'TODO',
      dueDate: '2026-12-01',
      reporter: { name: SEED_USERS.member.name },
    });
    await expect(popup).toBeHidden();
    await expect(memberPage.getByRole('status')).toHaveText(`${project.key}-1 created`);
    await expect(memberPage.getByRole('button', { name: 'Create ticket' })).toBeFocused();
    expect(consoleErrors).toEqual([]);
  });

  test('TKT-1: an empty title shows "Title is required" and sends nothing', async ({
    memberPage,
  }) => {
    let ticketRequests = 0;
    memberPage.on('request', (request) => {
      if (request.url().endsWith(`/api/projects/${project.key}/tickets`)) {
        ticketRequests += 1;
      }
    });
    await memberPage.goto(`/projects/${project.key}/board`);

    await memberPage.getByRole('button', { name: 'Create ticket' }).click();
    const popup = memberPage.getByRole('dialog', { name: `Create ticket in ${project.key}` });
    await popup.getByLabel('Description (optional)').fill('Kept after the error');
    await popup.getByRole('button', { name: 'Create', exact: true }).click();

    const title = popup.getByLabel('Title');
    await expect(title).toHaveAccessibleDescription('0 / 120 Title is required');
    await expect(title).toBeFocused();
    await expect(popup.getByLabel('Description (optional)')).toHaveValue('Kept after the error');
    expect(ticketRequests).toBe(0);
  });
});
