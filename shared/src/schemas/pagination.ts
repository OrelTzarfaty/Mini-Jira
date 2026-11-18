import { z } from 'zod';

export const PAGE_SIZE = 20;
export const MAX_PAGE = 100_000;

export const paginationQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).max(MAX_PAGE).default(1),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
