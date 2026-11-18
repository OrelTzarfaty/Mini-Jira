import { describe, expect, it } from 'vitest';

import { loadEnv } from '../../src/config/env.js';

const CLIENT_ORIGIN = 'http://localhost:5173';
const DATABASE_URL = 'postgresql://user:secret-password@localhost:5432/minijira';
const REQUIRED_ENV = { CLIENT_ORIGIN, DATABASE_URL };

describe('loadEnv', () => {
  it('SETUP-3: uses safe defaults for optional variables', () => {
    expect(loadEnv(REQUIRED_ENV)).toEqual({
      NODE_ENV: 'development',
      PORT: 3000,
      LOG_LEVEL: 'info',
      CLIENT_ORIGIN,
      DATABASE_URL,
    });
  });

  it('SETUP-3: converts PORT into a number', () => {
    expect(loadEnv({ ...REQUIRED_ENV, PORT: '8080' }).PORT).toBe(8080);
  });

  it('SETUP-3: fails fast when CLIENT_ORIGIN is missing', () => {
    expect(() => loadEnv({ DATABASE_URL })).toThrow(/CLIENT_ORIGIN/);
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
    expect(() => loadEnv({ CLIENT_ORIGIN })).toThrow(/DATABASE_URL/);
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
});
