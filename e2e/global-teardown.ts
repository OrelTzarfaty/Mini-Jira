import { stopStack } from './support/e2e-stack.js';

/**
 * Runs once after all tests: stops the E2E system, so it doesn't keep its ports and memory.
 * Its data is throwaway, and the HTML report keeps a trace of every failed test for debugging.
 */
export default function globalTeardown(): void {
  stopStack();
}
