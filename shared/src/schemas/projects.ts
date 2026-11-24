import { z } from 'zod';

import { Role } from '../enums.js';
import { CONTROL_CHARACTER, requiredString } from './common.js';
import { paginationQuerySchema } from './pagination.js';

export const PROJECT_KEY_MIN_LENGTH = 2;
export const PROJECT_KEY_MAX_LENGTH = 6;
export const PROJECT_NAME_MAX_LENGTH = 100;
export const PROJECT_DESCRIPTION_MAX_LENGTH = 2000;
// PRJ-1: shown under the Key field when another project already uses the key (wireframe 02 D).
export const PROJECT_KEY_TAKEN_MESSAGE = 'This key is already taken';
// PRJ-6: the one 404 message for a missing project and for a project the caller isn't a member
// of, so the answer never reveals whether the project exists.
export const PROJECT_NOT_FOUND_MESSAGE = 'Project not found';
// PRJ-6: a member (not the owner) tried an owner-only action (403).
export const PROJECT_OWNER_ONLY_MESSAGE = 'Only the project owner can do this';

// PRJ-1: a key is only the letters A-Z, because it becomes the prefix of every ticket key (WEB-1).
// Lowercase ASCII is accepted here and uppercased afterwards. The check must run on the raw
// input: uppercasing first would turn non-ASCII letters into A-Z ("ßß" -> "SSSS", "ıı" -> "II").
const PROJECT_KEY_PATTERN = new RegExp(
  `^[A-Za-z]{${PROJECT_KEY_MIN_LENGTH},${PROJECT_KEY_MAX_LENGTH}}$`,
);

// PRJ-6: a stored key, exactly as it appears in project URLs (/projects/WEB/board): uppercase
// A-Z only. Lowercase is not accepted here, because keys are stored uppercased (PRJ-1).
const STORED_PROJECT_KEY_PATTERN = new RegExp(
  `^[A-Z]{${PROJECT_KEY_MIN_LENGTH},${PROJECT_KEY_MAX_LENGTH}}$`,
);

/** PRJ-6: true only for a value that could be a stored project key (2-6 uppercase letters A-Z). */
export function isProjectKey(value: string): boolean {
  return STORED_PROJECT_KEY_PATTERN.test(value);
}

// A description may span lines, so tab, line feed and carriage return are allowed; every other
// control character is rejected (PostgreSQL can't store U+0000 in a text column).
const DESCRIPTION_CONTROL_CHARACTER = /(?![\t\n\r])\p{Cc}/u;

// PRJ-1: the create-project form and `POST /api/projects` body.
export const createProjectSchema = z.strictObject({
  name: requiredString('Name')
    .trim()
    .min(1, 'Name is required')
    .max(PROJECT_NAME_MAX_LENGTH, `Name must be at most ${PROJECT_NAME_MAX_LENGTH} characters`)
    .refine(
      (name) => !CONTROL_CHARACTER.test(name),
      "Name contains characters that aren't allowed",
    ),
  // Trimmed, checked, then uppercased ("web" is stored as "WEB"); zod 4 runs the steps in
  // order. `abort` stops an empty key from also getting the format message.
  key: requiredString('Key')
    .trim()
    .min(1, { error: 'Key is required', abort: true })
    .regex(
      PROJECT_KEY_PATTERN,
      `Key must be ${PROJECT_KEY_MIN_LENGTH}–${PROJECT_KEY_MAX_LENGTH} letters (A–Z)`,
    )
    .toUpperCase(),
  // Optional: missing, null, or empty after trimming are all stored as null (one "no description" value).
  description: z
    .string()
    .trim()
    .max(
      PROJECT_DESCRIPTION_MAX_LENGTH,
      `Description must be at most ${PROJECT_DESCRIPTION_MAX_LENGTH} characters`,
    )
    .refine(
      (description) => !DESCRIPTION_CONTROL_CHARACTER.test(description),
      "Description contains characters that aren't allowed",
    )
    .nullish()
    .transform((description) =>
      description === undefined || description === null || description === '' ? null : description,
    ),
});

/** What the client sends (before trimming and uppercasing). */
export type CreateProjectFormValues = z.input<typeof createProjectSchema>;
/** What the server works with after parsing (`description` is `string | null`). */
export type CreateProjectInput = z.output<typeof createProjectSchema>;

// What the API returns for a project. A plain (stripping) object on purpose: parsing a project
// row through it drops internal fields such as `ticketCounter`, so they never leak.
// `role` is the caller's role in the project (PRJ-1 returns OWNER; PRJ-6 reuses this schema).
export const projectSchema = z.object({
  id: z.uuid(),
  key: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  role: z.enum(Role),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type Project = z.infer<typeof projectSchema>;

// PRJ-2: the query of `GET /api/projects` (My Projects). Strict, so an unknown parameter is a 400.
export const listProjectsQuerySchema = paginationQuerySchema;

export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;

// PRJ-2: one card on the My Projects page: the project with the caller's role and the number of
// its tickets that aren't Done.
export const projectListItemSchema = projectSchema.extend({
  openTicketCount: z.number().int().min(0),
});

export type ProjectListItem = z.infer<typeof projectListItemSchema>;
