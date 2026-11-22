# Mini-Jira

A lightweight team task board: projects, members, tickets, a drag-and-drop board, comments, and activity history. This is a junior full-stack learning project (~8 weeks).

- **Requirements:** [mini-jira-requirements.md](mini-jira-requirements.md) (full path: `C:\Users\orel\OneDrive\Desktop\MiniJira Project\mini-jira-requirements.md`) is the source of truth for project information. Read it before any non-trivial task. Refer to requirement IDs (`AUTH-1`, `TKT-4`, `CON-1`, …) in code, tests, commits, and PRs.
- **Architecture:** [docs/architecture.md](docs/architecture.md) — the agreed architecture and design decisions.
- **Engineering standards:** [docs/engineering-standards.md](docs/engineering-standards.md) — **mandatory** rules for all code: clean code, DRY, SOLID, design patterns, security, testing, Git. Read it before writing or reviewing code.
- **Backlog:** [docs/backlog.md](docs/backlog.md) — epics → stories → tasks, sprint plan, task owners. Work on stories in sprint order and respect each story's "Depends on". Live missions: [GitHub Project](https://github.com/users/OrelTzarfaty/projects/1).
- **Design doc:** [docs/design-doc.md](docs/design-doc.md) — ready for mentor review. The 8 answers are the user's **own words**; don't rewrite them (if they need changes, help the user understand, then lightly fix grammar while keeping their meaning).

## Ground rule: be sure or ask

- Only change something when you are **100% sure** the change is correct.
- If you are not sure about anything (a requirement, a decision, existing code, the API contract, or these instructions), **stop and ask the user** instead of guessing or assuming.
- If something in the requirements, this file, or the code looks wrong or contradictory, don't silently "fix" it. Point it out and ask.

## Stack

| Layer | Decision | Status |
|---|---|---|
| Backend | Node.js LTS (v26) + TypeScript + **Express 5** | Decided |
| Database | **PostgreSQL 18** in Docker, schema changes only through migrations | Decided |
| Frontend | **React** + TypeScript + Vite (replaces the Angular named in the requirements) | Decided — the owner chose to keep building while the mentor confirms |
| DB access library | **Prisma 7** (schema, migrations, typed queries) | Decided — temporary npm `overrides` entry in the root `package.json` pins `effect` (used by `@prisma/config`) to 3.22.5 because of GHSA-7589-6fvf-x4pw; remove it once Prisma ships a fixed `@prisma/config` |
| Auth session | **JWT in an HTTP-only cookie** (`SameSite=Lax`) + `origin-check` middleware against CSRF | Decided |
| Password hashing | **Argon2id** | Decided |
| Styling | **Tailwind CSS + shadcn/ui** (Radix primitives); light-theme tokens and the self-hosted **Instrument Sans** font, recorded in [DESIGN.md](DESIGN.md) | Decided; visual direction approved by the owner on 2026-11-21 (SETUP-6) |
| Repo layout | **npm workspaces**: `shared/`, `server/`, `client/`, `e2e/` · GitHub: [OrelTzarfaty/Mini-Jira](https://github.com/OrelTzarfaty/Mini-Jira) | Decided |
| Code quality | **TypeScript 6.0** (typescript-eslint doesn't support 7 yet), ESLint, Prettier | Decided |
| Infra | Docker Compose (client, API, DB), GitHub Actions CI (lint, test, build) | Decided — Compose in SETUP-7, CI in SETUP-8 |
| Deployment target | e.g. Render / Railway / Fly.io | **Open** (week 8) |

**Open decisions are the user's to make.** Don't pick one silently — propose options with trade-offs and ask. When a decision is made, move it to "Decided" here.

## Architecture

Full details: **[docs/architecture.md](docs/architecture.md)** (v1, confirmed). Read it before structural work. Summary:

- **System:** React SPA → nginx (Docker) / Vite (dev) on one origin → `/api` → Express → Prisma → PostgreSQL.
- **Workspaces:** `shared/` (zod schemas, enums, error codes, API types — no runtime deps on server/client), `server/`, `client/`, `e2e/`.
- **Backend layers:** routes → controller → service → Prisma. Controllers never touch Prisma; services never touch `req`/`res`.
- **Frontend:** feature folders (`client/src/features/*`), one API client (`client/src/api`), TanStack Query for server state, URL for list filters, no global store.
- **Authorization:** `requireAuth` → `loadProjectAccess` (non-member → 404) → `requireOwner` (→ 403) + service rules (reporter/owner delete, comment author). All ticket queries scoped by project.

Design decisions (design-doc §8):

| Topic | Decision |
|---|---|
| Ticket keys | Atomic `ticketCounter` increment on the project row in a transaction; never reused |
| Card order | Fractional `rank` string per status column; one row updated per move |
| Conflict detection (CON-1) | Conditional update on `updatedAt` (`timestamp(3)`, ms precision) → `409 EDIT_CONFLICT` |
| Activity log | Written in the same transaction as the ticket change |
| Delete | Hard delete with cascades |

Confirmed defaults (architecture §11, confirmed 2026-11-17):
- Project key can't be changed after creation.
- Board drag/reorder doesn't use the conflict check ("last move wins"); only the edit form returns 409.
- Non-members get **404**; members without rights get **403**.
- Register logs the user in.
- Board returns up to 50 cards per column, with "load more" per column.
- Auth cookie lasts 7 days, no refresh token.
- Deployment target: chosen in week 8.
- Failed logins are limited per email + IP and per IP.
- Every drag has a click/tap alternative: card `⋯` menu with Move to, Move up, Move down.

**Pending the mentor's OK:** an optional ticket **Estimate** (`estimateMinutes`, shown as `30m` / `4h` / `2d`, 1d = 8h; no time-spent logging). The requirements list "time tracking" as out of scope, so it's confirmed or dropped at the week-1 review (backlog DOC-5).

**Screen designs:** [docs/wireframes/](docs/wireframes/) — follow them when building UI.

**Visual system:** [DESIGN.md](DESIGN.md) (colors, type, spacing, focus ring, component rules) is the visual source of truth next to the wireframes; [PRODUCT.md](PRODUCT.md) is the product context the design skills read. Tokens live in `client/src/styles/index.css`, and `design-tokens.test.ts` guards their contrast.

## API

Conventions (from the requirements):
- RESTful, resource-based URLs, correct methods and status codes, documented with OpenAPI/Swagger in the running app.
- Every endpoint checks authentication **and** project-level authorization. Non-members get `403`/`404`, never data.
- All list endpoints are paginated (page size 20); sorting and filtering happen on the server.
- Stale ticket updates return `409 Conflict`.
- One error format everywhere, never stack traces:
  ```json
  { "error": { "code": "VALIDATION_ERROR", "message": "Title is required", "details": [{ "field": "title", "message": "Required" }] } }
  ```

Endpoints so far (full details in Swagger at `/api/docs`):

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/health` | Check that the API is running |
| `GET` | `/api/openapi.json` | The OpenAPI description of the API |
| `GET` | `/api/docs` | Swagger UI |

## Features

Summary only — task-level status lives in [docs/backlog.md](docs/backlog.md).

| Area | IDs | Priority | Status |
|---|---|---|---|
| Authentication | AUTH-1..4 | P0 | Not started |
| Projects & members | PRJ-1..6 | P0 | Not started |
| Tickets | TKT-1..5 | P0 | Not started |
| Board | BRD-1..4 | P0 | Not started |
| Comments & activity | CMT-1..2, ACT-1 | P1 | Not started |
| List, search, pagination | LST-1..4 | P1 | Not started |
| My Work | MY-1 | P1 | Not started |
| Concurrent edits | CON-1 | P1 | Not started |

Out of scope unless the user asks: email, password reset, attachments, OAuth, sprints, time tracking, custom workflows.

## Agent team

Agents live in `.claude/agents/`:
- **`backend-developer`** — Express API, PostgreSQL schema/migrations, auth, permissions, validation, seed script, backend tests.
- **`frontend-developer`** — React client, board, forms, states, accessibility, frontend tests. Uses the design skills below.
- **`qa-engineer`** — verifies acceptance criteria, writes API and E2E tests, reports bugs. Does not change app code.

**Every mission uses the agents:**
1. `backend-developer` does all `BE` tasks, and `frontend-developer` does all `FE` tasks.
2. The pull request is opened into `dev`.
3. **QA check (required):** `qa-engineer` tests the final commit of **every** pull request and gives a **PASS** or **FAIL** verdict. Three levels (the owner's decision, 2026-11-22, to save usage):
   - **Light:** a pull request that changes only Markdown files. CI result, a line-by-line content review, and a security review of agent instruction files.
   - **Standard:** most code pull requests. Tests only that pull request's change, with a browser pass only for UI changes.
   - **Full:** every **5th** code pull request into `dev` (counted with the `qa:standard` / `qa:full` labels), or whenever the owner asks. Tests **the whole app** from a clean `docker compose up`.
4. On **FAIL**, the owning agent fixes the root cause and `qa-engineer` re-checks **only the fix**. The same applies to a finding fixed after a PASS.
5. A pull request is merged only after a QA **PASS** on its final commit **and** the project owner's approval.

**Browser checks:** `frontend-developer` and `qa-engineer` use the **Chrome DevTools MCP** (`chrome-devtools`, configured in the user's Claude settings, not in this repo) to check features in a real browser: console and network errors, multi-user scenarios via isolated contexts, phone width, slow/offline network, and Lighthouse accessibility. Only local URLs and seed test accounts. QA screenshots go in `qa-evidence/` (not committed).

**E2E testing (Playwright):** `qa-engineer` writes, runs, and heals the Playwright E2E tests with the **`playwright-cli` skill** (`.claude/skills/playwright-cli`; CLI installed globally via `npm install -g @playwright/cli`), and explores features interactively with the **Playwright MCP** (`playwright`, user settings, runs with `--isolated`). Tests live in `e2e/tests/` and run with `npm run test:e2e` against their own copy of the system (ports 8180 and 5434, in-memory database), so the run never touches development data. Playwright output folders (`.playwright/`, `.playwright-cli/`, `test-results/`, `playwright-report/`, `blob-report/`) are not committed.

## Design skills

Installed locally in `.claude/skills/` (about 40 MB, not committed to git): `design-taste-frontend` (visual direction; installed without its hook), `impeccable` (app UI design and review), `emil-design-eng` (interaction polish). An Impeccable design-check hook runs after file edits (`.claude/settings.json`). Impeccable reads `PRODUCT.md` and `DESIGN.md` from the repo root.

## Working rules

- Follow [docs/engineering-standards.md](docs/engineering-standards.md), and complete its §12 checklist before saying work is done.
- **Missions:** one backlog story = one mission = one GitHub issue, one branch (`feat/AUTH-1-register`), and one PR into `dev`. Each task = one commit. `dev` merges into `main` at the end of each sprint. CI must be green. Run a whole mission with `/mission <STORY-ID>` (for example `/mission AUTH-1`); it stops for approval, and merges only after the owner says yes.
- Definition of Done: acceptance criteria met, server-side validation and permission checks, tests for the main path and at least one failure path, loading/empty/error states, API docs updated.
- Secrets only in environment variables; commit `.env.example`, never `.env`.
- This is a learning project: explain **why** behind design decisions so the user can defend them in the design doc and demo.

## Commands

Run from the repo root (Node.js 26 and a running Docker Desktop required):

| Command | Purpose |
|---|---|
| `/mission <STORY-ID>` (type it in Claude Code, not a terminal) | Run a whole mission with the agents, from branch to QA-tested pull request |
| `npm ci` | Install dependencies from the lockfile |
| `cp .env.example .env` | Create local settings (first time only) |
| `npm run db:up` / `npm run db:down` | Start the development database / stop every `docker-compose.yml` service (also `api` and `client` if they run) |
| `npm run db:migrate` | Apply migrations, or create one after changing `schema.prisma` |
| `npm run db:seed` | Add the demo accounts (password documented in `server/prisma/seed.ts`) |
| `npm run dev --workspace @mini-jira/server` | Run the API at `http://localhost:3000` and restart it on changes |
| `npm run dev --workspace @mini-jira/client` | Run the web app at `http://localhost:5173` (builds `shared` first); it forwards `/api` to the API, so run both |
| `npm start` | Build `shared` and `server`, then run the production version of the API |
| `npm run lint` / `npm run lint:fix` | Check code with ESLint / apply automatic fixes |
| `npm run format` / `npm run format:check` | Format code with Prettier / check formatting |
| `npm run typecheck` | Type-check every workspace that has a `typecheck` script |
| `npm test` | Prepare the code, start the test database, and run all unit and integration tests (not E2E) |
| `npm run db:test:down` | Stop the test database |
| `npx playwright install chromium` | Download the browser for the E2E tests (first time, and after a Playwright update) |
| `npm run test:e2e` | Run the Playwright E2E tests: build and start a separate copy of the whole system (`docker-compose.e2e.yml`, project `minijira-e2e`, app at `http://localhost:8180`, db on port 5434), reset and seed its database, run the tests, then stop it. Report in `e2e/playwright-report/` |
| `npm run build` | Build every workspace that has a `build` script |
| `docker compose up --build` | Build and run the whole system (`client`, `api`, `db`) at `http://localhost:8080`, Swagger at `/api/docs`; add `--detach --wait` to run it in the background |
| `docker compose down` | Stop the whole system (the database volume is kept) |

Run `npm run build` after changing `shared/`, because other workspaces import its built files.

**shadcn/ui components:** add them from `client/` with `npx shadcn@4.23.0 add <name>` (set `npm_config_save_exact=true` so new packages are pinned, and don't overwrite files we changed). Then run `npm run format` and give each component function a return type (standards §5). The shadcn CSS lives in `client/src/styles/shadcn.css` (inlined with `shadcn eject`), so the `shadcn` package is not a dependency.

**CI:** [.github/workflows/ci.yml](.github/workflows/ci.yml) runs on every PR into `dev` or `main` and on every push to them, in two jobs. `checks` (keep the name; branch protection uses it): `npm ci` → `npm audit --audit-level=high` → `lint` → `typecheck` → `build` → `format:check` → `npm test` (same Compose test database as locally). `e2e`, next to it: `npm ci` → Playwright Chromium → `npm run test:e2e`; when it fails, it uploads the Playwright HTML report (traces, screenshots) as an artifact. Pin every action to a full commit SHA with a version comment, and check workflow changes with `actionlint`.

**Branch protection:** `main` accepts changes only through a pull request, and `checks` (from GitHub Actions) must pass; the rules apply to admins too. `dev` blocks force-push and deletion only, so approved merges are pushed to it directly (see `/mission` step 7).

**Full system (Docker):** after `cp .env.example .env`, `docker compose up --build` builds the images (`server/Dockerfile`, `client/Dockerfile`, build context = repo root) and serves the app at `http://localhost:8080`. nginx in `client` forwards `/api` to `api`, whose port isn't published. The `api` container runs `prisma migrate deploy` on start (so `prisma` is a server **dependency**, not a devDependency) and takes its settings from `docker-compose.yml`, not from the dev values in `.env`; only `POSTGRES_*` and `LOG_LEVEL` come from `.env`. It uses the same `db` service and volume as local development, so `npm run db:seed` (run on your computer) adds the demo data to it, and `npm run dev` can run at the same time.

## Keeping this file up to date

**This file must stay current.** Whenever you (main session or any agent):
- change the **architecture** or make a stack decision → update **Stack** / **Architecture**
- add or change an **API endpoint**, contract, or convention → update **API**
- start or finish a **feature** → update its row in **Features**
- add a command, script, or setup step → update **Commands**
- finish a backlog task → tick its box in **[docs/backlog.md](docs/backlog.md)** and update the story's status line

…update this file in the same change, and mention it in your report. Keep it short — summaries and pointers, not full documentation.
