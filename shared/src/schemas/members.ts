import { z } from 'zod';

import { Role } from '../enums.js';
import { emailField } from './auth.js';
import { pageSchema } from './pagination.js';

// PRJ-3: shown under the email field (wireframe 06 C).
export const USER_NOT_FOUND_MESSAGE =
  'No Mini-Jira user with this email. They need to register first.';
export const alreadyMemberMessage = (name: string): string => `${name} is already a member.`;
// PRJ-4: removing a user who isn't in the project, and the owner trying to remove themselves.
export const MEMBER_NOT_FOUND_MESSAGE = 'Member not found';
export const CANNOT_REMOVE_OWNER_MESSAGE = "The project owner can't be removed.";
export const INVALID_USER_ID_MESSAGE = 'User id must be a valid UUID';

// PRJ-3: the "Add by email" form and `POST /api/projects/:projectKey/members` body. The email is
// trimmed and lowercased like at register, so it matches the stored address.
export const addMemberSchema = z.strictObject({ email: emailField });

/** What the client sends (before trimming and lowercasing). */
export type AddMemberFormValues = z.input<typeof addMemberSchema>;
/** What the server works with after parsing. */
export type AddMemberInput = z.output<typeof addMemberSchema>;

// PRJ-3: what the API returns for a project member: the user's public fields, their role in the
// project, and when they joined. A plain (stripping) object, so nothing else leaves the API.
export const memberSchema = z.object({
  userId: z.uuid(),
  name: z.string(),
  email: z.string(),
  role: z.enum(Role),
  joinedAt: z.iso.datetime(),
});

export type Member = z.infer<typeof memberSchema>;

// PRJ-3: one page of `GET /api/projects/:projectKey/members`.
export const memberPageSchema = pageSchema(memberSchema);

export type MemberPage = z.infer<typeof memberPageSchema>;

// PRJ-4: the path parameters of `DELETE /api/projects/:projectKey/members/:userId`. User ids are
// UUIDs, so anything else is a 400 before it reaches the database (a uuid column would reject
// it with a 500). A plain (stripping) object: `projectKey` is in the same params and was already
// checked by loadProjectAccess.
export const memberParamsSchema = z.object({
  userId: z.uuid(INVALID_USER_ID_MESSAGE),
});

export type MemberParams = z.infer<typeof memberParamsSchema>;
