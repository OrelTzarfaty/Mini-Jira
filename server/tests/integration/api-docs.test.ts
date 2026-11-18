import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createTestApp } from '../helpers/test-app.js';

describe('GET /api/docs', () => {
  it('SETUP-3: serves the Swagger UI page', async () => {
    const response = await request(createTestApp()).get('/api/docs/');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/html');
    expect(response.text).toContain('swagger-ui');
  });

  it('SETUP-3: opens the docs from the address without a trailing slash', async () => {
    const response = await request(createTestApp()).get('/api/docs');

    expect(response.status).toBe(301);
    expect(response.headers.location).toBe('/api/docs/');
  });

  it('SETUP-3: loads the API description into the page', async () => {
    const response = await request(createTestApp()).get('/api/docs/swagger-ui-init.js');

    expect(response.status).toBe(200);
    expect(response.text).toContain('Mini-Jira API');
  });

  it('SETUP-3: the docs page still blocks inline scripts', async () => {
    const response = await request(createTestApp()).get('/api/docs/');

    const policy = response.headers['content-security-policy'];
    expect(policy).toContain("script-src 'self'");
    expect(policy).not.toMatch(/script-src[^;]*unsafe-inline/);
  });
});
