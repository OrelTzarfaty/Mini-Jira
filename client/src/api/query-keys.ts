/**
 * Query keys that more than one module uses, so they can't drift apart (architecture §5.1).
 * The current user (AUTH-4): read by useMe, written by login, register, and the API's 401 handling.
 */
export const ME_QUERY_KEY = ['auth', 'me'] as const;

/** The current user's projects (PRJ-2 lists them); creating a project (PRJ-1) marks them stale. */
export const PROJECTS_QUERY_KEY = ['projects'] as const;

/** One project by its key (PRJ-6). Under PROJECTS_QUERY_KEY, so marking the projects stale refreshes it too. */
export function projectQueryKey(
  projectKey: string,
): readonly [...typeof PROJECTS_QUERY_KEY, string] {
  return [...PROJECTS_QUERY_KEY, projectKey];
}

/** A project's members (PRJ-3). Under the project's key, so refreshing the project refreshes them too. */
export function projectMembersQueryKey(
  projectKey: string,
): readonly [...ReturnType<typeof projectQueryKey>, 'members'] {
  return [...projectQueryKey(projectKey), 'members'];
}

/**
 * One ticket by its key (TKT-2). Under the project's key, so creating a ticket (which marks every
 * project query stale) and deleting the project refresh or drop it too.
 */
export function ticketQueryKey(
  projectKey: string,
  ticketKey: string,
): readonly [...ReturnType<typeof projectQueryKey>, 'tickets', string] {
  return [...projectQueryKey(projectKey), 'tickets', ticketKey];
}
