import { Router } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createTestApp, TEST_CLIENT_ORIGIN } from '../helpers/test-app.js';

describe('security middleware', () => {
  it('SETUP-3: sends security headers and hides Express', async () => {
    const response = await request(createTestApp()).get('/api/health');

    expect(response.headers['content-security-policy']).toBeDefined();
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('SETUP-3: allows only the web app origin, with cookies', async () => {
    const response = await request(createTestApp())
      .get('/api/health')
      .set('Origin', 'https://other-site.example');

    expect(response.headers['access-control-allow-origin']).toBe(TEST_CLIENT_ORIGIN);
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });

  it('SETUP-3: uses the client address sent by nginx', async () => {
    const apiRouter = Router();
    apiRouter.get('/ip', (req, res) => {
      res.json({ ip: req.ip });
    });

    const response = await request(createTestApp({ apiRouter }))
      .get('/api/ip')
      .set('X-Forwarded-For', '198.51.100.7');

    expect(response.body).toEqual({ ip: '198.51.100.7' });
  });

  it('SETUP-3: ignores addresses added before nginx', async () => {
    const apiRouter = Router();
    apiRouter.get('/ip', (req, res) => {
      res.json({ ip: req.ip });
    });

    const response = await request(createTestApp({ apiRouter }))
      .get('/api/ip')
      .set('X-Forwarded-For', '203.0.113.9, 198.51.100.7');

    expect(response.body).toEqual({ ip: '198.51.100.7' });
  });

  it('SETUP-3: reads cookies from the request', async () => {
    const apiRouter = Router();
    apiRouter.get('/cookies', (req, res) => {
      res.json(req.cookies);
    });

    const response = await request(createTestApp({ apiRouter }))
      .get('/api/cookies')
      .set('Cookie', 'mj_session=value');

    expect(response.body).toEqual({ mj_session: 'value' });
  });
});
