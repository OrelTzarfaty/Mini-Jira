import { execSync } from 'node:child_process';

import { TEST_DATABASE_URL } from './test-database-url.js';

export default function migrateTestDatabase(): void {
  try {
    execSync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
      stdio: 'pipe',
    });
  } catch (error) {
    throw new Error('Could not prepare the test database. Start it with: npm run db:test:up', {
      cause: error,
    });
  }
}
