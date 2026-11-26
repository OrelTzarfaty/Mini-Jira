import { registerThroughApi } from '../support/auth-api.js';
import type { StorageState } from '../support/auth-api.js';
import { expect, test } from '../support/fixtures.js';
import { collectPageErrors } from '../support/page-errors.js';
import { createProjectThroughApi } from '../support/projects-api.js';
import type { CreatedProject } from '../support/projects-api.js';
import { createTicketsThroughApi } from '../support/tickets-api.js';

// BRD-1: the board has one column per status, each headed by its total, with the cards in rank
// order. Each test registers its own owner and project (parallel logins of one seed account can
// hit the login rate limit) and creates the tickets through the API. Only To Do can hold tickets
// until moves arrive (BRD-2), and a new ticket goes to its bottom, so rank order is creation order.

/** "Card 01", "Card 02", ...: two digits, so no title is part of another one ("Card 1" / "Card 10"). */
function cardTitles(count: number): string[] {
  return Array.from({ length: count }, (_, index) => `Card ${String(index + 1).padStart(2, '0')}`);
}

test.describe('Board (BRD-1)', () => {
  let ownerSession: StorageState;
  let project: CreatedProject;

  test.beforeEach(async ({ context }) => {
    ({ session: ownerSession } = await registerThroughApi());
    project = await createProjectThroughApi(ownerSession);
    await context.addCookies(ownerSession.cookies);
  });

  test('BRD-1: each column header shows its total, and To Do lists its cards in rank order', async ({
    page,
  }) => {
    const titles = cardTitles(3);
    await createTicketsThroughApi(ownerSession, project.key, titles);
    const consoleErrors = collectPageErrors(page);

    await page.goto(`/projects/${project.key}/board`);

    // The four columns, left to right in workflow order, each with its total.
    await expect(page.getByRole('main').getByRole('heading', { level: 2 })).toHaveText([
      'To Do 3 tickets',
      'In Progress 0 tickets',
      'In Review 0 tickets',
      'Done 0 tickets',
    ]);
    const todo = page.getByRole('region', { name: 'To Do 3 tickets' });
    const cards = todo.getByRole('listitem');
    await expect(cards).toHaveCount(titles.length);
    await expect(cards).toContainText(
      titles.map((title, index) => `${project.key}-${String(index + 1)} ${title}`),
    );
    for (const status of ['In Progress', 'In Review', 'Done']) {
      await expect(
        page.getByRole('region', { name: `${status} 0 tickets` }).getByRole('listitem'),
      ).toHaveCount(0);
    }
    // Every card fits in the first 50, so no column offers more.
    await expect(page.getByRole('button', { name: /^Load more/ })).toHaveCount(0);
    expect(consoleErrors).toEqual([]);
  });
});
