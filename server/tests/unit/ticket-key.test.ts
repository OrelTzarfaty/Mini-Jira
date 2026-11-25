import { describe, expect, it } from 'vitest';

import { formatTicketKey, parseTicketKey } from '../../src/lib/ticket-key.js';

describe('formatTicketKey', () => {
  it.each([
    ['WEB', 1, 'WEB-1'],
    ['WEB', 12, 'WEB-12'],
    ['AB', 2_147_483_647, 'AB-2147483647'],
  ])('TKT-1: %s + %i is %s', (projectKey, number, expected) => {
    expect(formatTicketKey(projectKey, number)).toBe(expected);
  });
});

describe('parseTicketKey', () => {
  it.each([
    ['WEB-1', 'WEB', 1],
    ['WEB-12', 'WEB', 12],
    ['AB-7', 'AB', 7],
    ['ABCDEF-100', 'ABCDEF', 100],
    ['WEB-2147483647', 'WEB', 2_147_483_647],
  ])('TKT-1: %s is project %s, number %i', (ticketKey, projectKey, number) => {
    expect(parseTicketKey(ticketKey)).toEqual({ projectKey, number });
  });

  it.each([
    ['empty', ''],
    ['no number', 'WEB'],
    ['no dash', 'WEB12'],
    ['empty number', 'WEB-'],
    ['number 0', 'WEB-0'],
    ['leading zero', 'WEB-012'],
    ['negative number', 'WEB--1'],
    ['decimal number', 'WEB-1.5'],
    ['lowercase project key', 'web-12'],
    ['project key too short', 'W-12'],
    ['project key too long', 'ABCDEFG-12'],
    ['digit in project key', 'WE1-12'],
    ['spaces around', ' WEB-12 '],
    ['extra part', 'WEB-12-3'],
    ['over the INTEGER maximum', 'WEB-2147483648'],
    ['non-ASCII digits', 'WEB-١٢'],
  ])('TKT-1: rejects %s (%j)', (_case, ticketKey) => {
    expect(parseTicketKey(ticketKey)).toBeNull();
  });

  it('TKT-1: parsing a formatted key gives back its parts', () => {
    expect(parseTicketKey(formatTicketKey('WEB', 42))).toEqual({ projectKey: 'WEB', number: 42 });
  });
});
