# Mini-Jira

A lightweight task board for small teams: create projects, add teammates, track tickets on a drag-and-drop board, and discuss work with comments and activity history.

> **Status:** in development. Planning is complete, and the project foundations are being built.

## Tech stack

| Area     | Technology                                       |
| -------- | ------------------------------------------------ |
| Frontend | React, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Backend  | Node.js, Express, TypeScript                     |
| Database | PostgreSQL, Prisma                               |
| Testing  | Vitest, Supertest, Playwright                    |
| Tooling  | npm workspaces, ESLint, Prettier                 |

## Project structure

```text
shared/   Validation rules, types, and error codes used by the server and client
server/   REST API
client/   React web app
e2e/      End-to-end tests
docs/     Architecture, backlog, design doc, standards, and wireframes
```

## Getting started

You need [Node.js 26](https://nodejs.org/) and npm.

```bash
npm ci
```

## Commands

| Command                | What it does                             |
| ---------------------- | ---------------------------------------- |
| `npm run lint`         | Checks the code for problems             |
| `npm run lint:fix`     | Fixes the problems that can be automated |
| `npm run format`       | Formats the code                         |
| `npm run format:check` | Checks the code formatting               |
| `npm run typecheck`    | Checks TypeScript types                  |
| `npm test`             | Runs the tests                           |
| `npm run build`        | Builds every workspace                   |

## Documentation

- [Requirements](mini-jira-requirements.md)
- [Architecture](docs/architecture.md)
- [Design doc](docs/design-doc.md)
- [Engineering standards](docs/engineering-standards.md)
- [Backlog](docs/backlog.md)
- [Wireframes](docs/wireframes/README.md)
