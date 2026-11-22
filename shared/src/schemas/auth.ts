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

const passwordMaxMessage = `Password must be at most ${PASSWORD_MAX_LENGTH} characters`;

// AUTH-1/AUTH-2: one email rule for register and login, so the same address always
// normalizes to the same stored value. Zod schemas are immutable, so sharing one is safe.
// Trim and lowercase first, then check the format: zod 4 runs checks in order, so the
// format check must see the cleaned value (" Ana@Example.COM " → "ana@example.com").
const emailField = requiredString('Email')
  .trim()
  .toLowerCase()
  .min(1, 'Email is required')
  .max(EMAIL_MAX_LENGTH, `Email must be at most ${EMAIL_MAX_LENGTH} characters`)
  .pipe(z.email('Enter a valid email address'));

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
  email: emailField,
  // Not trimmed: spaces are valid password characters.
  password: requiredString('Password')
    .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
    .max(PASSWORD_MAX_LENGTH, passwordMaxMessage),
});

/** What the client sends (before trimming and lowercasing). */
export type RegisterFormValues = z.input<typeof registerSchema>;
/** What the server works with after parsing. */
export type RegisterInput = z.output<typeof registerSchema>;

// AUTH-2: the login form and `POST /api/auth/login` body. The password policy (8+ characters)
// is not checked here: login only compares with the stored hash, and an old account must
// still be able to log in if the policy changes. The max length still protects Argon2id.
export const loginSchema = z.strictObject({
  email: emailField,
  // Not trimmed: spaces are valid password characters.
  password: requiredString('Password')
    .min(1, 'Password is required')
    .max(PASSWORD_MAX_LENGTH, passwordMaxMessage),
});

/** What the client sends (before trimming and lowercasing the email). */
export type LoginFormValues = z.input<typeof loginSchema>;
/** What the server works with after parsing. */
export type LoginInput = z.output<typeof loginSchema>;

// AUTH-2: one generic message for an unknown email and a wrong password (never say which).
export const INVALID_CREDENTIALS_MESSAGE = 'Email or password is incorrect';
export const LOGIN_RATE_LIMITED_MESSAGE = 'Too many failed login attempts. Try again later.';

// What the API returns for a user. A plain (stripping) object on purpose: parsing a full
// user row through it drops `passwordHash` and any other field, so the hash never leaks.
export const publicUserSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.string(),
});

export type PublicUser = z.infer<typeof publicUserSchema>;
