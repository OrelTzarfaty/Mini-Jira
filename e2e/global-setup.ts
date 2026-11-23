import { seedDatabase, startFreshStack } from './support/e2e-stack.js';

/**
 * Runs once before all tests: a fresh E2E system with an empty database (the reset), then the
 * demo accounts (the seed). Every run starts from the same known data.
 */
export default function globalSetup(): void {
  startFreshStack();
  seedDatabase();
}
