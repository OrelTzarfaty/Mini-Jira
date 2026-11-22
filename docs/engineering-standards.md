# Mini-Jira — Engineering Standards

**Version:** v1.2 · 2026-11-21
**Who follows this:** every session and agent that writes, reviews, or tests code in this repo.
**Sources:** official docs and recognized references, listed in [§13](#13-sources).

These are working rules, not theory. Size limits marked *guideline* are team defaults: break one only with a reason you can explain.

## 0. When rules conflict

Apply the first rule that decides the question:

1. **The requirements and the owner's decisions** ([requirements](../mini-jira-requirements.md), [architecture](architecture.md), [wireframes](wireframes/README.md)).
2. **Security and data correctness** (§7).
3. **Simple design, in this order** (Kent Beck): ① passes the tests → ② reveals intention → ③ no duplication → ④ fewest elements.
4. **The existing code in this repo** (be consistent).
5. **Personal preference** — never blocks a change. In reviews, prefix it with `Nit:`.

Not sure which rule applies? Stop and ask the owner (ground rule in `CLAUDE.md`).

---

## 1. Core principles

| Principle | Means | In Mini-Jira | Don't |
|---|---|---|---|
| **KISS** | The simplest solution that fully works | A lookup table instead of a class hierarchy | Build a "framework" for one use |
| **YAGNI** | Build only what a story needs today | No roles beyond Owner/Member | Add unused fields, options, or extension points |
| **DRY** | Each piece of **knowledge** has one authoritative home | Validation rules, enums, and error codes live in `shared/` | Merge code that only *looks* alike |
| **AHA / Rule of three** | Avoid hasty abstractions; duplication is cheaper than the wrong abstraction | Extract on the **third** real use, once the shared shape is clear | Add flags and `if`s to make one helper fit many cases |
| **Separation of concerns** | Things that change for different reasons live apart | HTTP in controllers, rules in services, UI in components | Business rules inside routes or components |
| **Composition over inheritance** | Combine small functions and components | Middleware chains, hooks, `children` | Deep class trees |
| **Fail fast** | Reject bad state at the boundary, with a clear error | zod at the API edge; env check at startup | Continue with half-valid data |
| **Least privilege** | Give the minimum access needed | Scope every query by project; non-root container | "Temporary" broad access |
| **Leave it better** | Improve code you touch for the task | Rename an unclear variable in the function you're editing | Unrelated refactors inside a feature PR |

YAGNI is **not** an excuse for messy code: keeping code clean and easy to change is what makes YAGNI safe.

## 2. SOLID (applied to TypeScript and React)

We mostly write functions and modules, not classes. SOLID still applies to modules, functions, and components.

| Principle | Definition (Robert C. Martin) | How we apply it |
|---|---|---|
| **S** — Single Responsibility | Gather things that change for the same reasons; separate things that change for different reasons | Controller = HTTP. Service = business rules. Component = one UI job. Name a module without using "and" |
| **O** — Open/Closed | Open for extension, closed for modification | New sort column = a new entry in the allowed-columns table, not another `if` |
| **L** — Liskov Substitution | A user of an interface must not be confused by an implementation of it | Every `AppError` subclass works with the error handler the same way. A wrapped `Button` still behaves like a button |
| **I** — Interface Segregation | Keep interfaces small so users don't depend on what they don't need | `TicketCard` takes the fields it shows, using `Pick<Ticket, ...>`, not a giant object |
| **D** — Dependency Inversion | High-level rules must not depend on low-level details | Services never touch `req`/`res`. Functions used inside transactions receive `tx` as a parameter |

**Don't over-apply:** no interface for something with only one implementation, no DI container, no class just to hold functions. An abstraction must solve a problem we have **today**.

## 3. Clean code

### 3.1 Naming

| Thing | Convention | Example |
|---|---|---|
| Files and folders | `kebab-case` | `require-auth.ts`, `ticket-card.tsx` |
| Variables, functions | `camelCase`, functions start with a verb | `createTicket`, `parseTicketKey` |
| Types, classes, components | `PascalCase` | `TicketCard`, `NotFoundError` |
| Constants | `UPPER_SNAKE_CASE` for fixed module-level values | `PAGE_SIZE`, `MAX_TITLE_LENGTH` |
| Booleans | `is` / `has` / `can` prefix | `isOverdue`, `canDelete` |
| React hooks | `use` prefix | `useTicketQuery` |
| Event handlers | `handleX` inside, `onX` as a prop | `handleDrop`, `onMove` |
| Env variables | `UPPER_SNAKE_CASE` | `DATABASE_URL` |
| Tests | `*.test.ts(x)` (Vitest), `*.spec.ts` (Playwright) | `rank.test.ts` |

Names say **what and why**, using the product's words (ticket, project, member, rank). No unclear abbreviations (`tkt`, `usr`, `data2`).

### 3.2 Functions and files

- A function does **one thing** at one level of detail.
- Return early instead of nesting. *Guideline:* at most 3 levels of nesting.
- Put an **empty line before every `return`**, unless the `return` is the first line of its block. ESLint enforces this.
- *Guideline:* about 40 lines per function, 300 per file, 200 per component. Longer usually means more than one job.
- *Guideline:* at most 3 parameters; beyond that, pass one named object.
- No boolean flag that switches behavior (`save(ticket, true)`): write two functions.
- Prefer pure functions. Keep side effects (DB, network) at the edges.
- Don't mutate inputs. Prefer `const`; never use `var`.

### 3.3 Comments

- Code explains **what**. Comments explain **why**: a trade-off, a non-obvious rule, or a link to a requirement.
- No commented-out code; git keeps history.
- No `TODO` without a backlog ID (`// TODO(HARD-5): ...`).

### 3.4 Values and dead code

- No magic numbers or strings: use a named constant, or an enum from `shared/`.
- Remove unused code, imports, parameters, and dependencies in the same change.

### 3.5 Code smells to fix when you touch them

| Smell | Fix |
|---|---|
| Long function, large module, long parameter list | Extract functions; pass one object |
| Data clumps, primitive obsession | Give the idea a type (`TicketKey`, `Page<T>`) |
| Repeated `switch` / `if` on the same value | Lookup table |
| Duplicate code (3rd copy) | Extract a helper |
| Shotgun surgery (one change touches many files) | Bring the knowledge together |
| Feature envy (reaches into another module's data) | Move the logic to where the data lives |
| Message chains (`a.b().c().d()`) | Add a clear function |
| Speculative generality | Delete it (YAGNI) |

## 4. Design patterns

Patterns are a shared vocabulary, not a goal. Use one only when it removes a real problem.

**Patterns we use**

| Pattern | Where | Why |
|---|---|---|
| **Layered architecture** | routes → controller → service → Prisma | Clear boundaries, easy testing |
| **Chain of Responsibility** | Express middleware pipeline | Each step handles one concern, or stops the request |
| **Factory function** | `validate(schema)`, test data builders (`createTestTicket()`) | Configured behavior without classes |
| **Facade** | Services; `client/src/api/client.ts` | One simple entry to a complex area |
| **Adapter** | `lib/rank.ts`, Prisma model → API DTO mappers | Keeps a library or DB shape from leaking everywhere |
| **DTO** | Response types and zod schemas in `shared/` | Exposes only intended fields |
| **Strategy (lookup table)** | Allowed sort columns; error class → HTTP status | Add behavior without new branches |
| **Module singleton** | One `PrismaClient`, logger, validated config | One shared instance, created once |
| **Unit of Work** | `prisma.$transaction` | Several changes succeed or fail together |
| **Optimistic concurrency** | `updatedAt` check (CON-1) | Detect conflicts without long locks |
| **Optimistic UI** | Board moves | Instant feedback, with rollback |
| **Custom hook** | `useTicketQuery`, `useMoveTicket` | Reuse stateful logic, keep components small |
| **Composition** | shadcn/ui parts, `children` | Flexible UI without configuration props |

**Don't add (not needed here):** a repository layer on top of Prisma, DI containers, Abstract Factory, Visitor, event buses, CQRS, microservices, a global state store.

## 5. TypeScript

- `tsconfig`: `strict: true`, plus `noUncheckedIndexedAccess`, `noImplicitReturns`, `noFallthroughCasesInSwitch`.
- ESLint: `typescript-eslint` **`recommendedTypeChecked` + `stylisticTypeChecked`**. Prettier handles formatting.
- **No `any`.** Use `unknown` and narrow it. No `@ts-ignore`; `@ts-expect-error` only with a written reason.
- Avoid `as` casts and `!`. At boundaries (request, env, external data), parse with zod and infer the type: `z.infer<typeof schema>`.
- Model states so impossible ones can't exist: `{ status: 'idle' } | { status: 'error'; message: string }`.
- Every promise is awaited, returned, or explicitly handled (`no-floating-promises`).
- Exported functions declare their return type.
- Use `import type` for type-only imports, and the `node:` prefix for built-ins (`node:crypto`).

## 6. Backend (Node.js, Express, Prisma)

### 6.1 Runtime and structure

- **Node.js LTS** (v26, pinned in `engines` and the Docker image). **Express 5**.
- Follow the layers in [architecture §4](architecture.md). Controllers never call Prisma; services never see `req`/`res`.
- `app.ts` builds the app without listening, so tests can import it.
- Use `async/await`. No synchronous I/O after startup.

### 6.2 API design

- Resource URLs, plural nouns, correct methods and status codes (`201` create, `204` empty, `400`, `401`, `403`, `404`, `409`, `429`).
- `GET` never changes data.
- Every list is paginated with a capped page size. Sort columns come from an allow-list.
- Update the OpenAPI docs in the same change as the endpoint.

### 6.3 Validation and DTOs

- Validate `body`, `params`, and `query` with zod at the edge. Use strict object schemas so unknown fields are rejected.
- Every string has a maximum length; every number has a range.
- **Never pass the request body straight to Prisma.** Pick allowed fields only (prevents mass assignment).
- Use Prisma `select` and map to a DTO. Secrets like `passwordHash` must never leave the service layer.

### 6.4 Error handling

- Throw typed `AppError` subclasses (`NotFoundError`, `ConflictError`, ...) for **expected** errors. Express 5 forwards rejected async handlers to the error handler, so don't wrap routes in `try/catch` just to call `next`.
- **One** central error handler, registered last, produces the standard error format.
- **Expected errors** → the right 4xx response. **Bugs and unknown errors** → log with full detail, respond `500 INTERNAL_ERROR`, and never expose a stack trace.
- On `unhandledRejection` / `uncaughtException`: log as fatal and **exit**. Docker restarts the process. Never keep running in an unknown state.
- On `SIGTERM`: stop accepting requests, finish in-flight ones, disconnect Prisma, then exit.
- Permission checks **fail closed**: if the check errors, access is denied.

### 6.5 Database and transactions

- Schema changes only through Prisma migrations. Never edit an applied migration.
- Use `$transaction` when several writes must succeed or fail together. Every query inside uses `tx`.
- **Keep transactions short:** no network calls, password hashing, or slow work inside them. Don't use `Promise.all` inside one.
- Use atomic updates (`{ increment: 1 }`) instead of read-then-write.
- Avoid N+1 queries: load relations with `include`/`select`, or batch.
- Add an index for each real query, and write down why it exists.
- Raw SQL only through parameterized `$queryRaw`; never build SQL from strings.

### 6.6 Config and logs

- All config comes from environment variables, validated at startup. Secrets are never in code or git.
- The app keeps no state between requests; it logs to **stdout** as JSON through pino, with the request ID on every line.
- **Log:** startup/shutdown, login success and failure, permission denials, validation failures, server errors.
- **Never log:** passwords, tokens, cookies, secrets, `DATABASE_URL`, or request bodies. Log the `userId`, not the email. Configure pino `redact`.
- No `console.log` in committed server code.

## 7. Security (OWASP Top 10:2025, API Security Top 10:2023)

| Risk | Our rule |
|---|---|
| **Broken access control** (A01, API1, API5) | Every route goes through `requireAuth`, then `loadProjectAccess` and `requireOwner` as needed. Every ticket query includes `projectId`. Test owner / member / outsider on each endpoint |
| **Object property access** (API3) | Allow-list writable fields; DTOs for responses (§6.3) |
| **Security misconfiguration** (A02, API8) | `helmet`, a strict CORS allow-list, `trust proxy` set to the one nginx hop, no debug output in production |
| **Supply chain** (A03) | Commit the lockfile, install with `npm ci`, run `npm audit --audit-level=high` in CI, and justify every new dependency |
| **Cryptographic failures** (A04) | **Argon2id** for passwords (at least 19 MiB memory, 2 iterations, 1 thread). Secure random secrets |
| **Injection** (A05) | Prisma parameterized queries; React escapes output. **Never** use `dangerouslySetInnerHTML` with user content. Avoid risky regex on user input |
| **Authentication failures** (A07, API2) | See below |
| **Logging failures** (A09) | §6.6 |
| **Exceptional conditions** (A10) | §6.4: fail closed, no leaked details |
| **Resource consumption** (API4) | JSON body limit, page-size cap, max string lengths, login rate limits |
| **Inventory** (API9) | Every endpoint is in the OpenAPI docs; no hidden debug routes |

**Authentication rules**

- Passwords: 8–128 characters, all characters allowed, never truncated silently.
- Login returns one generic `401` for an unknown email or a wrong password. An unknown email **still runs a hash**, so response time doesn't reveal whether the account exists.
- **Login rate limits:** failed attempts per **email + IP** (5 per 15 minutes) and per **IP** (100 per day).
- **JWT:** signed with a random secret of at least 32 bytes, algorithm pinned to `HS256` when verifying, expiry always checked, and `sub` must match an existing user.
- **Cookie:** `httpOnly`, `sameSite: 'lax'`, `secure` in production, `path: '/'`, 7-day `maxAge`, custom name (`mj_session`).
- **CSRF:** `SameSite=Lax` **plus** the `origin-check` middleware on `POST`/`PATCH`/`PUT`/`DELETE`: allow `Sec-Fetch-Site: same-origin`; if that header is missing, `Origin` must exactly match `CLIENT_ORIGIN`; otherwise respond `403 FORBIDDEN`. The API accepts only `application/json` bodies.

**Containers:** pinned base image, multi-stage build, run as a **non-root** user, no secrets in images.

## 8. Frontend (React)

### 8.1 Rules of React

- Components and hooks are **pure**: same input, same output. No side effects during render.
- Props and state are immutable. Create new values instead of changing them.
- Call hooks only at the top level of components or other hooks. Enforce with `eslint-plugin-react-hooks`.
- Keep `<StrictMode>` on.

### 8.2 State

| State | Where it lives |
|---|---|
| Server data | **TanStack Query only**. Never copy it into `useState` |
| Filters, sort, page | URL |
| Form input | React Hook Form + shared zod schemas |
| Small UI state | Local `useState` |

- Don't store what you can calculate during render.
- Avoid contradictions: one `status` value instead of `isLoading` + `isError`.
- Don't keep the same data twice: store an ID, not a copy of the object.

### 8.3 Effects

`useEffect` is only for syncing with something **outside** React. Don't use it for:

- values derived from props or state → calculate during render;
- reacting to a user action → use the event handler;
- fetching data → use TanStack Query;
- resetting state when a prop changes → use a `key`.

### 8.4 Components

- Feature code stays in `features/<name>`; only truly shared UI goes in `components/`.
- Pages load data and handle routes; child components receive props and render.
- Prefer composition (`children`) over many configuration props. Avoid passing props through more than 2 levels.
- List keys are stable IDs, **never** the array index for reorderable lists.
- Every screen handles loading, empty, and error states; each route has an error boundary.
- `useMemo`, `useCallback`, and `memo` only for a measured problem.

### 8.5 Data and security

- All HTTP goes through `api/client.ts`; components never call `fetch`.
- **Optimistic updates (TanStack Query):** `onMutate` → cancel queries → snapshot → update the cache; `onError` → restore the snapshot; `onSettled` → invalidate.
- Client validation is for UX only.
- `VITE_*` variables are public: never put secrets in them.
- User content renders as plain text.

## 9. Accessibility (WCAG 2.2 AA)

- Use semantic HTML first; add ARIA only when HTML can't do the job. Keep Radix primitives' behavior.
- Everything works with the **keyboard**, in a logical order, with a **visible focus** that isn't hidden by sticky elements (2.4.7, 2.4.11).
- **Every drag has a click/tap alternative (2.5.7):** the card `⋯` menu offers **Move to**, **Move up**, and **Move down**. Keyboard drag alone doesn't satisfy this rule.
- Click targets are at least **24×24 CSS px** (2.5.8).
- Text contrast at least **4.5:1**; UI parts and large text at least **3:1**.
- Never use color alone to carry meaning: add an icon or a word.
- Every input has a label. Errors are next to the field, in text, and linked to it.
- Dialogs trap focus and return it on close. Respect `prefers-reduced-motion`.

## 10. Testing

### 10.1 Where tests go (Testing Trophy)

| Layer | Tool | Amount | Used for |
|---|---|---|---|
| **Static** | TypeScript, ESLint | Always | Types and common mistakes |
| **Unit** | Vitest | Some | Pure logic: rank, ticket keys, estimate parsing, permission rules |
| **Integration** | Vitest + Supertest + real PostgreSQL; RTL + MSW | **Most** | Endpoints with the DB; components with mocked network |
| **E2E** | Playwright | Few | Critical user journeys |

### 10.2 Rules for all tests

- A test checks **behavior** and would **fail if the code broke**.
- Name it with the requirement, scenario, and expected result: `TKT-4: other member deleting a ticket gets 403`.
- Structure: **Arrange → Act → Assert**.
- Tests are independent: each creates its own data and passes in any order.
- For each endpoint, cover the main path and the failures: `400`, `401`, `403`/`404`, `409`.
- Check the response **and** the database state.
- No arbitrary sleeps. A flaky test is a bug.
- Test code is held to the same quality standard as app code.
- Coverage shows gaps; it doesn't prove quality. Critical paths must be tested.

### 10.3 Frontend and E2E

- **React Testing Library** query order: `getByRole` → `getByLabelText` → `getByText` → `getByTestId` as the last resort.
- Test what the user sees, not component internals. Mock the network with MSW, not the components.
- **Playwright:** role-based locators, web-first assertions (`await expect(locator).toBeVisible()`), an isolated context for each user, and traces on CI failures.

## 11. Git, pull requests, and code review

**Missions:** one backlog story is one **mission**.

| Backlog | In git and GitHub |
|---|---|
| **Mission** (a story, e.g. AUTH-1) | One GitHub issue, one branch, one pull request |
| **Task** | One commit, one checkbox in the issue |

**Branches:** `<type>/<STORY-ID>-<short-name>`, created from `dev`: `feat/AUTH-1-register`, `fix/BRD-2-rollback`, `chore/SETUP-1-repo-setup`.

**Merging:** a mission's pull request merges into `dev`. At the end of each sprint, `dev` merges into `main`.

**QA check:** `qa-engineer` must give a **PASS** on the final commit of every pull request before it can be merged. Any change after that needs a new QA check; when only a fix was added, a re-check of that fix is enough. A pull request that changes only Markdown files gets a **light** check: the CI result, a line-by-line content review, and a security review of agent instruction files (`.claude/`, `CLAUDE.md`), with no local re-run, browser check, or deliberate breakage. Most code pull requests get a **standard** check of their own change. Every **5th** code pull request into `dev`, or any the owner asks for, gets a **full** check of the whole app, including deliberate breakage. The levels are described in `.claude/agents/qa-engineer.md`.

**Commits** follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/), with the requirement ID:

```
feat(auth): add register endpoint (AUTH-1)
fix(board): restore card position when a move fails (BRD-2)
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `ci`, `build`, `perf`.

**Pull requests**

- One mission per pull request, leaving the app working, with its tests. About **100 lines is a good size**; around 1,000 is too large. If a mission grows too large, split it into smaller missions first.
- Refactors go in their own PR, separate from features and fixes.
- The description says what changed, why, how it was tested, and the requirement ID, and links the mission's issue (`Refs #123`). Close the issue when the pull request is merged into `dev` and none of its tasks are still open, for example a `You` task.

**Reviewing** (approve when the change clearly improves code health; perfect isn't required). Check, in order: design → functionality and edge cases → concurrency → complexity and over-engineering → tests → naming → comments → docs. Facts and these standards outrank opinions. Mark optional comments `Nit:`.

## 12. Definition of quality: check before saying "done"

- [ ] It meets the acceptance criteria and matches the architecture and wireframes.
- [ ] `lint`, `typecheck`, tests, and `build` pass, and you ran them yourself.
- [ ] Tests cover the main path and failure paths.
- [ ] Input is validated; permissions are checked; no secrets or sensitive data are exposed or logged.
- [ ] Errors are handled; loading, empty, and error states exist.
- [ ] Keyboard, labels, contrast, and phone width work (UI changes).
- [ ] No dead code, stray `console.log`, `any`, or unexplained `TODO`.
- [ ] Names are clear; no duplicated knowledge; nothing built "for later".
- [ ] API docs, `CLAUDE.md`, and the backlog are updated.
- [ ] Any deviation from these standards is reported, with the reason.

## 13. Sources

**Design:** [SOLID — R. C. Martin](https://blog.cleancoder.com/uncle-bob/2020/10/18/Solid-Relevance.html) · [Single Responsibility — R. C. Martin](https://blog.cleancoder.com/uncle-bob/2014/05/08/SingleReponsibilityPrinciple.html) · [Beck Design Rules — M. Fowler](https://martinfowler.com/bliki/BeckDesignRules.html) · [YAGNI — M. Fowler](https://martinfowler.com/bliki/Yagni.html) · [AHA Programming — K. C. Dodds](https://kentcdodds.com/blog/aha-programming) · [Design patterns](https://refactoring.guru/design-patterns/catalog) and [code smells](https://refactoring.guru/refactoring/smells) — Refactoring.Guru

**Backend:** [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices) · [Node.js releases](https://nodejs.org/en/about/previous-releases) · [Express security](https://expressjs.com/en/advanced/best-practice-security.html), [performance](https://expressjs.com/en/advanced/best-practice-performance.html), and [error handling](https://expressjs.com/en/guide/error-handling.html) · [Prisma transactions](https://www.prisma.io/docs/orm/prisma-client/queries/transactions) · [The Twelve-Factor App](https://12factor.net/)

**TypeScript:** [strict](https://www.typescriptlang.org/tsconfig/strict.html) · [typescript-eslint configs](https://typescript-eslint.io/users/configs/)

**Security:** [OWASP Top 10:2025](https://top10.owasp.org/2025) · [OWASP API Security Top 10:2023](https://api-security.owasp.org/editions/2023/en/0x11-t10) · OWASP cheat sheets: [Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html), [Authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html), [CSRF](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html), [Logging](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html), [Mass Assignment](https://cheatsheetseries.owasp.org/cheatsheets/Mass_Assignment_Cheat_Sheet.html) · [RFC 8725: JWT Best Current Practices](https://www.rfc-editor.org/rfc/rfc8725.html)

**Frontend:** [Rules of React](https://react.dev/reference/rules) · [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect) · [Choosing the State Structure](https://react.dev/learn/choosing-the-state-structure) · [TanStack Query optimistic updates](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates) · [WCAG 2.2](https://www.w3.org/TR/WCAG22/) and [Dragging Movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)

**Testing and process:** [Testing Trophy — K. C. Dodds](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications) · [Testing Library principles](https://testing-library.com/docs/guiding-principles/) and [query priority](https://testing-library.com/docs/queries/about/#priority) · [Playwright best practices](https://playwright.dev/docs/best-practices) · [Google code review standard](https://google.github.io/eng-practices/review/reviewer/standard.html), [what to look for](https://google.github.io/eng-practices/review/reviewer/looking-for.html), and [small changes](https://google.github.io/eng-practices/review/developer/small-cls.html) · [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
