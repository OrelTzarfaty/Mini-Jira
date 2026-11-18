import { Router } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createTestApp, TEST_CLIENT_ORIGIN } from '../helpers/test-app.js';

const FORBIDDEN_BODY = {
  error: { code: 'FORBIDDEN', message: 'Cross-site requests are not allowed' },
};

describe('origin check', () => {
  let handlerCalls: number;
  let app: ReturnType<typeof createTestApp>;

  beforeEach(() => {
    handlerCalls = 0;
    const apiRouter = Router();
    apiRouter.all('/action', (_req, res) => {
      handlerCalls += 1;
      res.json({ done: true });
    });
    app = createTestApp({ apiRouter });
  });

  it('SETUP-3: allows a same-origin POST', async () => {
    const response = await request(app).post('/api/action').set('Sec-Fetch-Site', 'same-origin');

    expect(response.status).toBe(200);
    expect(handlerCalls).toBe(1);
  });

  it('SETUP-3: allows a POST from the web app when the browser sends only Origin', async () => {
    const response = await request(app).post('/api/action').set('Origin', TEST_CLIENT_ORIGIN);

    expect(response.status).toBe(200);
    expect(handlerCalls).toBe(1);
  });

  it.each(['cross-site', 'same-site', 'none'])(
    'SETUP-3: blocks a POST with Sec-Fetch-Site: %s',
    async (fetchSite) => {
      const response = await request(app).post('/api/action').set('Sec-Fetch-Site', fetchSite);

      expect(response.status).toBe(403);
      expect(response.body).toEqual(FORBIDDEN_BODY);
      expect(handlerCalls).toBe(0);
    },
  );

  it.each([
    'https://attacker.example',
    `${TEST_CLIENT_ORIGIN}.attacker.example`,
    'http://localhost:5174',
    'null',
  ])('SETUP-3: blocks a POST from origin %s', async (origin) => {
    const response = await request(app).post('/api/action').set('Origin', origin);

    expect(response.status).toBe(403);
    expect(handlerCalls).toBe(0);
  });

  it('SETUP-3: blocks a POST with neither header', async () => {
    const response = await request(app).post('/api/action');

    expect(response.status).toBe(403);
    expect(handlerCalls).toBe(0);
  });

  it('SETUP-3: a cross-site request can not pass by sending a matching Origin', async () => {
    const response = await request(app)
      .post('/api/action')
      .set('Sec-Fetch-Site', 'cross-site')
      .set('Origin', TEST_CLIENT_ORIGIN);

    expect(response.status).toBe(403);
    expect(handlerCalls).toBe(0);
  });

  it.each(['patch', 'put', 'delete'] as const)(
    'SETUP-3: blocks a cross-site %s',
    async (method) => {
      const response = await request(app)
        [method]('/api/action')
        .set('Sec-Fetch-Site', 'cross-site');

      expect(response.status).toBe(403);
      expect(handlerCalls).toBe(0);
    },
  );

  it('SETUP-3: does not block reading data with GET', async () => {
    const response = await request(app).get('/api/action').set('Sec-Fetch-Site', 'cross-site');

    expect(response.status).toBe(200);
  });
});
