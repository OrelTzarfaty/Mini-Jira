import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createMemoryLogger, createTestApp } from '../helpers/test-app.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('request ID and logging', () => {
  it('SETUP-3: creates a request ID when the client sends none', async () => {
    const response = await request(createTestApp()).get('/api/health');

    expect(response.headers['x-request-id']).toMatch(UUID);
  });

  it('SETUP-3: reuses a safe request ID from the client', async () => {
    const response = await request(createTestApp())
      .get('/api/health')
      .set('X-Request-Id', 'trace-123');

    expect(response.headers['x-request-id']).toBe('trace-123');
  });

  it('SETUP-3: replaces an unsafe request ID', async () => {
    const response = await request(createTestApp())
      .get('/api/health')
      .set('X-Request-Id', 'bad id {"injected":true}');

    expect(response.headers['x-request-id']).toMatch(UUID);
  });

  it('SETUP-3: writes the request ID on the log line', async () => {
    const { logger, lines } = createMemoryLogger();

    const response = await request(createTestApp({ logger })).get('/api/health');

    expect(lines).toHaveLength(1);
    expect(lines[0]?.req?.id).toBe(response.headers['x-request-id']);
    expect(lines[0]?.res?.statusCode).toBe(200);
  });

  it('SETUP-3: never logs cookies or authorization headers', async () => {
    const { logger, lines } = createMemoryLogger();

    await request(createTestApp({ logger }))
      .get('/api/health')
      .set('Cookie', 'mj_session=secret-session')
      .set('Authorization', 'Bearer secret-token');

    const output = JSON.stringify(lines);
    expect(output).not.toContain('secret-session');
    expect(output).not.toContain('secret-token');
  });
});
