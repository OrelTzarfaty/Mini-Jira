import { hashPassword } from '../src/lib/password.js';
import { createPrismaClient } from '../src/lib/prisma.js';

// Demo accounts for development and testing. This password is public on purpose:
// never use it for a real account.
const DEMO_PASSWORD = 'MiniJira-demo-2026';

const DEMO_USERS = [
  { name: 'Olivia Owner', email: 'owner@minijira.test' },
  { name: 'Max Member', email: 'member@minijira.test' },
  { name: 'Omar Outsider', email: 'outsider@minijira.test' },
];

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to seed the database');
}

const prisma = createPrismaClient(databaseUrl);

try {
  for (const user of DEMO_USERS) {
    const passwordHash = await hashPassword(DEMO_PASSWORD);

    // Existing accounts stay unchanged, so the seed is safe to run again.
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: { ...user, passwordHash },
    });
  }
} finally {
  await prisma.$disconnect();
}
