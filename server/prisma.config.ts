import { existsSync } from 'node:fs';

import { defineConfig } from 'prisma/config';

const LOCAL_ENV_FILE = '../.env';

if (existsSync(LOCAL_ENV_FILE)) {
  process.loadEnvFile(LOCAL_ENV_FILE);
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx --env-file-if-exists=../.env prisma/seed.ts',
  },
  datasource: {
    // Generating the client needs no database, so a missing URL must not stop it.
    url: process.env.DATABASE_URL ?? '',
  },
});
