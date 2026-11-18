import { describe, expect, it } from 'vitest';

import { loadEnv } from '../../src/config/env.js';

const CLIENT_ORIGIN = 'http://localhost:5173';

describe('loadEnv', () => {
  it('SETUP-3: uses safe defaults for optional variables', () => {
    expect(loadEnv({ CLIENT_ORIGIN })).toEqual({
      NODE_ENV: 'development',
      PORT: 3000,
      LOG_LEVEL: 'info',
      CLIENT_ORIGIN,
    });
  });

  it('SETUP-3: converts PORT into a number', () => {
    expect(loadEnv({ CLIENT_ORIGIN, PORT: '8080' }).PORT).toBe(8080);
  });

  it('SETUP-3: fails fast when CLIENT_ORIGIN is missing', () => {
    expect(() => loadEnv({})).toThrow(/CLIENT_ORIGIN/);
  });

  it.each(['http://localhost:5173/', 'http://localhost:5173/app', 'not-a-url'])(
    'SETUP-3: rejects %s as CLIENT_ORIGIN',
    (value) => {
      expect(() => loadEnv({ CLIENT_ORIGIN: value })).toThrow(/CLIENT_ORIGIN/);
    },
  );

  it.each(['0', '65536', 'abc'])('SETUP-3: rejects PORT %s', (PORT) => {
    expect(() => loadEnv({ CLIENT_ORIGIN, PORT })).toThrow(/PORT/);
  });

  it('SETUP-3: does not repeat invalid values in the error message', () => {
    expect(() => loadEnv({ CLIENT_ORIGIN: 'private-value' })).not.toThrow(/private-value/);
  });
});
