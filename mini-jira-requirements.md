# Mini-Jira — Team Task Board

**Assignment type:** Full-stack project (junior level)
**Suggested duration:** ~8 weeks part-time
**Stack:** Angular · Node.js (Express or NestJS) · MongoDB or PostgreSQL (your choice — justify it)

---

## 1. Background

Small teams need a simple way to track work: create tasks, assign them, move them across a board, and discuss them. You will build **Mini-Jira**, a lightweight web app that does exactly that.

This document is a product requirements document — it describes **what** the system must do, not **how**. Breaking it into tasks, designing the system, and choosing the implementation are part of the assignment.

## 2. Learning goals

By the end you should be able to show and explain:

- Breaking product requirements into epics, stories and tasks, and planning sprints
- A basic system design: client, API, database — and why you chose each piece
- Data modeling with relationships (users, projects, tickets, comments)
- REST API design, validation, error handling, authentication and authorization
- A clean, usable UI with proper loading, empty and error states
- Handling real-world backend problems: pagination, concurrency, consistent data
- Testing, containerization, CI and deployment

---

## 3. Users & roles

| Role | Description |
|---|---|
| **Visitor** | Not logged in. Can only register or log in. |
| **Project Owner** | Created the project. Full control over it, including members and deletion. |
| **Project Member** | Added to a project by the owner. Works with tickets inside that project. |

A user can be an owner of some projects and a member of others. Users see **only** projects they belong to.

---

## 4. Functional requirements

Priority: **P0** = MVP (must have) · **P1** = should have · **P2** = stretch

### 4.1 Authentication (P0)

| ID | Story | Acceptance criteria |
|---|---|---|
| AUTH-1 | As a visitor, I can register with name, email and password. | Email is unique and validated. Password min 8 chars. Passwords are never stored in plain text. Clear error on duplicate email. |
| AUTH-2 | As a visitor, I can log in. | Wrong credentials show a generic error (don't reveal whether the email exists). Successful login lands on "My Projects". |
| AUTH-3 | As a user, I can log out. | Session/token is cleared; protected pages redirect to login. |
| AUTH-4 | As a user, my session survives a page refresh. | Refreshing the page does not log me out while the session is valid. |

### 4.2 Projects & members (P0)

| ID | Story | Acceptance criteria |
|---|---|---|
| PRJ-1 | As a user, I can create a project with a name, description and a short **key** (e.g. `WEB`). | Key is 2–6 uppercase letters, unique across the system. Creator becomes Owner. |
| PRJ-2 | As a user, I see a list of projects I belong to. | Shows name, key, my role, open-ticket count. Empty state with a "Create project" call to action. |
| PRJ-3 | As an owner, I can add a member by email. | Only registered users can be added. Clear error if user not found or already a member. |
| PRJ-4 | As an owner, I can remove a member. | Their assigned tickets become unassigned. Owner cannot remove themselves. |
| PRJ-5 | As an owner, I can edit or delete the project. | Delete requires confirmation and removes all its tickets and comments. |
| PRJ-6 | As a non-member, I cannot access a project. | API returns `403`/`404` — never the project data. Verified by tests. |

### 4.3 Tickets (P0)

Each ticket has:

| Field | Notes |
|---|---|
| Key | Auto-generated, sequential per project: `WEB-1`, `WEB-2`, … Never reused. |
| Title | Required, max 120 chars |
| Description | Optional, multi-line text |
| Type | Task / Bug / Story |
| Priority | Low / Medium / High / Critical |
| Status | To Do / In Progress / In Review / Done |
| Assignee | Optional; must be a project member |
| Reporter | The creator; set automatically |
| Due date | Optional |
| Created / updated at | Set automatically |

| ID | Story | Acceptance criteria |
|---|---|---|
| TKT-1 | As a member, I can create a ticket. | Default status "To Do". Key generated correctly even if two users create tickets at the same moment. |
| TKT-2 | As a member, I can view a ticket's full details. | Opens from the board or list; has its own shareable URL (e.g. `/projects/WEB/tickets/WEB-12`). |
| TKT-3 | As a member, I can edit any ticket field. | Validation errors shown next to the relevant field. |
| TKT-4 | As the reporter or project owner, I can delete a ticket. | Confirmation dialog. Others don't see the delete option, and the API rejects it. |
| TKT-5 | As a member, I can assign a ticket to myself or another member. | "Assign to me" shortcut. |

### 4.4 Board view (P0)

| ID | Story | Acceptance criteria |
|---|---|---|
| BRD-1 | As a member, I see the project board with one column per status. | Each card shows key, title, type icon, priority, assignee avatar/initials, due date. Column headers show ticket count. |
| BRD-2 | As a member, I can drag a card between columns to change its status. | UI updates immediately; if the server rejects the change, the card returns to its original column with an error message. |
| BRD-3 | As a member, I can reorder cards within a column. | Order persists after refresh and is the same for all users. |
| BRD-4 | As a member, I can quick-filter the board. | Filter by assignee ("only my tickets"), type, priority. |

### 4.5 Comments & activity (P1)

| ID | Story | Acceptance criteria |
|---|---|---|
| CMT-1 | As a member, I can comment on a ticket. | Shows author, time ("5 minutes ago"), newest last. |
| CMT-2 | As the author, I can edit or delete my comment. | Edited comments are marked "(edited)". |
| ACT-1 | As a member, I see a ticket's activity history. | Records status changes, assignee changes, priority changes: who, what changed (old → new), when. |

### 4.6 List view, search & pagination (P1)

| ID | Story | Acceptance criteria |
|---|---|---|
| LST-1 | As a member, I see all project tickets in a table. | Columns: key, title, type, status, priority, assignee, updated. |
| LST-2 | I can sort by any column. | Sorting happens on the server. |
| LST-3 | I can search by title or key and filter by status/type/priority/assignee. | Filters are reflected in the URL so a filtered view can be shared or bookmarked. |
| LST-4 | Results are paginated. | Page size 20. Works correctly with 1,000+ tickets (seed script required). |

### 4.7 My Work (P1)

| ID | Story | Acceptance criteria |
|---|---|---|
| MY-1 | As a user, I see all tickets assigned to me across all projects. | Grouped by project, overdue tickets highlighted. |

### 4.8 Concurrent edits (P1)

| ID | Story | Acceptance criteria |
|---|---|---|
| CON-1 | If two users edit the same ticket at the same time, the second save must not silently overwrite the first. | The second user gets a clear message ("This ticket was updated by someone else") and can reload. API returns `409 Conflict`. Covered by a test. |

---

## 5. Non-functional requirements

### Security
- Passwords hashed (bcrypt/argon2). Secrets come from environment variables, never committed.
- Every API endpoint checks **authentication** (who are you) and **authorization** (are you allowed to touch this project/ticket).
- All input validated on the server — client-side validation is for UX only.
- Basic protection: rate limit on login, CORS configured, no stack traces in API responses.

### API
- RESTful, resource-based URLs, correct HTTP methods and status codes.
- Documented with **OpenAPI / Swagger**, reachable from the running app.
- One consistent error format across the whole API, for example:
  ```json
  {
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Title is required",
      "details": [{ "field": "title", "message": "Required" }]
    }
  }
  ```

### UI / UX
- Responsive: usable on a laptop and a phone-width screen (board may scroll horizontally on mobile).
- Every data view has **loading**, **empty** and **error** states.
- Destructive actions ask for confirmation.
- Forms: inline validation, disabled submit while saving, no lost input on error.
- Basic accessibility: keyboard navigation, labels on inputs, sufficient contrast.
- Produce simple **wireframes** (Figma, Excalidraw or paper photos) before building screens.

### Performance & data
- List endpoints are paginated — never return an unbounded list.
- Add database indexes for the queries you actually run; be ready to explain each one.
- Provide a **seed script** that creates demo users, projects and 1,000+ tickets.

### Quality & operations
- Lint + formatter configured.
- Tests: unit tests for business logic, API/integration tests for main endpoints, including auth and permission checks.
- `docker compose up` starts the whole system (client, API, DB) locally.
- CI (GitHub Actions): lint, test, build on every pull request.
- Structured logging on the server with a request ID.
- Work through pull requests — even if solo. Small, focused commits.

---

## 6. Out of scope

Don't build these (unless you've finished everything else and pick them as stretch):
email notifications, password reset, file attachments, custom workflows/statuses, sprints, time tracking, OAuth/social login.

---

## 7. Milestones

| Week | Milestone | Deliverables |
|---|---|---|
| 1 | **Planning & design** ⛔ *review with mentor before coding* | Backlog (epics → stories → tasks) in GitHub Projects or Jira · architecture diagram · data model/ERD · API spec draft · wireframes · short design doc (see §8) |
| 2–3 | **Foundations** | Repo + CI + Docker Compose · auth (AUTH-*) · projects & members (PRJ-*) |
| 4–5 | **Core** | Tickets (TKT-*) · board with drag & drop (BRD-*) |
| 6 | **Collaboration** | Comments & activity (CMT-*, ACT-*) · list view, search, pagination (LST-*) · My Work |
| 7 | **Hardening** | Concurrent edits (CON-1) · test coverage on critical paths · UX polish, accessibility pass |
| 8 | **Ship** | Deployed demo · README · 10-minute demo + walkthrough of design decisions |

Each week: a short sync with your mentor — what's done, what's blocked, what's next.

---

## 8. Design doc — questions you must answer

Include these in a short design doc (1–3 pages) during week 1. There is no single right answer; the reasoning is what matters.

1. MongoDB or PostgreSQL? Why, for **this** data model?
2. How do you generate ticket keys (`WEB-13`) so two simultaneous creates never get the same number?
3. How do you store card order within a column so reordering doesn't require updating every ticket?
4. How does the server decide whether a user may access a given ticket? Where does that check live in your code?
5. How do you detect the concurrent-edit conflict in CON-1?
6. JWT in local storage vs. HTTP-only cookie — which did you choose and what are the trade-offs?
7. Is the activity log written in the same operation as the ticket update? What happens if one succeeds and the other fails?
8. Soft delete or hard delete for tickets? Why?

---

## 9. Definition of Done (per story)

- Acceptance criteria met
- Server-side validation and permission checks in place
- Tests added for the main path and at least one failure path
- Loading / empty / error states handled in the UI
- API docs updated
- Merged through a reviewed PR with CI green

---

## 10. Final deliverables

- Public GitHub repository
- README: what it is, screenshots/GIF, architecture diagram, how to run locally, how to run tests, link to live demo
- Design doc (§8)
- Live deployed demo with seeded demo account
- 10-minute demo to your mentor

## 11. How it will be evaluated

| Area | What we look for |
|---|---|
| Planning | Clear, small, well-written stories and tasks; realistic plan; progress tracked |
| Design | Sensible data model, clean API, decisions explained with trade-offs |
| Backend | Correct auth & permissions, validation, error handling, pagination, concurrency |
| Frontend | Usable, consistent UI; proper states; good component structure |
| Quality | Tests on what matters, CI, readable code, good PR hygiene |
| Communication | Can explain *why*, not just *what*; asks for help when blocked |

---

## 12. Stretch goals (P2) — pick any after MVP

- **Real-time board:** other users' changes appear without refresh (WebSockets / SSE)
- **AI assist:** generate a ticket description or summarize a ticket's comment thread using the Claude API — with graceful handling when the AI call fails or is slow
- **Attachments:** upload files to tickets (S3 / MinIO)
- **Kubernetes:** deploy with a Helm chart
- **Labels** and custom columns per project
- **Viewer role:** read-only project access
