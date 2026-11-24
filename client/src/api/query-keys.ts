/**
 * Query keys that more than one module uses, so they can't drift apart (architecture §5.1).
 * The current user (AUTH-4): read by useMe, written by login, register, and the API's 401 handling.
 */
export const ME_QUERY_KEY = ['auth', 'me'] as const;
