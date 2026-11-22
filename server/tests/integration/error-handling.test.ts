import { ErrorCode } from '@mini-jira/shared';
import { Router } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { AppError, ValidationError } from '../../src/lib/errors.js';
import { createMemoryLogger, createTestApp, TEST_CLIENT_ORIGIN } from '../helpers/test-app.js';

const SECRET_DETAIL = 'connection to db-password-123 failed';

function createFailingRouter(): Router {
  const router = Router();

  router.get('/crash', () => {
    throw new Error(SECRET_DETAIL);
  });
  router.get('/async-crash', async () => {
    await Promise.resolve();
    throw new Error(SECRET_DETAIL);
  });
  router.get('/conflict', () => {
    throw new AppError(ErrorCode.EDIT_CONFLICT, 'This ticket was updated by someone else');
  });
  router.get('/invalid', () => {
    throw new ValidationError('Title is required', [{ field: 'title', message: 'Required' }]);
  });
  router.post('/echo', (req, res) => {
    res.json(req.body);
  });

  return router;
}

const failingApp = () => createTestApp({ apiRouter: createFailingRouter() });

describe('error handling', () => {
  it.each(['/api/unknown', '/unknown'])(
    'SETUP-3: unknown route %s returns 404 in the standard format',
    async (path) => {
      const response = await request(createTestApp()).get(path);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        error: { code: 'NOT_FOUND', message: 'The requested resource was not found' },
      });
    },
  );

  it('SETUP-3: expected errors use their HTTP status and code', async () => {
    const response = await request(failingApp()).get('/api/conflict');

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: { code: 'EDIT_CONFLICT', message: 'This ticket was updated by someone else' },
    });
  });

  it('SETUP-3: validation errors include field details', async () => {
    const response = await request(failingApp()).get('/api/invalid');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Title is required',
        details: [{ field: 'title', message: 'Required' }],
      },
    });
  });

  it.each(['/api/crash', '/api/async-crash'])(
    'SETUP-3: %s returns 500 without a stack trace or internal details',
    async (path) => {
      const response = await request(failingApp()).get(path);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' },
      });
      expect(response.text).not.toContain(SECRET_DETAIL);
      expect(response.text).not.toContain('error-handling.test');
    },
  );

  it('SETUP-3: logs the full error with its request ID', async () => {
    const { logger, lines } = createMemoryLogger();
    const app = createTestApp({ logger, apiRouter: createFailingRouter() });

    const response = await request(app).get('/api/crash');

    const errorLine = lines.find((line) => line.msg === 'Unexpected request error');
    expect(errorLine?.err?.message).toBe(SECRET_DETAIL);
    expect(errorLine?.err?.stack).toContain('error-handling.test');
    expect(errorLine?.req?.id).toBe(response.headers['x-request-id']);
  });

  it('SETUP-3: invalid JSON returns 400', async () => {
    const response = await request(failingApp())
      .post('/api/echo')
      .set('Origin', TEST_CLIENT_ORIGIN)
      .set('Content-Type', 'application/json')
      .send('{"title":');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: { code: 'VALIDATION_ERROR', message: 'The request body must be valid JSON' },
    });
  });

  it('SETUP-3: a body over the size limit gets 413 PAYLOAD_TOO_LARGE', async () => {
    const response = await request(failingApp())
      .post('/api/echo')
      .set('Origin', TEST_CLIENT_ORIGIN)
      .send({ title: 'x'.repeat(101 * 1024) });

    expect(response.status).toBe(413);
    expect(response.body).toEqual({
      error: { code: 'PAYLOAD_TOO_LARGE', message: 'The request body is too large' },
    });
  });

  it('SETUP-3: a malformed URL returns 400', async () => {
    const apiRouter = Router();
    apiRouter.get('/tickets/:key', (_req, res) => {
      res.json({});
    });

    const response = await request(createTestApp({ apiRouter })).get('/api/tickets/%E0%A4%A');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: { code: 'VALIDATION_ERROR', message: 'The request is invalid' },
    });
  });
});
