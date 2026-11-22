# Mini-Jira

A lightweight task board for small teams: create projects, add teammates, track tickets on a drag-and-drop board, and discuss work with comments and activity history.

> **Status:** in development. Planning is complete, and the project foundations are being built.

## Tech stack

| Area     | Technology                                                |
| -------- | --------------------------------------------------------- |
| Frontend | React, TypeScript, Vite, Tailwind CSS, shadcn/ui          |
| Backend  | Node.js, Express, TypeScript                              |
| Database | PostgreSQL, Prisma                                        |
| Testing  | Vitest, Supertest, React Testing Library, MSW, Playwright |
| Tooling  | npm workspaces, ESLint, Prettier                          |

## Project structure

```text
shared/   Validation rules, types, and error codes used by the server and client
server/   REST API
client/   React web app
e2e/      End-to-end tests
docs/     Architecture, backlog, design doc, standards, and wireframes
```

## Getting started

You need [Node.js 26](https://nodejs.org/), npm, and [Docker Desktop](https://www.docker.com/products/docker-desktop/).

```bash
npm ci
cp .env.example .env
npm run db:up
npm run db:migrate
npm run db:seed
npm run dev --workspace @mini-jira/server
```

The API runs at `http://localhost:3000`, and its documentation is at [`/api/docs`](http://localhost:3000/api/docs).

In a second terminal, start the web app:

```bash
npm run dev --workspace @mini-jira/client
```

Open `http://localhost:5173`. The web app forwards `/api` requests to the API, so keep both running.

### Run the whole system with Docker

To run the production build of everything (web app, API, and database) in Docker:

```bash
cp .env.example .env
docker compose up --build
```

Open `http://localhost:8080`. The API documentation is at [`/api/docs`](http://localhost:8080/api/docs). The API applies database changes when it starts. To add the demo accounts, run `npm ci` (once) and `npm run db:seed` in a second terminal after the app has started. Stop everything with `docker compose down`.

## Commands

| Command                                     | What it does                                                |
| ------------------------------------------- | ----------------------------------------------------------- |
| `npm start`                                 | Builds and runs the production API                          |
| `npm run dev --workspace @mini-jira/client` | Runs the web app with live reload                           |
| `npm run db:up`                             | Starts the development database                             |
| `npm run db:down`                           | Stops the database and the other Docker services            |
| `npm run db:migrate`                        | Applies database changes                                    |
| `npm run db:seed`                           | Adds the demo accounts                                      |
| `npm run lint`                              | Checks the code for problems                                |
| `npm run lint:fix`                          | Fixes the problems that can be automated                    |
| `npm run format`                            | Formats the code                                            |
| `npm run format:check`                      | Checks the code formatting                                  |
| `npm run typecheck`                         | Checks TypeScript types                                     |
| `npm test`                                  | Runs the tests                                              |
| `npm run build`                             | Builds every workspace                                      |
| `docker compose up --build`                 | Builds and runs the whole system at `http://localhost:8080` |
| `docker compose down`                       | Stops the whole system (the data is kept)                   |

## Continuous integration

GitHub Actions runs the checks in [`.github/workflows/ci.yml`](.github/workflows/ci.yml) on every pull request into `dev` or `main` and on every push to them: install, dependency audit, lint, type check, build, format check, and the tests. The tests use the same PostgreSQL test database (`docker-compose.test.yml`) as `npm test` on your computer.

## Documentation

- [Requirements](mini-jira-requirements.md)
- [Architecture](docs/architecture.md)
- [Design doc](docs/design-doc.md)
- [Engineering standards](docs/engineering-standards.md)
- [Backlog](docs/backlog.md)
- [Wireframes](docs/wireframes/README.md)
- [Design system](DESIGN.md) and [product context](PRODUCT.md)
