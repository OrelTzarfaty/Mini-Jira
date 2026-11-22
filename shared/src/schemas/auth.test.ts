import { describe, expect, it } from 'vitest';

import {
  EMAIL_MAX_LENGTH,
  NAME_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  publicUserSchema,
  registerSchema,
} from './auth.js';

const validInput = { name: 'Ana Levi', email: 'ana@example.com', password: 'correct-horse' };

/** The messages zod reports for a field, so tests check the exact text the user sees. */
const messagesFor = (input: unknown, field: string): string[] => {
  const result = registerSchema.safeParse(input);
  if (result.success) return [];

  return result.error.issues
    .filter((issue) => issue.path[0] === field)
    .map((issue) => issue.message);
};

describe('registerSchema', () => {
  it('AUTH-1: accepts a valid name, email, and password', () => {
    expect(registerSchema.parse(validInput)).toEqual(validInput);
  });

  it('AUTH-1: trims the name', () => {
    expect(registerSchema.parse({ ...validInput, name: '  Ana Levi  ' }).name).toBe('Ana Levi');
  });

  it('AUTH-1: trims and lowercases the email before checking its format', () => {
    expect(registerSchema.parse({ ...validInput, email: ' Ana@Example.COM ' }).email).toBe(
      'ana@example.com',
    );
  });

  it.each([
    ['without an @', 'ana.example.com'],
    ['without a domain', 'ana@'],
    ['empty', ''],
    ['only spaces', '   '],
  ])('AUTH-1: rejects an email %s', (_description, email) => {
    expect(messagesFor({ ...validInput, email }, 'email')).toEqual(['Enter a valid email address']);
  });

  it('AUTH-1: rejects an email longer than the limit', () => {
    const email = `${'a'.repeat(EMAIL_MAX_LENGTH - '@example.com'.length + 1)}@example.com`;
    expect(messagesFor({ ...validInput, email }, 'email')).toEqual([
      `Email must be at most ${EMAIL_MAX_LENGTH} characters`,
    ]);
  });

  it.each([
    ['empty', ''],
    ['only spaces', '   '],
  ])('AUTH-1: rejects a name that is %s', (_description, name) => {
    expect(messagesFor({ ...validInput, name }, 'name')).toEqual(['Name is required']);
  });

  it('AUTH-1: rejects a name longer than the limit', () => {
    expect(messagesFor({ ...validInput, name: 'a'.repeat(NAME_MAX_LENGTH + 1) }, 'name')).toEqual([
      `Name must be at most ${NAME_MAX_LENGTH} characters`,
    ]);
  });

  it('AUTH-1: says which fields are missing', () => {
    const input = {};
    expect(messagesFor(input, 'name')).toEqual(['Name is required']);
    expect(messagesFor(input, 'email')).toEqual(['Email is required']);
    expect(messagesFor(input, 'password')).toEqual(['Password is required']);
  });

  it('AUTH-1: password limits are 8 and 128 characters', () => {
    expect(PASSWORD_MIN_LENGTH).toBe(8);
    expect(PASSWORD_MAX_LENGTH).toBe(128);
  });

  it('AUTH-1: rejects a 7-character password', () => {
    expect(messagesFor({ ...validInput, password: 'a'.repeat(7) }, 'password')).toEqual([
      'Password must be at least 8 characters',
    ]);
  });

  it.each([8, 128])('AUTH-1: accepts a %i-character password', (length) => {
    const password = 'a'.repeat(length);
    expect(registerSchema.parse({ ...validInput, password }).password).toBe(password);
  });

  it('AUTH-1: rejects a 129-character password', () => {
    expect(messagesFor({ ...validInput, password: 'a'.repeat(129) }, 'password')).toEqual([
      'Password must be at most 128 characters',
    ]);
  });

  it('AUTH-1: keeps spaces in the password', () => {
    const password = '  spaced password  ';
    expect(registerSchema.parse({ ...validInput, password }).password).toBe(password);
  });

  it('AUTH-1: rejects unknown fields', () => {
    expect(registerSchema.safeParse({ ...validInput, role: 'admin' }).success).toBe(false);
  });
});

describe('publicUserSchema', () => {
  const user = {
    id: '0b8f7c2e-4d1a-4c3b-9e5f-6a7b8c9d0e1f',
    name: 'Ana Levi',
    email: 'ana@example.com',
  };

  it('AUTH-1: drops the password hash and other private fields', () => {
    const row = {
      ...user,
      passwordHash: '$argon2id$v=19$m=19456,t=2,p=1$abc$def',
      createdAt: new Date(),
    };
    const parsed = publicUserSchema.parse(row);
    expect(parsed).toEqual(user);
    expect(parsed).not.toHaveProperty('passwordHash');
  });

  it('AUTH-1: rejects an id that is not a UUID', () => {
    expect(publicUserSchema.safeParse({ ...user, id: '42' }).success).toBe(false);
  });
});
