import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createTestApp } from '../helpers/test-app.js';

describe('GET /api/health', () => {
  it('SETUP-3: reports that the API is running', async () => {
    const response = await request(createTestApp()).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});
