import { ErrorCode, healthResponseSchema } from '@mini-jira/shared';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createTestApp } from '../helpers/test-app.js';

interface OpenApiSpec {
  openapi: string;
  paths: Record<string, Record<string, { responses: Record<string, unknown> }>>;
  components: {
    schemas: Record<
      string,
      { properties: { error: { properties: { code: { enum: string[] } } } } }
    >;
  };
}

async function getSpec(): Promise<OpenApiSpec> {
  const response = await request(createTestApp()).get('/api/openapi.json');
  expect(response.status).toBe(200);

  return response.body as OpenApiSpec;
}

describe('GET /api/openapi.json', () => {
  it('SETUP-3: returns an OpenAPI 3.1 document', async () => {
    const spec = await getSpec();

    expect(spec.openapi).toBe('3.1.0');
  });

  it('SETUP-3: documents the health endpoint', async () => {
    const spec = await getSpec();

    expect(Object.keys(spec.paths['/health']?.get?.responses ?? {})).toEqual(['200', '500']);
  });

  it('AUTH-1: documents the register endpoint with its responses', async () => {
    const spec = await getSpec();

    expect(Object.keys(spec.paths['/auth/register']?.post?.responses ?? {})).toEqual([
      '201',
      '400',
      '403',
      '409',
      '413',
      '500',
    ]);
  });

  it('AUTH-2: documents the login endpoint with its responses', async () => {
    const spec = await getSpec();

    expect(Object.keys(spec.paths['/auth/login']?.post?.responses ?? {})).toEqual([
      '200',
      '400',
      '401',
      '403',
      '413',
      '429',
      '500',
    ]);
  });

  it('SETUP-3: builds the error schema from the shared error codes', async () => {
    const spec = await getSpec();

    const codes = spec.components.schemas.ErrorResponse?.properties.error.properties.code.enum;
    expect(codes?.sort()).toEqual(Object.values(ErrorCode).sort());
  });

  it('SETUP-3: every schema reference points to a defined schema', async () => {
    const spec = await getSpec();

    const references = [...JSON.stringify(spec.paths).matchAll(/#\/components\/schemas\/(\w+)/g)];
    expect(references.length).toBeGreaterThan(0);
    for (const [, name] of references) {
      expect(spec.components.schemas).toHaveProperty(name ?? '');
    }
  });

  it('SETUP-3: the health response matches its documented schema', async () => {
    const response = await request(createTestApp()).get('/api/health');

    expect(healthResponseSchema.safeParse(response.body).success).toBe(true);
  });
});
