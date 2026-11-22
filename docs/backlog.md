# Mini-Jira — Backlog

**Version:** v1.1 · 2026-11-18 (tasks split to about one day of work or less)
**Built from:** [mini-jira-requirements.md](../mini-jira-requirements.md) (stories and acceptance criteria) and [architecture.md](architecture.md) (how each story is built).

## How to use this backlog

- **Epics → stories → tasks.** Functional stories keep their requirement IDs (`AUTH-1`, `TKT-4`, …). Enabler stories use `DOC-`, `SETUP-`, `HARD-`, `SHIP-`.
- **Task owners:** `BE` = backend-developer · `FE` = frontend-developer · `QA` = qa-engineer · `Claude` = the main Claude Code session · `You` = the project owner.
- **Task size rule:** every task should take **about one day of work or less**. If a task turns out bigger, split it before starting.
- **Story size** is relative effort, not hours: **S** small · **M** medium · **L** large.
- **Status:** tick a task's box when it's merged; a story is done when all its boxes are ticked **and** it meets the Definition of Done. Also update the story's status line and the Features table in `CLAUDE.md`.
- **Missions:** each story is one **mission**: one GitHub issue, one branch (`feat/AUTH-1-register`), and one pull request into `dev`. Each task is one commit. Put the story ID in the PR title. At the end of each sprint, `dev` merges into `main`.
- **Full acceptance criteria** live in the requirements doc. The criteria below add what the architecture decided.

**Definition of Done (every story):** acceptance criteria met · server-side validation and permission checks · tests for the main path and at least one failure path · loading / empty / error states in the UI · API docs (Swagger) updated · merged through a reviewed PR with CI green.

## Sprint plan

One sprint = one week, following the milestones in the requirements (§7).

| Sprint | Week | Goal | Stories |
|---|---|---|---|
| 1 | 1 | **Planning & design** ⛔ mentor review before coding | DOC-1 … DOC-5 |
| 2 | 2 | **Foundations + auth** | SETUP-1 … SETUP-11, AUTH-1 … AUTH-4 |
| 3 | 3 | **Projects & members** | PRJ-1, PRJ-2, PRJ-6, PRJ-3, PRJ-4, PRJ-5 |
| 4 | 4 | **Tickets + board view** | TKT-1 … TKT-5, BRD-1 |
| 5 | 5 | **Board interactions** | BRD-2, BRD-3, BRD-4 |
| 6 | 6 | **Collaboration + list + My Work** | CMT-1, CMT-2, ACT-1, LST-1 … LST-4, MY-1 |
| 7 | 7 | **Hardening** | CON-1, HARD-1 … HARD-5 |
| 8 | 8 | **Ship** | SHIP-1 … SHIP-3 |

Sprint 2 is the heaviest. If it overflows, move AUTH-3 and AUTH-4 to the start of sprint 3.

---

## E0 · Planning & design — Sprint 1

### DOC-1 · Architecture and design decisions
Sprint 1 · Size M · **Status: Done**
- [x] You + Claude · Decide stack, repo layout, auth, and the 8 design-doc mechanisms
- [x] Claude · Write [architecture.md](architecture.md) (diagrams, data model, API, key flows)

### DOC-2 · Backlog
Sprint 1 · Size M · Status: In progress
- [x] Claude · Break the requirements into epics, stories, and tasks (this file)
- [x] Claude · Split tasks to about one day each; fix ordering mistakes (v1.1)
- [ ] You · Review the backlog and sprint plan; adjust sizes
- [x] Claude · Create the 50 missions as GitHub issues on the [GitHub Project](https://github.com/users/OrelTzarfaty/projects/1) — required by the milestone

### DOC-3 · Wireframes
Sprint 1 · Size M · **Status: Done** (all 7 approved 2026-11-18 — index: [wireframes/README.md](wireframes/README.md))
Text wireframes saved in `docs/wireframes/`, drawn by Claude from the owner's descriptions and approved by the owner.
- [x] You + Claude · Landing page + Log in / Register popups — [01-landing-and-login.md](wireframes/01-landing-and-login.md)
- [x] You + Claude · My Projects + project dropdown (with the empty state and "Create project") — [02-my-projects.md](wireframes/02-my-projects.md)
- [x] You + Claude · Board — desktop and phone width — [03-board.md](wireframes/03-board.md)
- [x] You + Claude · Ticket detail (fields, comments, activity) — [04-ticket.md](wireframes/04-ticket.md)
- [x] You + Claude · List view (table, filters, pagination) — [05-list.md](wireframes/05-list.md)
- [x] You + Claude · Project settings (edit, members, delete) — [06-settings.md](wireframes/06-settings.md)
- [x] You + Claude · My Work (swimlanes) — [07-my-work.md](wireframes/07-my-work.md)

### DOC-4 · Design doc
Sprint 1 · Size M · **Status: Done** — [design-doc.md](design-doc.md)
- [x] Claude · Template: overview, architecture diagram, ERD, the 8 questions with hints
- [x] You · Answer the 8 questions in your own words (Q1 … Q8)
- [x] You + Claude · Fill in your name; delete the hints when done

### DOC-5 · Mentor review
Sprint 1 · Size S · Status: To do
- [ ] You · Review backlog, architecture, wireframes, and design doc with the mentor
- [ ] You · Confirm with the mentor that React replaces Angular
- [ ] You · Confirm the optional ticket **Estimate** field (time tracking is out of scope in the requirements); if not approved, remove its tasks below
- [ ] You · Apply the feedback (update architecture.md, this backlog, and CLAUDE.md)

---

## E1 · Foundations — Sprint 2

### SETUP-1 · Repository and workspaces
Sprint 2 · Size M · **Status: Done** — merged into `dev` in [#43](https://github.com/OrelTzarfaty/Mini-Jira/pull/43); `main` protected on 2026-11-19
- [x] You · Create the public GitHub repo: [OrelTzarfaty/Mini-Jira](https://github.com/OrelTzarfaty/Mini-Jira)
- [x] BE · `git init` and connect the local project to GitHub
- [x] You · Protect `main` (PRs only)
- [x] BE · Root `package.json` with npm workspaces (`shared`, `server`, `client`, `e2e`)
- [x] BE · Base `tsconfig` shared by all workspaces (strict settings from [engineering standards §5](engineering-standards.md))
- [x] BE · ESLint (`typescript-eslint` `recommendedTypeChecked` + `stylisticTypeChecked`) + Prettier, and root scripts (`lint`, `format`, `typecheck`, `test`, `build`)
- [x] BE · `.gitignore`: `node_modules`, `.env`, `dist`, `.playwright/`, `.playwright-cli/`, `test-results/`, `playwright-report/`, `qa-evidence/`
- [x] BE · README skeleton
- [x] BE · PR template with the Definition of Done and the standards checklist (engineering standards §12)

### SETUP-2 · Shared package
Sprint 2 · Size S · **Status: Done** — merged into `dev` in [#52](https://github.com/OrelTzarfaty/Mini-Jira/pull/52) · Depends on SETUP-1
- [x] BE · `@mini-jira/shared`: enums (TicketType, Priority, Status, Role)
- [x] BE · Error codes and the error response type (architecture §9)
- [x] BE · `Page<T>` type and pagination query schema
- [x] BE · Build setup so `server` and `client` can import it

### SETUP-3 · Server skeleton
Sprint 2 · Size M · **Status: Done** — merged into `dev` in [#53](https://github.com/OrelTzarfaty/Mini-Jira/pull/53) · Depends on SETUP-2
- [x] BE · `app.ts` / `server.ts` with `GET /api/health`
- [x] BE · Env validation with zod (`config/env.ts`); fail fast on missing variables
- [x] BE · Request ID middleware + pino-http logging (request ID on every log line and in `X-Request-Id`)
- [x] BE · Security middleware: helmet, CORS allowlist, JSON size limit, cookie-parser, `trust proxy` for nginx
- [x] BE · `origin-check` middleware: reject cross-site `POST`/`PATCH`/`PUT`/`DELETE` with 403 (architecture §7)
- [x] BE · Central error handler (standard format, no stack traces) + 404 handler
- [x] BE · Graceful shutdown on `SIGTERM`; log and exit on unhandled errors (engineering standards §6.4)
- [x] BE · OpenAPI spec generated from the shared zod schemas (`/api/openapi.json`)
- [x] BE · Swagger UI at `/api/docs`
- [x] QA · Integration tests: health, unknown route → 404 in the standard format, thrown error → 500 without a stack trace
- [x] QA · Integration tests: cross-site `POST` → 403, same-origin `POST` is allowed

### SETUP-4 · Database
Sprint 2 · Size M · **Status: Done** — merged into `dev` in [#55](https://github.com/OrelTzarfaty/Mini-Jira/pull/55) and [#58](https://github.com/OrelTzarfaty/Mini-Jira/pull/58); `effect` security pin in [#65](https://github.com/OrelTzarfaty/Mini-Jira/pull/65) · Depends on SETUP-3
- [x] BE · Prisma setup + PostgreSQL container for development
- [x] BE · Separate test database + helper that resets it per test file
- [x] BE · First migration: `User` table (each later epic adds its own tables)
- [x] BE · `prisma/seed.ts` skeleton with demo users (test passwords only, documented in the seed file)

### SETUP-5 · Client skeleton
Sprint 2 · Size L · **Status: Done** — merged into `dev` in [#61](https://github.com/OrelTzarfaty/Mini-Jira/pull/61) · Depends on SETUP-2
- [x] FE · Vite + React + TypeScript in `client/`; Vite proxy `/api` → API
- [x] FE · Tailwind CSS setup
- [x] FE · shadcn/ui init + first components (Button, Input, Dialog)
- [x] FE · Router with all routes from architecture §5.2 as placeholder pages (the login guard comes in AUTH-4)
- [x] FE · TanStack Query provider
- [x] FE · `api/client.ts`: fetch wrapper with `credentials: 'include'` and error-format parsing
- [x] FE · `api/client.ts`: on 401, redirect to `/login`
- [x] FE · App shell: top navigation and page layout
- [x] FE · State components: EmptyState, ErrorState, PageSkeleton
- [x] FE · ConfirmDialog and Avatar (initials) components
- [x] FE · Vitest + React Testing Library + MSW setup with one example test

### SETUP-6 · Design system
Sprint 2 · Size S · **Status: Done** — merged into `dev` in [#67](https://github.com/OrelTzarfaty/Mini-Jira/pull/67); visual direction approved by the owner on 2026-11-21 · Depends on SETUP-5, DOC-3
- [x] FE · Run `/impeccable init` to create `PRODUCT.md` and `DESIGN.md`
- [x] FE · Use the Taste skill to choose typography, colors, and spacing → Tailwind tokens (base already decided: **light theme, white main color, navy accent** — see `docs/wireframes/01-landing-and-login.md`)
- [x] You · Approve the visual direction

### SETUP-7 · Docker Compose
Sprint 2 · Size M · **Status: Done** — merged into `dev` in [#70](https://github.com/OrelTzarfaty/Mini-Jira/pull/70) · Depends on SETUP-3, SETUP-4, SETUP-5
- [x] BE · API Dockerfile; runs `prisma migrate deploy` on start
- [x] FE · Client Dockerfile: build the SPA and serve it with nginx
- [x] FE · nginx config: proxy `/api` → `api`, fall back to `index.html` for SPA routes
- [x] BE · `docker-compose.yml` with `client`, `api`, `db`
- [x] BE · `.env.example` with every environment variable
- [x] QA · Verify `docker compose up` from a clean state: app loads, `/api/health` OK, `/api/docs` reachable

### SETUP-8 · CI
Sprint 2 · Size S · **Status: Done** — merged into `dev` in [#59](https://github.com/OrelTzarfaty/Mini-Jira/pull/59) · Depends on SETUP-1
- [x] BE · GitHub Actions workflow on every PR: `npm ci` → `npm audit --audit-level=high` → lint → typecheck → build
- [x] BE · Add tests to CI against the Docker Compose test database (`docker-compose.test.yml`, the same one local runs use)
- [x] You · Make CI required for merging into `main`

### SETUP-9 · E2E workspace
Sprint 2 · Size M · **Status: Done** — merged into `dev` in [#73](https://github.com/OrelTzarfaty/Mini-Jira/pull/73) · Depends on SETUP-7
- [x] QA · Playwright config in `e2e/`, running against `docker compose`
- [x] QA · Seed/reset the database before the E2E run
- [x] QA · First smoke test: the app loads and the login page renders
- [x] QA · Add the E2E job to CI
- (Login fixtures per role come in AUTH-2, once login exists.)

### SETUP-10 · Mission command
Sprint 2 · Size S · **Status: Done** — merged into `dev` in [#57](https://github.com/OrelTzarfaty/Mini-Jira/pull/57) · Depends on SETUP-1
- [x] Claude · `/mission <STORY-ID>` command: runs a mission from a new branch to a QA-tested pull request, then stops for approval
- [x] QA · Review the command against the project rules

### SETUP-11 · QA levels
Sprint 2 · Size S · **Status: Done** — merged into `dev` in [#63](https://github.com/OrelTzarfaty/Mini-Jira/pull/63); lean agents and QA in [#68](https://github.com/OrelTzarfaty/Mini-Jira/pull/68) · Depends on SETUP-10
- [x] Claude · Light QA for pull requests that change only Markdown files, full QA for all others (`qa-engineer`, `/mission`, `CLAUDE.md`, engineering standards §11)
- [x] QA · Review the change against the project rules
- Follow-up (owner's decision, 2026-11-22): three QA levels — light, standard, and a full check of the whole app every 5th code PR — on branch `chore/SETUP-11-qa-every-5th-pr` ([#71](https://github.com/OrelTzarfaty/Mini-Jira/pull/71))

---

## E2 · Authentication — Sprint 2

### AUTH-1 · Register
Sprint 2 · Size M · Status: In progress — merged into `dev` in [#72](https://github.com/OrelTzarfaty/Mini-Jira/pull/72) except the E2E test · Depends on SETUP-4, SETUP-5
AC (extra): email stored lowercase · `409 EMAIL_TAKEN` · register logs the user in and lands on My Projects.
- [x] BE · Shared `registerSchema` (name, email, password 8–128 characters)
- [x] BE · `lib/auth-cookie.ts`: sign/verify the JWT (algorithm pinned to `HS256`) and set/clear the cookie (`httpOnly`, `sameSite: lax`, `secure` in production, 7 days) — reused by login and logout
- [x] BE · Register service: lowercase email, unique check (`409 EMAIL_TAKEN`), **Argon2id** hash
- [x] BE · `POST /api/auth/register` route + controller: set the auth cookie, return the user (never the hash); Swagger docs
- [x] FE · Landing page `/`: hero photo with white fade, headline, "Log in" / "Get started" (wireframe 01)
- [x] FE · Register popup (wireframe 01; `/register` opens the landing page with it open): fields, React Hook Form + zod, inline errors
- [x] FE · Register submit: button disabled while saving, server `details[]` mapped to fields, no lost input on error, redirect to My Projects
- [x] QA · Integration: success, duplicate email (any letter case), invalid email, short password
- [x] QA · Integration: password stored hashed and never returned
- [ ] QA · E2E: register → lands on My Projects — waits on SETUP-9 (the E2E workspace); the owner chose to leave it for later on 2026-11-22. Until then QA checks this flow by hand in a browser, and AUTH-1 stays "In progress" until this test is merged.

### AUTH-2 · Log in
Sprint 2 · Size M · Status: To do · Depends on AUTH-1
AC (extra): one generic `401 INVALID_CREDENTIALS` for unknown email and wrong password · rate-limited (`429`).
- [ ] BE · `POST /api/auth/login`: verify the password, set the auth cookie (helper from AUTH-1), generic 401 on failure; an unknown email still runs a hash
- [ ] BE · Login rate limits (`429 RATE_LIMITED`): failed attempts per email + IP (5 per 15 minutes) and per IP (100 per day)
- [ ] FE · Log in popup with a generic error message (wireframe 01; `/login` opens the landing page with it open)
- [ ] QA · Integration: same error for unknown email vs. wrong password; cookie flags
- [ ] QA · Integration: both rate limits kick in (email + IP, and IP)
- [ ] QA · E2E login fixtures: log in as owner / member / outsider (used by all later E2E tests)
- [ ] QA · E2E: login → My Projects

### AUTH-3 · Log out
Sprint 2 · Size S · Status: To do · Depends on AUTH-2
- [ ] BE · `requireAuth` middleware → `401 UNAUTHENTICATED`
- [ ] BE · `POST /api/auth/logout` clears the cookie
- [ ] FE · "Log out" in the user menu; clear the query cache; redirect to the landing page
- [ ] QA · After logout, protected pages redirect to login; API calls without the cookie return 401

### AUTH-4 · Session survives refresh
Sprint 2 · Size S · Status: To do · Depends on AUTH-3
- [ ] BE · `GET /api/auth/me`
- [ ] FE · `useMe` query loaded on app start
- [ ] FE · `ProtectedRoute`: loading state, then the page or a redirect to `/login`
- [ ] QA · E2E: refresh keeps the user logged in; an invalid or expired token sends them to login

---

## E3 · Projects & members — Sprint 3

### PRJ-1 · Create project
Sprint 3 · Size M · Status: To do · Depends on AUTH-4
AC (extra): key 2–6 uppercase, unique (`409 PROJECT_KEY_TAKEN`), immutable · creator gets an OWNER membership in the same transaction.
- [ ] BE · Migration: `Project` (with `ticketCounter`), `ProjectMember` (role) + indexes
- [ ] BE · Shared `createProjectSchema` (key 2–6 uppercase letters)
- [ ] BE · `POST /api/projects` (transaction: project + owner membership)
- [ ] FE · "Create project" dialog: name, description, key (auto-uppercase), inline errors
- [ ] FE · Suggest the key from the name while typing (initials, or first 3 letters of one word); stop once edited by hand (wireframe 02 D)
- [ ] QA · Integration: valid/invalid keys, duplicate key, creator is OWNER

### PRJ-2 · My Projects list
Sprint 3 · Size M · Status: To do · Depends on PRJ-1
- [ ] BE · `GET /api/projects`: only my projects, my role, paginated
- [ ] BE · Open-ticket count per project (status ≠ DONE) in the same response — 0 until tickets exist
- [ ] BE · Optional `q` search by project name or key (used by the project dropdown)
- [ ] FE · `/projects` page: project cards (key, name, role, open tickets) + "Show more" (wireframe 02)
- [ ] FE · Loading, empty (with a "Create project" call to action), and error states
- [ ] FE · Project dropdown in the top bar: search, current project ✓, "View all projects", "+ Create project" (wireframe 02 E)
- [ ] FE · User menu in the top bar: name, email, Log out (wireframe 02 F)
- [ ] QA · Only my projects appear; role and counts are right; empty state shows
- [ ] QA · Project dropdown: search finds a project, switching opens its board, keyboard works

### PRJ-6 · Non-members can't access a project
Sprint 3 · Size M · Status: To do · Depends on PRJ-1 · **Build before PRJ-3/4/5**
AC (extra): project missing or caller not a member → `404`; member without rights → `403`.
- [ ] BE · `loadProjectAccess` and `requireOwner` middleware (architecture §6)
- [ ] BE · `GET /api/projects/:projectKey`
- [ ] FE · Project 404 page ("Project not found") for direct URLs
- [ ] QA · Reusable **authorization-matrix test helper** (owner / member / outsider) that every later story uses
- [ ] QA · Outsider gets 404 and no project data, through the API and the UI

### PRJ-3 · Add a member by email
Sprint 3 · Size M · Status: To do · Depends on PRJ-6
- [ ] BE · `GET /api/projects/:projectKey/members`
- [ ] BE · `POST /api/projects/:projectKey/members` `{ email }` (owner only): `404 USER_NOT_FOUND`, `409 ALREADY_MEMBER`
- [ ] FE · Project settings page layout (sections: details, members, danger zone) — reused by PRJ-4 and PRJ-5. **Owner only:** the Settings tab is hidden from members; a member opening the URL sees "Only the project owner can open settings" (wireframe 03)
- [ ] FE · Members list
- [ ] FE · "Add by email" form with clear errors
- [ ] QA · Owner can add; member gets 403; unknown email; already a member

### PRJ-4 · Remove a member
Sprint 3 · Size S · Status: To do · Depends on PRJ-3
- [ ] BE · `DELETE /api/projects/:projectKey/members/:userId` (owner only); owner can't remove themselves (`409 CANNOT_REMOVE_OWNER`)
- [ ] FE · Remove button with a confirmation dialog
- [ ] QA · Owner removes a member; member gets 403; owner can't remove themselves
- (Unassigning their tickets is added in TKT-5, when tickets exist.)

### PRJ-5 · Edit or delete a project
Sprint 3 · Size M · Status: To do · Depends on PRJ-6, PRJ-3
- [ ] BE · `PATCH /api/projects/:projectKey` (owner; name and description only)
- [ ] BE · `DELETE /api/projects/:projectKey` (owner; cascades members, tickets, comments, activity)
- [ ] FE · Edit form (name, description) in project settings
- [ ] FE · Delete with a confirmation dialog: shows the ticket count, the owner must type the project key to enable Delete; redirect to My Projects (wireframe 06 D)
- [ ] QA · Member gets 403 on both; key can't be changed; after delete everything is gone (checked again after tickets exist)

---

## E4 · Tickets — Sprint 4

### TKT-1 · Create a ticket
Sprint 4 · Size L · Status: To do · Depends on PRJ-6
AC (extra): key from the atomic `ticketCounter` (architecture §10.1) · new ticket goes to the end of To Do.
- [ ] BE · Migration: `Ticket` + indexes (architecture §8.1), including the optional `estimateMinutes`
- [ ] BE · Shared `parseEstimate` / `formatEstimate`: `30m`, `4h`, `2d`, `1d 4h` ↔ minutes (1d = 8h)
- [ ] BE · `lib/ticket-key.ts`: format/parse `WEB-12`
- [ ] BE · `lib/rank.ts`: fractional-indexing wrapper
- [ ] BE · Shared `createTicketSchema`
- [ ] BE · `POST /api/projects/:projectKey/tickets` in one transaction: increment counter → rank → insert
- [ ] FE · "Create ticket" dialog: title, description, type, priority, inline errors
- [ ] FE · Due date field (date picker)
- [ ] FE · Estimate field (optional, `30m` / `4h` / `2d`, inline format error)
- [ ] FE · After create: refresh the board/list and show the new key
- [ ] QA · Unit: key format/parse, rank helper, estimate parse/format (valid and invalid inputs)
- [ ] QA · Integration: 20 parallel creates → unique, contiguous keys
- (The assignee field is added in TKT-5. "Numbers are never reused" is tested in TKT-4, once delete exists.)

### TKT-2 · Ticket detail with its own URL
Sprint 4 · Size M · Status: To do · Depends on TKT-1
- [ ] BE · `GET /api/projects/:projectKey/tickets/:ticketKey` (scoped by project; the key prefix must match the project)
- [ ] FE · `/projects/:projectKey/tickets/:ticketKey` page: title, description, details panel ("Created by", "Assigned to", status, priority, type, due date, estimate, dates) (wireframe 04)
- [ ] FE · "🔗 Copy link" button that copies the ticket URL
- [ ] FE · Loading and not-found states
- [ ] QA · Direct URL works after refresh; `WEB-3` under another project's URL → 404

### TKT-3 · Edit a ticket
Sprint 4 · Size M · Status: To do · Depends on TKT-2
AC (extra): the PATCH body includes the `updatedAt` the client loaded; the conditional update (architecture §10.3) is built now, the conflict UX comes in CON-1.
- [ ] BE · Shared `updateTicketSchema` (includes `updatedAt`)
- [ ] BE · `PATCH /api/projects/:projectKey/tickets/:ticketKey` with validation and the `updatedAt` check
- [ ] FE · Edit mode on the ticket page (all fields)
- [ ] FE · Save: inline errors next to fields, button disabled while saving, input kept on error
- [ ] QA · Integration: valid edit, title > 120 chars, invalid enum values
- [ ] QA · Integration: stale `updatedAt` → 409

### TKT-4 · Delete a ticket
Sprint 4 · Size S · Status: To do · Depends on TKT-2
- [ ] BE · `DELETE …/tickets/:ticketKey`: reporter or owner only, otherwise 403
- [ ] FE · Delete button only for the reporter or owner; confirmation dialog
- [ ] QA · Reporter and owner can delete; another member gets 403 and doesn't see the button
- [ ] QA · Integration: a deleted ticket's number is never reused (TKT-1 key rule)

### TKT-5 · Assign a ticket
Sprint 4 · Size M · Status: To do · Depends on TKT-3, PRJ-4
- [ ] BE · Assignee must be a project member (otherwise `400 VALIDATION_ERROR` on `assigneeId`)
- [ ] BE · Extend member removal (PRJ-4): unassign their tickets in the same transaction
- [ ] FE · Assignee picker (project members) in the create and edit forms
- [ ] FE · "Assign to me" shortcut
- [ ] QA · Assign to a member, to self, to a non-member (rejected)
- [ ] QA · Removing a member unassigns their tickets

---

## E5 · Board — Sprints 4–5

### BRD-1 · Board with one column per status
Sprint 4 · Size L · Status: To do · Depends on TKT-1
AC (extra): up to 50 cards per column ordered by rank, "load more" per column; column headers show the total count.
- [ ] BE · `GET /api/projects/:projectKey/board`: per status → count + first 50 cards by rank
- [ ] BE · "Load more" for one column with a rank cursor
- [ ] FE · `/projects/:projectKey/board` layout: 4 columns with headers and counts
- [ ] FE · TicketCard: key, title, type icon, priority, estimate, assignee initials, due date
- [ ] FE · "Load more" button per column
- [ ] FE · Loading, empty, and error states
- [ ] FE · Phone width: the board scrolls horizontally
- [ ] QA · Counts and card order are right
- [ ] QA · "Load more" works on a column with 50+ cards

### BRD-2 · Drag a card to another column
Sprint 5 · Size L · Status: To do · Depends on BRD-1
AC (extra): no conflict check on moves ("last move wins").
- [ ] BE · Shared `moveTicketSchema` `{ status, beforeKey?, afterKey? }`
- [ ] BE · `PATCH …/tickets/:ticketKey/position`: server computes the rank, updates one row
- [ ] FE · dnd-kit setup: drag a card between columns (UI only)
- [ ] FE · Call the position API with an optimistic update
- [ ] FE · Rollback + error message when the server rejects
- [ ] FE · Keyboard alternative for moving a card: card ⋯ menu "Move to" + dnd-kit keyboard drag (wireframe 03 D)
- [ ] FE · Status dropdown on the ticket page (view mode) using the same `position` endpoint; revert + error if rejected (wireframe 04 A)
- [ ] QA · E2E: drag, reload, the status persisted
- [ ] QA · E2E: server rejection (e.g. ticket deleted in another session) → the card returns with an error

### BRD-3 · Reorder cards within a column
Sprint 5 · Size M · Status: To do · Depends on BRD-2
- [ ] BE · Same `position` endpoint within one column; validate the neighbors belong to that column
- [ ] FE · Drag to reorder inside a column (optimistic + rollback)
- [ ] FE · Card `⋯` menu: **Move up** / **Move down** (no drag needed; disabled at the top and bottom of the column) (wireframe 03 D)
- [ ] QA · Unit: rank between neighbors, at the top, at the bottom, many moves in the same spot
- [ ] QA · E2E: order persists after refresh and is the same for a second user
- [ ] QA · E2E: Move up / Move down reorder a card without dragging

### BRD-4 · Quick filters
Sprint 5 · Size S · Status: To do · Depends on BRD-1
- [ ] BE · Board filters: `assignee=me`, `type`, `priority`
- [ ] FE · Filter bar: "Only my tickets", type, priority
- [ ] QA · Each filter alone and combined

---

## E6 · Comments & activity — Sprint 6

### CMT-1 · Comment on a ticket
Sprint 6 · Size M · Status: To do · Depends on TKT-2
- [ ] BE · Migration: `Comment`
- [ ] BE · `GET …/tickets/:ticketKey/comments` (oldest first, paginated)
- [ ] BE · `POST …/tickets/:ticketKey/comments`
- [ ] FE · Comment thread on the ticket page: author, relative time ("5 minutes ago"), newest last
- [ ] FE · Add-comment form
- [ ] QA · Members can comment; outsider gets 404; empty comment rejected

### CMT-2 · Edit or delete my comment
Sprint 6 · Size S · Status: To do · Depends on CMT-1
- [ ] BE · `PATCH …/comments/:commentId` (sets `editedAt`): author only, otherwise 403
- [ ] BE · `DELETE …/comments/:commentId`: author only, otherwise 403
- [ ] FE · Edit inline + "(edited)" marker
- [ ] FE · Delete with confirmation; options hidden for other users
- [ ] QA · Author can edit/delete; others get 403 and don't see the options

### ACT-1 · Ticket activity history
Sprint 6 · Size M · Status: To do · Depends on TKT-3, BRD-2
AC (extra): written in the same transaction as the change (architecture §10.4).
- [ ] BE · Migration: `ActivityEntry`
- [ ] BE · Write entries for status / assignee / priority changes inside the ticket `PATCH` transaction
- [ ] BE · Write a status entry inside the `position` transaction
- [ ] BE · `GET …/tickets/:ticketKey/activity` (paginated)
- [ ] FE · Activity tab: who, what changed (old → new), when; last line "created the ticket" from the ticket's creator and date (wireframe 04 F)
- [ ] QA · One entry per changed field; a drag creates a status entry
- [ ] QA · No entry when the update fails (rollback test)

---

## E7 · List view, search & pagination — Sprint 6

### LST-1 · Ticket table
Sprint 6 · Size M · Status: To do · Depends on TKT-1
- [ ] BE · `GET /api/projects/:projectKey/tickets` (list endpoint)
- [ ] FE · `/projects/:projectKey/list`: key, title, type, status, priority, assignee, updated; loading/empty/error states
- [ ] QA · Columns and values match the tickets

### LST-2 · Sort by any column (server-side)
Sprint 6 · Size S · Status: To do · Depends on LST-1
- [ ] BE · `sort` / `order` with a whitelist of columns; a tie-breaker so ordering is stable
- [ ] FE · Clickable column headers with `aria-sort`
- [ ] QA · Every column sorts both ways; an invalid sort field → 400

### LST-3 · Search and filters in the URL
Sprint 6 · Size M · Status: To do · Depends on LST-1
- [ ] BE · Search `q`: title contains / key match
- [ ] BE · Filters: status, type, priority, assignee — each accepts one or more values (`status=TODO,IN_PROGRESS`); assignee also accepts `me` and `unassigned` (wireframe 05)
- [ ] FE · Search box + filter controls
- [ ] FE · Bind search and filters to the URL query string (shareable, survive reload)
- [ ] QA · E2E: a filtered URL opened in a new tab shows the same results

### LST-4 · Pagination with 1,000+ tickets
Sprint 6 · Size M · Status: To do · Depends on LST-1
- [ ] BE · Page size 20, response `{ items, page, pageSize, total, totalPages }`
- [ ] BE · Seed: several projects and 1,000+ tickets with ranks
- [ ] BE · Seed: comments and activity on some tickets
- [ ] FE · Pagination controls (page number in the URL)
- [ ] QA · On seed data: no duplicates or gaps between pages, correct totals
- [ ] QA · Pagination works combined with sort and filters

---

## E8 · My Work — Sprint 6

### MY-1 · Tickets assigned to me across projects
Sprint 6 · Size M · Status: To do · Depends on TKT-5
- [ ] BE · `GET /api/my-work`: my tickets across my projects, sorted by project then due date (no due date last), paginated
- [ ] BE · Exclude Done unless `includeDone=true`; return `overdueCount` for the summary
- [ ] FE · `/my-work` page as **swimlanes**: one lane per project (foldable), columns To Do / In Progress / In Review; summary "7 tickets · 2 overdue"; "Show more" (wireframe 07)
- [ ] FE · Mini card + overdue highlighted three ways: red border, ⚠, red date; loading/empty/error states
- [ ] FE · "Show done tickets" checkbox adds a faded Done column
- [ ] FE · Phone width: each lane becomes a section with its statuses stacked
- [ ] QA · Only my tickets, only from projects I belong to; overdue highlighting

---

## E9 · Concurrent edits — Sprint 7

### CON-1 · The second save doesn't silently overwrite the first
Sprint 7 · Size M · Status: To do · Depends on TKT-3
- [ ] BE · Confirm the `409 EDIT_CONFLICT` path (built in TKT-3) and its Swagger documentation
- [ ] FE · Conflict message "This ticket was updated by someone else" with **Reload**; the user's typed input is kept
- [ ] QA · Integration: two PATCHes with the same `updatedAt` → the second gets 409, the first is kept
- [ ] QA · E2E: two users in isolated sessions edit the same ticket → the second sees the message

---

## E10 · Hardening — Sprint 7

### HARD-1 · Test coverage on critical paths
Sprint 7 · Size M · Status: To do
- [ ] QA · Gap review → list of missing tests
- [ ] QA · Fill gaps: auth and the authorization matrix on every endpoint
- [ ] QA · Fill gaps: ticket keys, conflicts, activity atomicity, pagination
- [ ] QA · Report the bugs found to BE / FE

### HARD-2 · Accessibility pass
Sprint 7 · Size M · Status: To do
- [ ] FE · Keyboard navigation on the board (moving cards without a mouse)
- [ ] FE · Keyboard navigation and visible focus in forms, dialogs, and menus
- [ ] FE · Labels on all inputs; color contrast check
- [ ] QA · Lighthouse accessibility audit on every main screen
- [ ] QA · Keyboard-only E2E walkthrough

### HARD-3 · UX polish
Sprint 7 · Size M · Status: To do
- [ ] FE · Impeccable audit + fixes: login, register, My Projects, settings
- [ ] FE · Impeccable audit + fixes: board and ticket page
- [ ] FE · Impeccable audit + fixes: list view and My Work
- [ ] FE · Emil polish: hover/press states, transitions, drag feel; respect reduced motion
- [ ] QA · Loading / empty / error states and confirmations exist everywhere; phone-width check

### HARD-4 · Security review
Sprint 7 · Size S · Status: To do
- [ ] BE · Check rate limit, CORS allowlist, helmet, and cookie flags in production
- [ ] BE · Check secrets only come from env and no stack traces reach responses
- [ ] QA · Run `/security-review`; try ID tampering and cross-project access

### HARD-5 · Performance and indexes
Sprint 7 · Size S · Status: To do
- [ ] BE · `EXPLAIN ANALYZE` the main queries on seed data; add or remove indexes
- [ ] BE · Document why each index exists (architecture §8.1)

---

## E11 · Ship — Sprint 8

### SHIP-1 · Deploy
Sprint 8 · Size L · Status: To do
- [ ] You · Choose the deployment target (architecture §11 #7) and update architecture.md + CLAUDE.md
- [ ] BE · Deploy the database
- [ ] BE · Deploy the API: env vars, run migrations
- [ ] FE · Deploy the client
- [ ] BE · Seed a demo account on the live demo
- [ ] QA · Smoke-test the live demo (login, board, ticket, list)

### SHIP-2 · README
Sprint 8 · Size S · Status: To do
- [ ] You + BE + FE · README text: what it is, architecture diagram, how to run locally, how to run tests, live demo link, image credit ("Hero image generated with ChatGPT")
- [ ] FE · Screenshots and a short GIF of the board

### SHIP-3 · Demo
Sprint 8 · Size S · Status: To do
- [ ] You · 10-minute demo script: main flows + design decisions (architecture §10.6)
- [ ] You · Rehearse once with the live demo

---

## Icebox · Stretch goals (P2, only after the MVP)

Not planned. Pick from requirements §12 only when everything above is done: real-time board (WebSockets/SSE) · AI assist with the Claude API · attachments · Kubernetes/Helm · labels and custom columns · viewer role.
