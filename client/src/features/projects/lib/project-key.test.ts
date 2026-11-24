import { describe, expect, it } from 'vitest';

import { suggestProjectKey, toProjectKeyCharacters } from './project-key';

describe('suggestProjectKey', () => {
  it.each([
    ['Website Redesign', 'WR'],
    ['Mobile App Backend', 'MAB'],
    ['Documentation', 'DOC'],
    ['web', 'WEB'],
    ['  Operations   Team  ', 'OT'],
    ['One Two Three Four Five Six Seven', 'OTTFFS'],
    ['Mobile App 2.0', 'MA'],
    ['Café Ops', 'CO'],
    ['R&D', 'RD'],
    ['Q4', 'Q'],
    ['2026 Roadmap', 'ROA'],
    ['', ''],
    ['  ', ''],
    ['123 !?', ''],
  ])('PRJ-1: %j suggests %j', (name, key) => {
    expect(suggestProjectKey(name)).toBe(key);
  });
});

describe('toProjectKeyCharacters', () => {
  it.each([
    ['web', 'WEB'],
    ['we-b 2', 'WEB'],
    ['abcdefgh', 'ABCDEF'],
    ['é1 ', ''],
  ])('PRJ-1: %j becomes %j', (typed, key) => {
    expect(toProjectKeyCharacters(typed)).toBe(key);
  });
});
