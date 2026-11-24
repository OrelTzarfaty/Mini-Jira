import { z } from 'zod';

export const PAGE_SIZE = 20;
export const MAX_PAGE = 100_000;

export const paginationQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).max(MAX_PAGE).default(1),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

type PageShape<Item extends z.ZodType> = z.ZodObject<{
  items: z.ZodArray<Item>;
  page: z.ZodNumber;
  pageSize: z.ZodNumber;
  total: z.ZodNumber;
  totalPages: z.ZodNumber;
}>;

/**
 * LST-4 (architecture §9): the response of every paginated list, `{ items, page, pageSize,
 * total, totalPages }` (the `Page<T>` type), as a schema for the item schema given. Used for the
 * OpenAPI docs and to check responses in tests.
 */
export function pageSchema<Item extends z.ZodType>(item: Item): PageShape<Item> {
  return z.object({
    items: z.array(item),
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1),
    total: z.number().int().min(0),
    totalPages: z.number().int().min(0),
  });
}
