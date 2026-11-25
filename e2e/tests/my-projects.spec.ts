import { logInAsNewUser, registerThroughApi } from '../support/auth-api.js';
import { expect, test } from '../support/fixtures.js';
import { collectPageErrors } from '../support/page-errors.js';
import { createProjectThroughApi } from '../support/projects-api.js';

// PRJ-2: My Projects lists only the user's own projects, and the top bar's project dropdown
// switches between them. Each test registers its own accounts: parallel logins of one shared
// account can hit the login rate limit (429).
// Only the Owner role can be set up here: adding a member arrives with PRJ-3, so the Member label
// is covered by the component tests.

test.describe('My Projects (PRJ-2)', () => {
  test('PRJ-2: shows only my projects, with my role and "0 open"', async ({ page, context }) => {
    const someoneElse = await registerThroughApi();
    const otherProject = await createProjectThroughApi(someoneElse.session);
    const me = await registerThroughApi();
    const myFirst = await createProjectThroughApi(me.session);
    const mySecond = await createProjectThroughApi(me.session);
    await context.addCookies(me.session.cookies);
    const consoleErrors = collectPageErrors(page);

    await page.goto('/projects');

    const main = page.getByRole('main');
    await expect(main.getByRole('listitem')).toHaveCount(2);
    for (const project of [myFirst, mySecond]) {
      const card = main.getByRole('link', { name: new RegExp(project.name) });
      await expect(card).toContainText(project.key);
      await expect(card).toContainText('Owner');
      await expect(card).toContainText('0 open');
    }
    await expect(page.getByText(otherProject.name)).toHaveCount(0);

    await main.getByRole('link', { name: new RegExp(myFirst.name) }).click();
    await expect(page).toHaveURL(`/projects/${myFirst.key}/board`);
    expect(consoleErrors).toEqual([]);
  });

  test('PRJ-2: a new user sees the empty state with "Create project"', async ({
    page,
    context,
  }) => {
    await logInAsNewUser(context);

    await page.goto('/projects');

    await expect(page.getByRole('heading', { name: 'No projects yet' })).toBeVisible();
    await page.getByRole('main').getByRole('button', { name: 'Create project' }).click();
    await expect(page.getByRole('dialog', { name: 'Create project' })).toBeVisible();
  });
});

test.describe('Project dropdown (PRJ-2)', () => {
  test('PRJ-2: the search finds a project, and choosing it opens its board', async ({
    page,
    context,
  }) => {
    const me = await registerThroughApi();
    const current = await createProjectThroughApi(me.session);
    const target = await createProjectThroughApi(me.session);
    await context.addCookies(me.session.cookies);
    const consoleErrors = collectPageErrors(page);
    await page.goto(`/projects/${current.key}/board`);

    const navigation = page.getByRole('navigation', { name: 'Main' });
    await navigation
      .getByRole('button', { name: `Project ${current.key} ${current.name}` })
      .click();
    const panel = page.getByRole('dialog', { name: 'Switch project' });
    await expect(
      panel.getByRole('option', { name: new RegExp(`${current.key}.*\\(current project\\)`) }),
    ).toBeVisible();

    const search = panel.getByRole('combobox', { name: 'Search projects' });
    const searchResponse = page.waitForResponse(
      (response) =>
        response.url().includes(`q=${target.key}`) && response.request().method() === 'GET',
    );
    await search.fill(target.key);
    expect((await searchResponse).status()).toBe(200);
    await expect(
      panel.getByRole('group', { name: 'Your projects' }).getByRole('option'),
    ).toHaveCount(1);
    await panel.getByRole('option', { name: new RegExp(target.name) }).click();

    await expect(page).toHaveURL(`/projects/${target.key}/board`);
    await expect(
      navigation.getByRole('button', { name: `Project ${target.key} ${target.name}` }),
    ).toBeFocused();
    expect(consoleErrors).toEqual([]);
  });

  test('PRJ-2: keyboard: ↓ and Enter open a project on the same tab, Esc closes', async ({
    page,
    context,
  }) => {
    const me = await registerThroughApi();
    const current = await createProjectThroughApi(me.session);
    const other = await createProjectThroughApi(me.session);
    await context.addCookies(me.session.cookies);
    await page.goto(`/projects/${current.key}/list`);
    const trigger = page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('button', { name: `Project ${current.key} ${current.name}` });

    await trigger.focus();
    await page.keyboard.press('Enter');
    const panel = page.getByRole('dialog', { name: 'Switch project' });
    await expect(panel.getByRole('combobox', { name: 'Search projects' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(trigger).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(panel.getByRole('combobox', { name: 'Search projects' })).toBeFocused();
    // The current project is first, so ↓ highlights the other one.
    await page.keyboard.press('ArrowDown');
    await expect(panel.getByRole('option', { name: new RegExp(other.name) })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(`/projects/${other.key}/list`);
  });
});
