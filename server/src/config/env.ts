import { z } from 'zod';

const isExactOrigin = (value: string): boolean =>
  URL.canParse(value) && new URL(value).origin === value;

// HS256 needs a key of at least 256 bits (RFC 7518 §3.2), so 32 characters is the floor.
const JWT_SECRET_MIN_LENGTH = 32;

const SECONDS_PER_UNIT = { s: 1, m: 60, h: 3_600, d: 86_400 } as const;
const MAX_SESSION_SECONDS = 365 * SECONDS_PER_UNIT.d;
const DURATION_PATTERN = /^(\d{1,6})([smhd])$/;

function isDurationUnit(unit: string): unit is keyof typeof SECONDS_PER_UNIT {
  return Object.hasOwn(SECONDS_PER_UNIT, unit);
}

/** "7d" → 604800. Returns 0 for anything that isn't a whole number followed by s, m, h or d. */
function durationToSeconds(value: string): number {
  const [, amount, unit] = DURATION_PATTERN.exec(value) ?? [];

  return amount && unit && isDurationUnit(unit) ? Number(amount) * SECONDS_PER_UNIT[unit] : 0;
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  CLIENT_ORIGIN: z.url().refine(isExactOrigin, {
    message: 'Must be an origin only, like http://localhost:5173',
  }),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  JWT_SECRET: z
    .string()
    .min(JWT_SECRET_MIN_LENGTH, `Must be at least ${String(JWT_SECRET_MIN_LENGTH)} characters`),
  // How long a login lasts, like "7d" or "12h". Parsed into seconds, so the token and the
  // cookie get exactly the same lifetime.
  JWT_EXPIRES_IN: z
    .string()
    .default('7d')
    .transform(durationToSeconds)
    .refine((seconds) => seconds > 0 && seconds <= MAX_SESSION_SECONDS, {
      message: 'Must be a duration from 1s to 365d, like 7d, 12h, 30m or 45s',
    }),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment variables: ${problems}`);
  }

  return result.data;
}
