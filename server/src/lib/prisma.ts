import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../generated/prisma/client.js';

// The pg driver waits forever by default, so a database that never answers would hang the API.
const CONNECTION_TIMEOUT_MS = 5_000;

export function createPrismaClient(connectionString: string): PrismaClient {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString, connectionTimeoutMillis: CONNECTION_TIMEOUT_MS }),
  });
}
