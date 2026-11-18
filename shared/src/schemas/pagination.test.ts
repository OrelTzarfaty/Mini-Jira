import { describe, expect, it } from 'vitest';

import { MAX_PAGE, PAGE_SIZE, paginationQuerySchema } from './pagination.js';

describe('paginationQuerySchema', () => {
  it('LST-4: page size is 20', () => {
    expect(PAGE_SIZE).toBe(20);
  });

  it('LST-4: uses page 1 when no page is sent', () => {
    expect(paginationQuerySchema.parse({})).toEqual({ page: 1 });
  });

  it('LST-4: converts a page from the URL into a number', () => {
    expect(paginationQuerySchema.parse({ page: '3' })).toEqual({ page: 3 });
  });

  it('LST-4: accepts the last allowed page', () => {
    expect(paginationQuerySchema.parse({ page: String(MAX_PAGE) })).toEqual({ page: MAX_PAGE });
  });

  it.each([
    ['zero', '0'],
    ['a negative number', '-1'],
    ['a decimal', '1.5'],
    ['text', 'abc'],
    ['an empty value', ''],
    ['more than the last allowed page', String(MAX_PAGE + 1)],
    ['a repeated parameter', ['1', '2']],
  ])('LST-4: rejects %s', (_description, page) => {
    expect(paginationQuerySchema.safeParse({ page }).success).toBe(false);
  });

  it('LST-4: rejects unknown query parameters', () => {
    expect(paginationQuerySchema.safeParse({ page: '1', pageSize: '1000' }).success).toBe(false);
  });
});
