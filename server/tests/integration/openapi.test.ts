import { ErrorCode, healthResponseSchema } from '@mini-jira/shared';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createTestApp } from '../helpers/test-app.js';

interface OpenApiSpec {
  openapi: string;
  paths: Record<
    string,
    Record<string, { responses: Record<string, unknown>; parameters?: unknown[] }>
  >;
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

  it('AUTH-3: documents the logout endpoint with its responses', async () => {
    const spec = await getSpec();

    expect(Object.keys(spec.paths['/auth/logout']?.post?.responses ?? {})).toEqual([
      '204',
      '403',
      '500',
    ]);
  });

  it('AUTH-4: documents the current-user endpoint with its responses', async () => {
    const spec = await getSpec();

    expect(Object.keys(spec.paths['/auth/me']?.get?.responses ?? {})).toEqual([
      '200',
      '401',
      '500',
    ]);
  });

  it('PRJ-1: documents the create-project endpoint with its responses', async () => {
    const spec = await getSpec();

    expect(Object.keys(spec.paths['/projects']?.post?.responses ?? {})).toEqual([
      '201',
      '400',
      '401',
      '403',
      '409',
      '413',
      '500',
    ]);
    // The internal counter is never part of the documented response.
    expect(JSON.stringify(spec.components.schemas.Project)).not.toContain('ticketCounter');
  });

  it('PRJ-6: documents the get-project endpoint with its path parameter and responses', async () => {
    const spec = await getSpec();
    const operation = spec.paths['/projects/{projectKey}']?.get;

    expect(Object.keys(operation?.responses ?? {})).toEqual(['200', '401', '404', '500']);
    expect(operation?.parameters).toEqual([
      expect.objectContaining({ name: 'projectKey', in: 'path', required: true }),
    ]);
  });

  it('PRJ-2: documents the my-projects list with its query parameters and responses', async () => {
    const spec = await getSpec();
    const operation = spec.paths['/projects']?.get;

    expect(Object.keys(operation?.responses ?? {})).toEqual(['200', '400', '401', '500']);
    expect(operation?.parameters).toEqual([
      expect.objectContaining({ name: 'q', in: 'query', required: false }),
      expect.objectContaining({ name: 'page', in: 'query', required: false }),
    ]);
    expect(JSON.stringify(spec.components.schemas.ProjectListPage)).toContain('openTicketCount');
  });

  it('PRJ-3: documents the list-members endpoint with its parameters and responses', async () => {
    const spec = await getSpec();
    const operation = spec.paths['/projects/{projectKey}/members']?.get;

    expect(Object.keys(operation?.responses ?? {})).toEqual(['200', '400', '401', '404', '500']);
    expect(operation?.parameters).toEqual([
      expect.objectContaining({ name: 'projectKey', in: 'path', required: true }),
      expect.objectContaining({ name: 'page', in: 'query', required: false }),
    ]);
  });

  it('PRJ-3: documents the add-member endpoint with its responses', async () => {
    const spec = await getSpec();
    const operation = spec.paths['/projects/{projectKey}/members']?.post;

    expect(Object.keys(operation?.responses ?? {})).toEqual([
      '201',
      '400',
      '401',
      '403',
      '404',
      '409',
      '413',
      '500',
    ]);
    expect(operation?.parameters).toEqual([
      expect.objectContaining({ name: 'projectKey', in: 'path', required: true }),
    ]);
  });

  it('PRJ-4: documents the remove-member endpoint with its parameters and responses', async () => {
    const spec = await getSpec();
    const operation = spec.paths['/projects/{projectKey}/members/{userId}']?.delete;

    expect(Object.keys(operation?.responses ?? {})).toEqual([
      '204',
      '400',
      '401',
      '403',
      '404',
      '409',
      '500',
    ]);
    expect(operation?.parameters).toEqual([
      expect.objectContaining({ name: 'projectKey', in: 'path', required: true }),
      expect.objectContaining({ name: 'userId', in: 'path', required: true }),
    ]);
  });

  it('PRJ-5: documents the edit-project endpoint with its responses and ticketCount', async () => {
    const spec = await getSpec();
    const operation = spec.paths['/projects/{projectKey}']?.patch;

    expect(Object.keys(operation?.responses ?? {})).toEqual([
      '200',
      '400',
      '401',
      '403',
      '404',
      '413',
      '500',
    ]);
    expect(operation?.parameters).toEqual([
      expect.objectContaining({ name: 'projectKey', in: 'path', required: true }),
    ]);
    expect(JSON.stringify(spec.components.schemas.ProjectDetail)).toContain('ticketCount');
    // The key can't be edited, so the request body doesn't offer it.
    expect(JSON.stringify(spec.components.schemas.UpdateProjectRequest)).not.toContain('"key"');
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
