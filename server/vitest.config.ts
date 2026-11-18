import { defineConfig } from 'vitest/config';

const DATABASE_TESTS = 'tests/**/*.db.test.ts';

export default defineConfig({
  test: {
    // Database tests share one database, so test files run one at a time.
    fileParallelism: false,
    projects: [
      {
        test: {
          name: 'app',
          include: ['tests/**/*.test.ts'],
          exclude: [DATABASE_TESTS],
        },
      },
      {
        test: {
          name: 'database',
          include: [DATABASE_TESTS],
          globalSetup: ['tests/helpers/migrate-test-database.ts'],
        },
      },
    ],
  },
});
