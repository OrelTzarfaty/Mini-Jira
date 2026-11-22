import { z } from 'zod';

export const NAME_MAX_LENGTH = 100;
// RFC 5321 limits a forward path to 256 characters, which leaves 254 for the address itself.
export const EMAIL_MAX_LENGTH = 254;
export const PASSWORD_MIN_LENGTH = 8;
// An upper limit stops very long passwords from making Argon2id hashing slow (a cheap DoS).
export const PASSWORD_MAX_LENGTH = 128;

// Unicode control characters (category Cc): C0 U+0000-U+001F, DEL U+007F and C1 U+0080-U+009F.
// A name is one line of display text, so none of them belong in it, and PostgreSQL can't
// store U+0000 in a text column at all (it would fail as a 500 after the password was hashed).
const CONTROL_CHARACTER = /\p{Cc}/u;

/** A string field that says "<label> is required" when it is missing; other type errors keep zod's message. */
const requiredString = (label: string): z.ZodString =>
  z.string({
    error: (issue) => (issue.input === undefined ? `${label} is required` : undefined),
  });

// AUTH-1: the register form and `POST /api/auth/register` body.
export const registerSchema = z.strictObject({
  name: requiredString('Name')
    .trim()
    .min(1, 'Name is required')
    .max(NAME_MAX_LENGTH, `Name must be at most ${NAME_MAX_LENGTH} characters`)
    .refine(
      (name) => !CONTROL_CHARACTER.test(name),
      "Name contains characters that aren't allowed",
    ),
  // Trim and lowercase first, then check the format: zod 4 runs checks in order, so the
  // format check must see the cleaned value (" Ana@Example.COM " → "ana@example.com").
  email: requiredString('Email')
    .trim()
    .toLowerCase()
    .min(1, 'Email is required')
    .max(EMAIL_MAX_LENGTH, `Email must be at most ${EMAIL_MAX_LENGTH} characters`)
    .pipe(z.email('Enter a valid email address')),
  // Not trimmed: spaces are valid password characters.
  password: requiredString('Password')
    .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
    .max(PASSWORD_MAX_LENGTH, `Password must be at most ${PASSWORD_MAX_LENGTH} characters`),
});

/** What the client sends (before trimming and lowercasing). */
export type RegisterFormValues = z.input<typeof registerSchema>;
/** What the server works with after parsing. */
export type RegisterInput = z.output<typeof registerSchema>;

// What the API returns for a user. A plain (stripping) object on purpose: parsing a full
// user row through it drops `passwordHash` and any other field, so the hash never leaks.
export const publicUserSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.string(),
});

export type PublicUser = z.infer<typeof publicUserSchema>;
