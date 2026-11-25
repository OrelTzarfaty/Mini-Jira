import { logInAsNewUser, newApiContext, registerThroughApi } from '../support/auth-api.js';
import { expect, test } from '../support/fixtures.js';
import { collectPageErrors } from '../support/page-errors.js';
import { createProjectThroughApi } from '../support/projects-api.js';
import type { CreatedProject } from '../support/projects-api.js';

// PRJ-6: a project is visible only to its members. A user who isn't a member gets the same
// 404 as for a project that doesn't exist, so the answer never reveals that it exists.
// Each test registers its own accounts: parallel logins of one shared account can hit the
// login rate limit (429).

const NOT_FOUND_BODY = { error: { code: 'NOT_FOUND', message: 'Project not found' } };

/** A new user's project, created through the API. */
async function newOwnedProject(): Promise<CreatedProject> {
  const owner = await registerThroughApi();

  return createProjectThroughApi(owner.session);
}

test.describe("Non-members can't access a project (PRJ-6)", () => {
  test('PRJ-6: an outsider who opens the board URL sees "Project not found" and no project data', async ({
    page,
    context,
  }) => {
    const project = await newOwnedProject();
    await logInAsNewUser(context);
    const consoleErrors = collectPageErrors(page);

    const projectResponse = page.waitForResponse(`**/api/projects/${project.key}`);
    await page.goto(`/projects/${project.key}/board`);

    expect((await projectResponse).status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1, name: 'Project not found' })).toBeVisible();
    await expect(
      page.getByText("It may have been deleted, or you don't have access to it."),
    ).toBeVisible();
    await expect(page).toHaveTitle('Project not found · Mini-Jira');
    await expect(page.getByText(project.name)).toHaveCount(0);
    await expect(page.getByRole('heading', { name: `${project.key} board` })).toHaveCount(0);

    await page.getByRole('link', { name: 'Back to My Projects' }).click();
    await expect(page).toHaveURL('/projects');
    // Chromium logs the expected 404 as a console error; nothing else may fail.
    expect(consoleErrors.filter((error) => !error.includes('status of 404'))).toEqual([]);
  });

  test('PRJ-6: the API answers an outsider with the same 404 as for a missing project', async () => {
    const project = await newOwnedProject();
    const outsider = await registerThroughApi();
    const api = await newApiContext(outsider.session);
    try {
      const response = await api.get(`/api/projects/${project.key}`);
      const missing = await api.get('/api/projects/ZZZZZZ');

      expect(response.status()).toBe(404);
      const body = await response.text();
      expect(JSON.parse(body)).toEqual(NOT_FOUND_BODY);
      expect(body).not.toContain(project.name);
      expect(missing.status()).toBe(404);
      expect(await missing.json()).toEqual(NOT_FOUND_BODY);
    } finally {
      await api.dispose();
    }
  });

  test('PRJ-6: the owner opens the same board URL and sees the board', async ({
    page,
    context,
  }) => {
    const owner = await registerThroughApi();
    const project = await createProjectThroughApi(owner.session);
    await context.addCookies(owner.session.cookies);
    const consoleErrors = collectPageErrors(page);

    const projectResponse = page.waitForResponse(`**/api/projects/${project.key}`);
    await page.goto(`/projects/${project.key}/board`);

    expect((await projectResponse).status()).toBe(200);
    await expect(
      page.getByRole('heading', { level: 1, name: `${project.key} board` }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Project not found' })).toHaveCount(0);
    expect(consoleErrors).toEqual([]);
  });
});
