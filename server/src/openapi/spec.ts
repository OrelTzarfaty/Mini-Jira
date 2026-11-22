import {
  errorResponseSchema,
  healthResponseSchema,
  publicUserSchema,
  registerSchema,
} from '@mini-jira/shared';
import { z } from 'zod';

import { AUTH_COOKIE_NAME } from '../lib/auth-cookie.js';

const API_VERSION = '0.1.0';

// Request bodies are documented as the client sends them ("input"), responses as the API
// returns them ("output"). They differ where a schema transforms values, like the email.
function toComponentSchema(
  schema: z.ZodType,
  io: 'input' | 'output' = 'output',
): Record<string, unknown> {
  const entries = Object.entries(z.toJSONSchema(schema, { io }));

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

function jsonRequestBody(schemaName: string): Record<string, unknown> {
  return {
    required: true,
    content: {
      'application/json': {
        schema: { $ref: `#/components/schemas/${schemaName}` },
      },
    },
  };
}

const SET_AUTH_COOKIE_HEADER = {
  'Set-Cookie': {
    description: `The login cookie \`${AUTH_COOKIE_NAME}\`: a signed JWT, HttpOnly, SameSite=Lax, Path=/, valid for 7 days by default (JWT_EXPIRES_IN), and Secure in production.`,
    schema: {
      type: 'string',
      example: `${AUTH_COOKIE_NAME}=eyJhbGciOiJIUzI1NiJ9...; Max-Age=604800; Path=/; HttpOnly; SameSite=Lax`,
    },
  },
};

export function createOpenApiSpec(): Record<string, unknown> {
  return {
    openapi: '3.1.0',
    info: {
      title: 'Mini-Jira API',
      version: API_VERSION,
      description: 'REST API for Mini-Jira, a lightweight team task board.',
    },
    servers: [{ url: '/api' }],
    tags: [
      { name: 'System', description: 'API status' },
      { name: 'Auth', description: 'Accounts and login sessions' },
    ],
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
      '/auth/register': {
        post: {
          tags: ['Auth'],
          operationId: 'register',
          summary: 'Create an account and log in (sets the auth cookie)',
          description:
            'AUTH-1. The email is trimmed and lowercased, then must be a valid address and not already registered in any letter case. The password (8-128 characters, not trimmed) is stored only as an Argon2id hash and never returned. Unknown fields are rejected. Browsers must send the request from the web app (same origin), or it gets 403.',
          requestBody: jsonRequestBody('RegisterRequest'),
          responses: {
            '201': {
              ...jsonResponse('The account was created and the user is logged in', 'PublicUser'),
              headers: SET_AUTH_COOKIE_HEADER,
            },
            '400': jsonResponse(
              'Invalid input (VALIDATION_ERROR), with one entry in details[] per field',
              'ErrorResponse',
            ),
            '403': jsonResponse('A cross-site request (FORBIDDEN)', 'ErrorResponse'),
            '409': jsonResponse('This email is already registered (EMAIL_TAKEN)', 'ErrorResponse'),
            '500': jsonResponse('Unexpected server error', 'ErrorResponse'),
          },
        },
      },
    },
    components: {
      schemas: {
        ErrorResponse: toComponentSchema(errorResponseSchema),
        HealthResponse: toComponentSchema(healthResponseSchema),
        PublicUser: toComponentSchema(publicUserSchema),
        RegisterRequest: toComponentSchema(registerSchema, 'input'),
      },
    },
  };
}
