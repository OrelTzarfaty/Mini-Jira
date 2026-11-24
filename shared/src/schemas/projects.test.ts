import { describe, expect, it } from 'vitest';

import {
  createProjectSchema,
  PROJECT_DESCRIPTION_MAX_LENGTH,
  PROJECT_NAME_MAX_LENGTH,
  projectSchema,
} from './projects.js';

const validInput = { name: 'Website', key: 'WEB' };
const keyFormatMessage = 'Key must be 2–6 letters (A–Z)';

/** The messages zod reports for a field, so tests check the exact text the user sees. */
const messagesFor = (input: unknown, field: string): string[] => {
  const result = createProjectSchema.safeParse(input);
  if (result.success) return [];

  return result.error.issues
    .filter((issue) => issue.path[0] === field)
    .map((issue) => issue.message);
};

describe('createProjectSchema', () => {
  it('PRJ-1: accepts a name and key, and stores a missing description as null', () => {
    expect(createProjectSchema.parse(validInput)).toEqual({ ...validInput, description: null });
  });

  it('PRJ-1: trims the name, key, and description', () => {
    expect(
      createProjectSchema.parse({ name: '  Website  ', key: ' WEB ', description: '  Our site  ' }),
    ).toEqual({ name: 'Website', key: 'WEB', description: 'Our site' });
  });

  it('PRJ-1: accepts a lowercase key and uppercases it', () => {
    expect(createProjectSchema.parse({ ...validInput, key: 'web' }).key).toBe('WEB');
  });

  it('PRJ-1: accepts keys of 2 and 6 letters', () => {
    expect(createProjectSchema.parse({ ...validInput, key: 'AB' }).key).toBe('AB');
    expect(createProjectSchema.parse({ ...validInput, key: 'ABCDEF' }).key).toBe('ABCDEF');
  });

  it.each([
    ['one letter', 'A'],
    ['seven letters', 'ABCDEFG'],
    ['digits', 'WEB1'],
    ['an inner space', 'WE B'],
    ['an accented letter', 'CAFÉ'],
    ['a dash', 'WE-B'],
    // Uppercasing these gives A-Z ("SSSS", "II"), so the check must run before it.
    ['a German sharp s', 'ßß'],
    ['a Turkish dotless i', 'ıı'],
    ['only accented letters', 'ÉÉÉ'],
  ])('PRJ-1: rejects a key with %s', (_label, key) => {
    expect(messagesFor({ ...validInput, key }, 'key')).toEqual([keyFormatMessage]);
  });

  it('PRJ-1: says "Key is required" for a missing or blank key (and nothing else)', () => {
    expect(messagesFor({ name: 'Website' }, 'key')).toEqual(['Key is required']);
    expect(messagesFor({ ...validInput, key: '   ' }, 'key')).toEqual(['Key is required']);
  });

  it('PRJ-1: says "Name is required" for a missing or blank name', () => {
    expect(messagesFor({ key: 'WEB' }, 'name')).toEqual(['Name is required']);
    expect(messagesFor({ ...validInput, name: '   ' }, 'name')).toEqual(['Name is required']);
  });

  it('PRJ-1: limits the name length', () => {
    const atLimit = 'a'.repeat(PROJECT_NAME_MAX_LENGTH);
    expect(createProjectSchema.parse({ ...validInput, name: atLimit }).name).toBe(atLimit);
    expect(messagesFor({ ...validInput, name: `${atLimit}a` }, 'name')).toEqual([
      `Name must be at most ${PROJECT_NAME_MAX_LENGTH} characters`,
    ]);
  });

  it('PRJ-1: rejects control characters in the name, including tab and newline', () => {
    for (const name of ['Web\u0000site', 'Web\tsite', 'Web\nsite']) {
      expect(messagesFor({ ...validInput, name }, 'name')).toEqual([
        "Name contains characters that aren't allowed",
      ]);
    }
  });

  it('PRJ-1: stores a null or blank description as null', () => {
    expect(createProjectSchema.parse({ ...validInput, description: null }).description).toBeNull();
    expect(createProjectSchema.parse({ ...validInput, description: '' }).description).toBeNull();
    expect(
      createProjectSchema.parse({ ...validInput, description: '  \n ' }).description,
    ).toBeNull();
  });

  it('PRJ-1: keeps tab and line breaks inside the description', () => {
    const description = 'Line one\r\n\tLine two';
    expect(createProjectSchema.parse({ ...validInput, description }).description).toBe(description);
  });

  it('PRJ-1: rejects other control characters in the description', () => {
    for (const description of ['bad\u0000text', 'bad\u007ftext', 'bad\u0085text']) {
      expect(messagesFor({ ...validInput, description }, 'description')).toEqual([
        "Description contains characters that aren't allowed",
      ]);
    }
  });

  it('PRJ-1: limits the description length', () => {
    const atLimit = 'a'.repeat(PROJECT_DESCRIPTION_MAX_LENGTH);
    expect(createProjectSchema.parse({ ...validInput, description: atLimit }).description).toBe(
      atLimit,
    );
    expect(messagesFor({ ...validInput, description: `${atLimit}a` }, 'description')).toEqual([
      `Description must be at most ${PROJECT_DESCRIPTION_MAX_LENGTH} characters`,
    ]);
  });

  it('PRJ-1: rejects unknown fields (for example ticketCounter)', () => {
    expect(createProjectSchema.safeParse({ ...validInput, ticketCounter: 5 }).success).toBe(false);
  });
});

describe('projectSchema', () => {
  const project = {
    id: '0b6f1c2e-4a3d-4e5f-8a9b-1c2d3e4f5a6b',
    key: 'WEB',
    name: 'Website',
    description: null,
    role: 'OWNER',
    createdAt: '2026-11-24T10:00:00.000Z',
    updatedAt: '2026-11-24T10:00:00.000Z',
  };

  it('PRJ-1: parses a project response', () => {
    expect(projectSchema.parse(project)).toEqual(project);
  });

  it('PRJ-1: drops internal fields such as ticketCounter', () => {
    expect(projectSchema.parse({ ...project, ticketCounter: 3 })).not.toHaveProperty(
      'ticketCounter',
    );
  });

  it('PRJ-1: rejects an unknown role', () => {
    expect(projectSchema.safeParse({ ...project, role: 'ADMIN' }).success).toBe(false);
  });
});
