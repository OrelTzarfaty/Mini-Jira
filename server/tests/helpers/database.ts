import { createPrismaClient } from '../../src/lib/prisma.js';
import { TEST_DATABASE_URL } from './test-database-url.js';

// Always the test database, so resetting can never touch development data.
export const testPrisma = createPrismaClient(TEST_DATABASE_URL);

export async function resetDatabase(): Promise<void> {
  const tables = await testPrisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `;

  if (tables.length === 0) {
    return;
  }

  // Table names can't be query parameters. These come from PostgreSQL itself, not from users.
  const tableNames = tables.map(({ tablename }) => `"${tablename}"`).join(', ');
  await testPrisma.$executeRawUnsafe(`TRUNCATE TABLE ${tableNames} RESTART IDENTITY CASCADE`);
}
