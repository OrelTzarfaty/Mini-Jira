import { errorResponseSchema, healthResponseSchema } from '@mini-jira/shared';
import { z } from 'zod';

const API_VERSION = '0.1.0';

function toComponentSchema(schema: z.ZodType): Record<string, unknown> {
  const entries = Object.entries(z.toJSONSchema(schema));

  return Object.fromEntries(entries.filter(([key]) => key !== '$schema'));
}

function jsonResponse(description: string, schemaName: string): Record<string, unknown> {
  return {
    description,
    content: {
      'application/json': {
        schema: { $ref: `#/components/schemas/${schemaName}` },
      },
    },
  };
}

export function createOpenApiSpec(): Record<string, unknown> {
  return {
    openapi: '3.1.0',
    info: {
      title: 'Mini-Jira API',
      version: API_VERSION,
      description: 'REST API for Mini-Jira, a lightweight team task board.',
    },
    servers: [{ url: '/api' }],
    tags: [{ name: 'System', description: 'API status' }],
    paths: {
      '/health': {
        get: {
          tags: ['System'],
          operationId: 'getHealth',
          summary: 'Check that the API is running',
          responses: {
            '200': jsonResponse('The API is running', 'HealthResponse'),
            '500': jsonResponse('Unexpected server error', 'ErrorResponse'),
          },
        },
      },
    },
    components: {
      schemas: {
        ErrorResponse: toComponentSchema(errorResponseSchema),
        HealthResponse: toComponentSchema(healthResponseSchema),
      },
    },
  };
}
