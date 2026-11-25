import { registerThroughApi } from '../support/auth-api.js';
import { expect, test } from '../support/fixtures.js';
import { collectPageErrors } from '../support/page-errors.js';
import { addMemberThroughApi, createProjectThroughApi } from '../support/projects-api.js';

// PRJ-5: the project owner edits the project's name and description and deletes the project on
// the settings page; a member gets neither. Each test registers its own accounts: parallel
// logins of one shared account can hit the login rate limit (429).

test.describe('Edit or delete a project (PRJ-5)', () => {
  test('PRJ-5: the owner edits the name and description and sees them everywhere', async ({
    page,
    context,
  }) => {
    const owner = await registerThroughApi();
    const project = await createProjectThroughApi(owner.session);
    await context.addCookies(owner.session.cookies);
    const consoleErrors = collectPageErrors(page);
    const newName = `Renamed ${project.key}`;

    await page.goto(`/projects/${project.key}/settings`);
    const details = page.getByRole('region', { name: 'Project details' });
    const save = details.getByRole('button', { name: 'Save changes' });
    await expect(details.getByRole('group', { name: 'Key' })).toContainText(
      `${project.key} Can't be changed — it's part of every ticket key (${project.key}-12)`,
    );
    await expect(save).toBeDisabled();

    await details.getByLabel('Name').fill(newName);
    await details.getByLabel('Description').fill('Launch in Q1');
    const saveResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'PATCH' &&
        response.url().endsWith(`/api/projects/${project.key}`),
    );
    await save.click();

    expect((await saveResponse).status()).toBe(200);
    await expect(details.getByText('Project updated')).toHaveAttribute('role', 'status');
    await expect(save).toBeDisabled();
    await expect(
      page.getByRole('heading', { level: 1, name: `${project.key} ${newName}` }),
    ).toBeVisible();

    await page.reload();
    await expect(details.getByLabel('Name')).toHaveValue(newName);
    await expect(details.getByLabel('Description')).toHaveValue('Launch in Q1');

    await page.goto('/projects');
    await expect(
      page.getByRole('main').getByRole('link', { name: new RegExp(newName) }),
    ).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });

  test('PRJ-5: the owner deletes the project after typing its key and lands on My Projects', async ({
    page,
    context,
  }) => {
    const owner = await registerThroughApi();
    const project = await createProjectThroughApi(owner.session);
    const kept = await createProjectThroughApi(owner.session);
    await context.addCookies(owner.session.cookies);
    const consoleErrors = collectPageErrors(page);

    await page.goto(`/projects/${project.key}/settings`);
    await page
      .getByRole('region', { name: 'Danger zone' })
      .getByRole('button', { name: 'Delete project' })
      .click();
    const dialog = page.getByRole('alertdialog', { name: `Delete project ${project.key}?` });
    await expect(dialog).toHaveAccessibleDescription(
      "This permanently deletes the project, its 0 tickets, and all comments and history. This can't be undone.",
    );
    const confirm = dialog.getByRole('button', { name: 'Delete project' });
    await expect(confirm).toBeDisabled();

    await dialog.getByLabel(`Type ${project.key} to confirm`).fill(project.key.toLowerCase());
    await expect(confirm).toBeDisabled();
    await dialog.getByLabel(`Type ${project.key} to confirm`).fill(project.key);
    const deleteResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'DELETE' &&
        response.url().endsWith(`/api/projects/${project.key}`),
    );
    await confirm.click();

    expect((await deleteResponse).status()).toBe(204);
    await expect(page).toHaveURL('/projects');
    await expect(page.getByText(`Project ${project.key} deleted`)).toBeFocused();
    const main = page.getByRole('main');
    await expect(main.getByRole('link', { name: new RegExp(kept.name) })).toBeVisible();
    await expect(main.getByRole('link', { name: new RegExp(project.name) })).toHaveCount(0);
    expect(consoleErrors).toEqual([]);

    // Gone for good: its old URL is the "Project not found" page.
    await page.goto(`/projects/${project.key}/board`);
    await expect(page.getByRole('heading', { level: 1, name: 'Project not found' })).toBeVisible();
  });

  test('PRJ-5: a member has no Settings tab and no edit or delete controls', async ({
    page,
    context,
  }) => {
    const owner = await registerThroughApi();
    const project = await createProjectThroughApi(owner.session);
    const member = await registerThroughApi();
    await addMemberThroughApi(owner.session, project.key, member.email);
    await context.addCookies(member.session.cookies);

    await page.goto(`/projects/${project.key}/board`);
    const tabs = page.getByRole('navigation', { name: 'Project' });
    await expect(tabs.getByRole('link', { name: 'Board' })).toBeVisible();
    await expect(tabs.getByRole('link', { name: 'Settings' })).toHaveCount(0);

    await page.goto(`/projects/${project.key}/settings`);
    await expect(page.getByText('Only the project owner can open settings.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save changes' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Delete project' })).toHaveCount(0);
  });
});
