import eslint from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import eslintConfigPrettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import { reactRefresh } from 'eslint-plugin-react-refresh';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  globalIgnores([
    '**/node_modules/',
    '**/dist/',
    '**/build/',
    '**/generated/',
    '**/coverage/',
    '**/test-results/',
    '**/playwright-report/',
    '**/blob-report/',
    '.claude/',
    '**/.playwright/',
    '**/.playwright-cli/',
    'qa-evidence/',
  ]),

  eslint.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  tseslint.configs.stylisticTypeChecked,

  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // Rules from docs/engineering-standards.md §5.
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      eqeqeq: ['error', 'always'],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
    },
  },

  // The server logs through pino (docs/engineering-standards.md §6.6).
  {
    files: ['server/**/*.ts'],
    rules: {
      'no-console': 'error',
    },
  },

  // The Rules of React (docs/engineering-standards.md §8.1), and component files that
  // keep Vite's Fast Refresh working.
  {
    files: ['client/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended, reactRefresh.configs.vite()],
  },

  // JavaScript config files have no TypeScript type information.
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [tseslint.configs.disableTypeChecked],
  },

  eslintConfigPrettier,

  // An empty line before every return (docs/engineering-standards.md §3.2).
  {
    plugins: { '@stylistic': stylistic },
    rules: {
      '@stylistic/padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: '*', next: 'return' },
      ],
    },
  },
);
