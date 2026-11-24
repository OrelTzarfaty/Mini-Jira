/**
 * Query keys that more than one module uses, so they can't drift apart (architecture §5.1).
 * The current user (AUTH-4): read by useMe, written by login, register, and the API's 401 handling.
 */
export const ME_QUERY_KEY = ['auth', 'me'] as const;

/** The current user's projects (PRJ-2 lists them); creating a project (PRJ-1) marks them stale. */
export const PROJECTS_QUERY_KEY = ['projects'] as const;
