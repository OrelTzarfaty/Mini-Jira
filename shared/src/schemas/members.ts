import { z } from 'zod';

import { Role } from '../enums.js';
import { pageSchema } from './pagination.js';

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
