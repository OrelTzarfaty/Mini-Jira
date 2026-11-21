import { setupServer } from 'msw/node';

// The mocked API for component tests. Each test describes the responses it needs with
// server.use(...), so the network stays visible in the test itself.
export const server = setupServer();
