import { PAGE_SIZE } from '@mini-jira/shared';
import type { Page } from '@mini-jira/shared';

/** LST-4: the Prisma `skip`/`take` for a 1-based page of PAGE_SIZE (20) rows. */
export function pageWindow(page: number): { skip: number; take: number } {
  return { skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE };
}

/**
 * LST-4 (architecture §9): wraps one page of rows in the list response shape. A page after the
 * last one is not an error: it has no items, and `totalPages` tells the client where the list ends.
 */
export function toPage<Item>(items: Item[], total: number, page: number): Page<Item> {
  return { items, page, pageSize: PAGE_SIZE, total, totalPages: Math.ceil(total / PAGE_SIZE) };
}
