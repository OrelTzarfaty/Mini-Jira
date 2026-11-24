import { registerThroughApi } from '../support/auth-api.js';
import { expect, test } from '../support/fixtures.js';
import { collectPageErrors } from '../support/page-errors.js';
import { addMemberThroughApi, createProjectThroughApi } from '../support/projects-api.js';

// PRJ-3: the project owner adds registered users by email on the settings page; members don't
// see the settings. Each test registers its own accounts: parallel logins of one shared account
// can hit the login rate limit (429).

const USER_NOT_FOUND_MESSAGE = 'No Mini-Jira user with this email. They need to register first.';
// registerThroughApi gives every new account this name.
const E2E_USER_NAME = 'Erin E2E';

test.describe('Add a member by email (PRJ-3)', () => {
  test('PRJ-3: the owner adds a registered user, who appears in the members list', async ({
    page,
    context,
  }) => {
    const owner = await registerThroughApi();
    const project = await createProjectThroughApi(owner.session);
    const newMember = await registerThroughApi();
    await context.addCookies(owner.session.cookies);
    const consoleErrors = collectPageErrors(page);

    await page.goto(`/projects/${project.key}/settings`);
    const members = page.getByRole('region', { name: 'Members (1)' });
    await expect(members).toBeVisible();

    await page.getByLabel('Add a member by email').fill(newMember.email);
    const addResponse = page.waitForResponse(`**/api/projects/${project.key}/members`);
    await page.getByRole('button', { name: 'Add' }).click();

    expect((await addResponse).status()).toBe(201);
    await expect(page.getByText(`${E2E_USER_NAME} added`)).toHaveAttribute('role', 'status');
    await expect(page.getByLabel('Add a member by email')).toHaveValue('');
    const list = page.getByRole('region', { name: 'Members (2)' }).getByRole('list', {
      name: 'Members',
    });
    await expect(list.getByRole('listitem')).toHaveCount(2);
    await expect(list.getByRole('listitem').nth(0)).toContainText('Owner');
    await expect(list.getByRole('listitem').nth(1)).toContainText(newMember.email);
    await expect(list.getByRole('listitem').nth(1)).toContainText('Member');
    expect(consoleErrors).toEqual([]);
  });

  test('PRJ-3: an email with no account shows the error under the field and keeps it', async ({
    page,
    context,
  }) => {
    const owner = await registerThroughApi();
    const project = await createProjectThroughApi(owner.session);
    await context.addCookies(owner.session.cookies);
    const unknownEmail = `nobody-${project.key.toLowerCase()}@minijira.test`;

    await page.goto(`/projects/${project.key}/settings`);
    const field = page.getByLabel('Add a member by email');
    await field.fill(unknownEmail);
    await page.getByRole('button', { name: 'Add' }).click();

    await expect(field).toHaveAccessibleDescription(USER_NOT_FOUND_MESSAGE);
    await expect(field).toHaveValue(unknownEmail);
    await expect(page.getByRole('region', { name: 'Members (1)' })).toBeVisible();
  });

  test('PRJ-3: a member has no Settings tab and sees the owner-only message on the settings URL', async ({
    page,
    context,
  }) => {
    const owner = await registerThroughApi();
    const project = await createProjectThroughApi(owner.session);
    const member = await registerThroughApi();
    await addMemberThroughApi(owner.session, project.key, member.email);
    await context.addCookies(member.session.cookies);
    const memberRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/members')) {
        memberRequests.push(request.url());
      }
    });

    await page.goto(`/projects/${project.key}/board`);
    const tabs = page.getByRole('navigation', { name: 'Project' });
    await expect(tabs.getByRole('link', { name: 'Board' })).toBeVisible();
    await expect(tabs.getByRole('link', { name: 'Settings' })).toHaveCount(0);

    await page.goto(`/projects/${project.key}/settings`);
    await expect(page.getByText('Only the project owner can open settings.')).toBeVisible();
    await expect(page.getByLabel('Add a member by email')).toHaveCount(0);
    expect(memberRequests).toEqual([]);

    await page.getByRole('link', { name: 'Back to the board' }).click();
    await expect(page).toHaveURL(`/projects/${project.key}/board`);
  });
});
