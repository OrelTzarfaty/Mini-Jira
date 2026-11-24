import {
  addMemberSchema,
  createProjectSchema,
  errorResponseSchema,
  healthResponseSchema,
  loginSchema,
  MAX_PAGE,
  memberPageSchema,
  memberSchema,
  PAGE_SIZE,
  projectSchema,
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

const CLEAR_AUTH_COOKIE_HEADER = {
  'Set-Cookie': {
    description: `Removes the login cookie \`${AUTH_COOKIE_NAME}\`: an empty value that expired in 1970, with the same flags it was set with (HttpOnly, SameSite=Lax, Path=/, and Secure in production).`,
    schema: {
      type: 'string',
      example: `${AUTH_COOKIE_NAME}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax`,
    },
  },
};

const NO_STORE_HEADER = {
  'Cache-Control': {
    description: 'Always `no-store`: the response holds personal data.',
    schema: { type: 'string', const: 'no-store' },
  },
};

// PRJ-6: the path parameter of every /projects/{projectKey}/... route.
const PROJECT_KEY_PARAMETER = {
  name: 'projectKey',
  in: 'path',
  required: true,
  description: 'The project key, exactly as stored: 2-6 uppercase letters A-Z (e.g. WEB)',
  schema: { type: 'string', pattern: '^[A-Z]{2,6}$', example: 'WEB' },
};

// PRJ-4: the member to remove.
const USER_ID_PARAMETER = {
  name: 'userId',
  in: 'path',
  required: true,
  description: "The member's user id (a UUID), as in the members list",
  schema: { type: 'string', format: 'uuid' },
};

// LST-4: the query parameter of every paginated list.
const PAGE_QUERY_PARAMETER = {
  name: 'page',
  in: 'query',
  required: false,
  description: `The 1-based page number; each page has up to ${PAGE_SIZE} items. A page after the last one returns no items.`,
  schema: { type: 'integer', minimum: 1, maximum: MAX_PAGE, default: 1 },
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
      { name: 'Projects', description: 'Projects and their members' },
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
            '413': jsonResponse(
              'The request body is over 100 kB (PAYLOAD_TOO_LARGE)',
              'ErrorResponse',
            ),
            '500': jsonResponse('Unexpected server error', 'ErrorResponse'),
          },
        },
      },
      '/auth/login': {
        post: {
          tags: ['Auth'],
          operationId: 'login',
          summary: 'Log in with email and password (sets the auth cookie)',
          description:
            'AUTH-2. The email is trimmed and lowercased like at register. The password (1-128 characters, not trimmed) is compared with the stored Argon2id hash. An unknown email and a wrong password get the same 401, and take about the same time. Failed logins are rate-limited (429). Unknown fields are rejected. Browsers must send the request from the web app (same origin), or it gets 403.',
          requestBody: jsonRequestBody('LoginRequest'),
          responses: {
            '200': {
              ...jsonResponse('The user is logged in', 'PublicUser'),
              headers: SET_AUTH_COOKIE_HEADER,
            },
            '400': jsonResponse(
              'Invalid input (VALIDATION_ERROR), with one entry in details[] per field',
              'ErrorResponse',
            ),
            '401': jsonResponse(
              'The email or the password is wrong (INVALID_CREDENTIALS); the answer never says which',
              'ErrorResponse',
            ),
            '403': jsonResponse('A cross-site request (FORBIDDEN)', 'ErrorResponse'),
            '413': jsonResponse(
              'The request body is over 100 kB (PAYLOAD_TOO_LARGE)',
              'ErrorResponse',
            ),
            '429': {
              ...jsonResponse(
                'Too many failed logins (RATE_LIMITED): 5 per email + IP in 15 minutes, or 100 per IP in a day. Blocked even with the right password until the wait is over. Only failed logins (401) count',
                'ErrorResponse',
              ),
              headers: {
                'Retry-After': {
                  description: 'Seconds to wait before trying again',
                  schema: { type: 'integer', minimum: 0 },
                },
              },
            },
            '500': jsonResponse('Unexpected server error', 'ErrorResponse'),
          },
        },
      },
      '/auth/logout': {
        post: {
          tags: ['Auth'],
          operationId: 'logout',
          summary: 'Log out (clears the auth cookie)',
          description:
            'AUTH-3. Send no request body. Always clears the auth cookie and answers 204, also when the cookie is missing, expired or invalid, so logging out never fails with 401. The token itself stays valid until it expires (a JWT cannot be revoked), but the browser no longer has it. Browsers must send the request from the web app (same origin), or it gets 403 and the cookie is kept.',
          responses: {
            '204': {
              description: 'The user is logged out (no response body)',
              headers: CLEAR_AUTH_COOKIE_HEADER,
            },
            '403': jsonResponse('A cross-site request (FORBIDDEN)', 'ErrorResponse'),
            '500': jsonResponse('Unexpected server error', 'ErrorResponse'),
          },
        },
      },
      '/auth/me': {
        get: {
          tags: ['Auth'],
          operationId: 'getMe',
          summary: 'Get the logged-in user (restores the session after a page refresh)',
          description: `AUTH-4. Reads the session from the auth cookie \`${AUTH_COOKIE_NAME}\` only (not an Authorization header). Answers with Cache-Control: no-store, so no browser or shared cache keeps the user's data.`,
          security: [{ authCookie: [] }],
          responses: {
            '200': {
              ...jsonResponse('The logged-in user', 'PublicUser'),
              headers: NO_STORE_HEADER,
            },
            '401': jsonResponse(
              'Not logged in (UNAUTHENTICATED): the cookie is missing, invalid or expired, or its user no longer exists; the answer never says which',
              'ErrorResponse',
            ),
            '500': jsonResponse('Unexpected server error', 'ErrorResponse'),
          },
        },
      },
      '/projects': {
        post: {
          tags: ['Projects'],
          operationId: 'createProject',
          summary: 'Create a project; the caller becomes its owner',
          description:
            'PRJ-1. Any logged-in user may create a project. The name (1-100 characters) and the description (optional, up to 2000) are trimmed; a missing, null or empty description is stored as null. The key is trimmed, must be 2-6 English letters A-Z in either case (no digits, no other letters), and is then uppercased ("web" becomes "WEB"); it must not be used by any other project in any letter case and can\'t be changed later, because it is the prefix of every ticket key (WEB-12). The project and the caller\'s OWNER membership are created in one transaction. Unknown fields are rejected. Browsers must send the request from the web app (same origin), or it gets 403.',
          security: [{ authCookie: [] }],
          requestBody: jsonRequestBody('CreateProjectRequest'),
          responses: {
            '201': jsonResponse(
              "The project was created; role is the caller's role (OWNER)",
              'Project',
            ),
            '400': jsonResponse(
              'Invalid input (VALIDATION_ERROR), with one entry in details[] per field',
              'ErrorResponse',
            ),
            '401': jsonResponse(
              'Not logged in (UNAUTHENTICATED): the cookie is missing, invalid or expired, or its user no longer exists',
              'ErrorResponse',
            ),
            '403': jsonResponse('A cross-site request (FORBIDDEN)', 'ErrorResponse'),
            '409': jsonResponse(
              'Another project already uses this key (PROJECT_KEY_TAKEN), with details[] on the key field',
              'ErrorResponse',
            ),
            '413': jsonResponse(
              'The request body is over 100 kB (PAYLOAD_TOO_LARGE)',
              'ErrorResponse',
            ),
            '500': jsonResponse('Unexpected server error', 'ErrorResponse'),
          },
        },
      },
      '/projects/{projectKey}': {
        get: {
          tags: ['Projects'],
          operationId: 'getProject',
          summary: 'Get a project the caller is a member of',
          description:
            'PRJ-6. Returns the project with the role the caller has in it (OWNER or MEMBER). The key in the URL is matched exactly: it must be the stored uppercase key ("WEB", not "web"). A project that does not exist and a project the caller is not a member of get the same 404, so the answer never reveals whether the project exists.',
          security: [{ authCookie: [] }],
          parameters: [PROJECT_KEY_PARAMETER],
          responses: {
            '200': jsonResponse("The project; role is the caller's role in it", 'Project'),
            '401': jsonResponse(
              'Not logged in (UNAUTHENTICATED): the cookie is missing, invalid or expired, or its user no longer exists',
              'ErrorResponse',
            ),
            '404': jsonResponse(
              'No such project, or the caller is not a member of it (NOT_FOUND, "Project not found")',
              'ErrorResponse',
            ),
            '500': jsonResponse('Unexpected server error', 'ErrorResponse'),
          },
        },
      },
      '/projects/{projectKey}/members': {
        get: {
          tags: ['Projects'],
          operationId: 'listProjectMembers',
          summary: 'List the members of a project',
          description: `PRJ-3. Any member of the project may list its members, ${PAGE_SIZE} per page: the owner first, then by the time they joined (oldest first). Unknown query parameters are rejected. A project that does not exist and a project the caller is not a member of get the same 404.`,
          security: [{ authCookie: [] }],
          parameters: [PROJECT_KEY_PARAMETER, PAGE_QUERY_PARAMETER],
          responses: {
            '200': jsonResponse('One page of members', 'MemberPage'),
            '400': jsonResponse(
              'Invalid query string (VALIDATION_ERROR), with one entry in details[] per parameter',
              'ErrorResponse',
            ),
            '401': jsonResponse(
              'Not logged in (UNAUTHENTICATED): the cookie is missing, invalid or expired, or its user no longer exists',
              'ErrorResponse',
            ),
            '404': jsonResponse(
              'No such project, or the caller is not a member of it (NOT_FOUND, "Project not found")',
              'ErrorResponse',
            ),
            '500': jsonResponse('Unexpected server error', 'ErrorResponse'),
          },
        },
        post: {
          tags: ['Projects'],
          operationId: 'addProjectMember',
          summary: 'Add a registered user to the project by email (owner only)',
          description:
            'PRJ-3. Only the project owner may add members; the new member gets the MEMBER role. The email is trimmed and lowercased like at register, so it matches in any letter case. Only registered users can be added: an unknown email gets 404 USER_NOT_FOUND (so the owner can tell whether an email is registered, which the requirement asks for). A user who is already in the project, including the owner, gets 409 ALREADY_MEMBER, also when two adds race. Unknown fields are rejected. Browsers must send the request from the web app (same origin), or it gets 403.',
          security: [{ authCookie: [] }],
          parameters: [PROJECT_KEY_PARAMETER],
          requestBody: jsonRequestBody('AddMemberRequest'),
          responses: {
            '201': jsonResponse('The user was added as a MEMBER', 'Member'),
            '400': jsonResponse(
              'Invalid input (VALIDATION_ERROR), with one entry in details[] per field',
              'ErrorResponse',
            ),
            '401': jsonResponse(
              'Not logged in (UNAUTHENTICATED): the cookie is missing, invalid or expired, or its user no longer exists',
              'ErrorResponse',
            ),
            '403': jsonResponse(
              'The caller is a member but not the owner (FORBIDDEN, "Only the project owner can do this"), or a cross-site request (FORBIDDEN)',
              'ErrorResponse',
            ),
            '404': jsonResponse(
              'No such project or the caller is not a member of it (NOT_FOUND, "Project not found"), or no user has this email (USER_NOT_FOUND, with details[] on the email field)',
              'ErrorResponse',
            ),
            '409': jsonResponse(
              'The user is already a member of the project (ALREADY_MEMBER), with details[] on the email field',
              'ErrorResponse',
            ),
            '413': jsonResponse(
              'The request body is over 100 kB (PAYLOAD_TOO_LARGE)',
              'ErrorResponse',
            ),
            '500': jsonResponse('Unexpected server error', 'ErrorResponse'),
          },
        },
      },
      '/projects/{projectKey}/members/{userId}': {
        delete: {
          tags: ['Projects'],
          operationId: 'removeProjectMember',
          summary: 'Remove a member from the project (owner only)',
          description:
            "PRJ-4. Only the project owner may remove members. The owner can't be removed (409 CANNOT_REMOVE_OWNER), so a project always keeps its owner, also when requests race. Send no request body. Browsers must send the request from the web app (same origin), or it gets 403.",
          security: [{ authCookie: [] }],
          parameters: [PROJECT_KEY_PARAMETER, USER_ID_PARAMETER],
          responses: {
            '204': { description: 'The member was removed; no response body' },
            '400': jsonResponse(
              'The user id is not a UUID (VALIDATION_ERROR), with details[] on the userId field',
              'ErrorResponse',
            ),
            '401': jsonResponse(
              'Not logged in (UNAUTHENTICATED): the cookie is missing, invalid or expired, or its user no longer exists',
              'ErrorResponse',
            ),
            '403': jsonResponse(
              'The caller is a member but not the owner (FORBIDDEN, "Only the project owner can do this"), or a cross-site request (FORBIDDEN)',
              'ErrorResponse',
            ),
            '404': jsonResponse(
              'No such project or the caller is not a member of it (NOT_FOUND, "Project not found"), or the user is not a member of the project (NOT_FOUND, "Member not found")',
              'ErrorResponse',
            ),
            '409': jsonResponse(
              "The user is the project's owner, who can't be removed (CANNOT_REMOVE_OWNER)",
              'ErrorResponse',
            ),
            '500': jsonResponse('Unexpected server error', 'ErrorResponse'),
          },
        },
      },
    },
    components: {
      securitySchemes: {
        authCookie: {
          type: 'apiKey',
          in: 'cookie',
          name: AUTH_COOKIE_NAME,
          description: 'The session JWT set by register or login (AUTH-1, AUTH-2).',
        },
      },
      schemas: {
        AddMemberRequest: toComponentSchema(addMemberSchema, 'input'),
        ErrorResponse: toComponentSchema(errorResponseSchema),
        CreateProjectRequest: toComponentSchema(createProjectSchema, 'input'),
        HealthResponse: toComponentSchema(healthResponseSchema),
        LoginRequest: toComponentSchema(loginSchema, 'input'),
        Member: toComponentSchema(memberSchema),
        MemberPage: toComponentSchema(memberPageSchema),
        Project: toComponentSchema(projectSchema),
        PublicUser: toComponentSchema(publicUserSchema),
        RegisterRequest: toComponentSchema(registerSchema, 'input'),
      },
    },
  };
}
