import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// The browser only talks to Vite, which forwards /api to the API. One origin keeps the
// SameSite auth cookie working without CORS tricks (docs/architecture.md §1).
const API_ORIGIN = 'http://localhost:3000';

// The API's CLIENT_ORIGIN (.env.example) expects this port, so never fall back to another one.
const DEV_SERVER_PORT = 5173;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // Reads the "@/*" alias from tsconfig.app.json, so it is defined in one place.
    tsconfigPaths: true,
  },
  server: {
    port: DEV_SERVER_PORT,
    strictPort: true,
    proxy: {
      '/api': API_ORIGIN,
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Undo vi.spyOn and vi.stubGlobal after every test, so tests stay independent.
    restoreMocks: true,
    unstubGlobals: true,
    // Vitest replaces CSS imports with empty strings. design-tokens.test.ts reads the design
    // tokens with "index.css?raw", so that one file keeps its text.
    css: { include: [/src\/styles\/index\.css/] },
  },
});
