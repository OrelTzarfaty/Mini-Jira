import { describe, expect, it } from 'vitest';

import { loadEnv } from '../../src/config/env.js';

const CLIENT_ORIGIN = 'http://localhost:5173';
const DATABASE_URL = 'postgresql://user:secret-password@localhost:5432/minijira';
const JWT_SECRET = 'env-test-secret-that-is-at-least-32-chars';
const REQUIRED_ENV = { CLIENT_ORIGIN, DATABASE_URL, JWT_SECRET };
const SEVEN_DAYS_IN_SECONDS = 7 * 24 * 60 * 60;

describe('loadEnv', () => {
  it('SETUP-3: uses safe defaults for optional variables', () => {
    expect(loadEnv(REQUIRED_ENV)).toEqual({
      NODE_ENV: 'development',
      PORT: 3000,
      LOG_LEVEL: 'info',
      CLIENT_ORIGIN,
      DATABASE_URL,
      JWT_SECRET,
      JWT_EXPIRES_IN: SEVEN_DAYS_IN_SECONDS,
    });
  });

  it('SETUP-3: converts PORT into a number', () => {
    expect(loadEnv({ ...REQUIRED_ENV, PORT: '8080' }).PORT).toBe(8080);
  });

  it('SETUP-3: fails fast when CLIENT_ORIGIN is missing', () => {
    expect(() => loadEnv({ DATABASE_URL, JWT_SECRET })).toThrow(/CLIENT_ORIGIN/);
  });

  it.each(['http://localhost:5173/', 'http://localhost:5173/app', 'not-a-url'])(
    'SETUP-3: rejects %s as CLIENT_ORIGIN',
    (value) => {
      expect(() => loadEnv({ ...REQUIRED_ENV, CLIENT_ORIGIN: value })).toThrow(/CLIENT_ORIGIN/);
    },
  );

  it.each(['0', '65536', 'abc'])('SETUP-3: rejects PORT %s', (PORT) => {
    expect(() => loadEnv({ ...REQUIRED_ENV, PORT })).toThrow(/PORT/);
  });

  it('SETUP-3: does not repeat invalid values in the error message', () => {
    expect(() => loadEnv({ ...REQUIRED_ENV, CLIENT_ORIGIN: 'private-value' })).not.toThrow(
      /private-value/,
    );
  });

  it('SETUP-4: fails fast when DATABASE_URL is missing', () => {
    expect(() => loadEnv({ CLIENT_ORIGIN, JWT_SECRET })).toThrow(/DATABASE_URL/);
  });

  it.each(['mysql://user:pass@localhost/db', 'not-a-url'])(
    'SETUP-4: rejects %s as DATABASE_URL',
    (value) => {
      expect(() => loadEnv({ ...REQUIRED_ENV, DATABASE_URL: value })).toThrow(/DATABASE_URL/);
    },
  );

  it('SETUP-4: never shows the database password in the error message', () => {
    const url = 'mysql://user:secret-password@localhost/db';

    expect(() => loadEnv({ ...REQUIRED_ENV, DATABASE_URL: url })).not.toThrow(/secret-password/);
  });

  it('AUTH-1: fails fast when JWT_SECRET is missing', () => {
    expect(() => loadEnv({ CLIENT_ORIGIN, DATABASE_URL })).toThrow(/JWT_SECRET/);
  });

  it('AUTH-1: rejects a JWT_SECRET shorter than 32 characters without showing it', () => {
    const shortSecret = 'x'.repeat(31);

    expect(() => loadEnv({ ...REQUIRED_ENV, JWT_SECRET: shortSecret })).toThrow(/JWT_SECRET/);
    expect(() => loadEnv({ ...REQUIRED_ENV, JWT_SECRET: shortSecret })).not.toThrow(shortSecret);
  });

  it.each([
    ['45s', 45],
    ['30m', 30 * 60],
    ['12h', 12 * 60 * 60],
    ['7d', SEVEN_DAYS_IN_SECONDS],
  ])('AUTH-1: reads JWT_EXPIRES_IN %s as %i seconds', (value, seconds) => {
    expect(loadEnv({ ...REQUIRED_ENV, JWT_EXPIRES_IN: value }).JWT_EXPIRES_IN).toBe(seconds);
  });

  it.each(['7', '0d', '-1d', '1.5h', '7 days', '366d', 'abc'])(
    'AUTH-1: rejects JWT_EXPIRES_IN %s',
    (value) => {
      expect(() => loadEnv({ ...REQUIRED_ENV, JWT_EXPIRES_IN: value })).toThrow(/JWT_EXPIRES_IN/);
    },
  );
});
