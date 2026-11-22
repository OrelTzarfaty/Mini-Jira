import { startStack } from './support/e2e-stack.js';

/** Runs once before all tests: builds and starts the E2E system. */
export default function globalSetup(): void {
  startStack();
}
