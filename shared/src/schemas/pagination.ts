import { z } from 'zod';

export const PAGE_SIZE = 20;
export const MAX_PAGE = 100_000;

export const paginationQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).max(MAX_PAGE).default(1),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

// LST-4: the zod shape of Page<T> (api-types.ts) for a list of `item`, used to check and
// document every paginated response (architecture §9: `{ items, page, pageSize, total, totalPages }`).
export function pageSchema<T extends z.ZodType>(
  item: T,
): z.ZodObject<{
  items: z.ZodArray<T>;
  page: z.ZodNumber;
  pageSize: z.ZodNumber;
  total: z.ZodNumber;
  totalPages: z.ZodNumber;
}> {
  return z.object({
    items: z.array(item),
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1),
    total: z.number().int().min(0),
    totalPages: z.number().int().min(0),
  });
}
