# Mini-Jira — Wireframes

Simple sketches of every screen: **what is on each screen and where it goes** (no final colors or fonts). Built from [the requirements](../../mini-jira-requirements.md) and the owner's descriptions, and approved by the owner on 2026-11-18. The frontend follows these when building UI.

## Screens

| # | Screen | URL | Requirements | Status |
|---|---|---|---|---|
| 1 | [Landing page + Log in / Register popups](01-landing-and-login.md) | `/`, `/login`, `/register` | AUTH-1, AUTH-2 | ✅ Approved |
| 2 | [My Projects + project dropdown](02-my-projects.md) | `/projects` | PRJ-1, PRJ-2, AUTH-3 | ✅ Approved |
| 3 | [Board](03-board.md) | `/projects/:key/board` | BRD-1…4, TKT-1, TKT-5 | ✅ Approved |
| 4 | [Ticket page](04-ticket.md) | `/projects/:key/tickets/:ticketKey` | TKT-2…5, CMT-1/2, ACT-1, CON-1 | ✅ Approved |
| 5 | [List view](05-list.md) | `/projects/:key/list` | LST-1…4 | ✅ Approved |
| 6 | [Project settings](06-settings.md) (owner only) | `/projects/:key/settings` | PRJ-3, PRJ-4, PRJ-5 | ✅ Approved |
| 7 | [My Work](07-my-work.md) (swimlanes) | `/my-work` | MY-1 | ✅ Approved |

## Design rules for every screen

- **Light theme:** white is the main color, dark text, **navy** accent (buttons, active items). **Red** only for destructive actions and overdue.
- **Every data view** has loading, empty, and error states (all drawn).
- **Destructive actions** ask for confirmation; deleting a project also requires typing its key.
- **Phone width** is drawn for every screen.
- **Plain words** in the UI: "Created by" (Reporter), "Assigned to" (Assignee), "Estimate".
- **Status never shown by color alone**: icons and words too (priority ▲ High, overdue ⚠ + red).

## Owner decisions made during the wireframes

| Decision | Screen |
|---|---|
| Log in / Register as popups on a landing page; email + password only (no Google — out of scope) | 1 |
| Hero photo (AI-generated with ChatGPT), used only on the landing page; one screen, no extra sections | 1 |
| White main color for the whole app | 1 |
| My Projects page (cards) **and** a project dropdown in the top bar; key suggested from the name | 2 |
| Settings tab for the owner only | 3 |
| Card `⋯` menu: Move to, Move up, Move down, so every drag also works with a click or tap | 3 |
| Filtered column count shows just "2" | 3 |
| One-click status dropdown on the ticket page; Comments and Activity as two tabs | 4 |
| Optional **Estimate** field (`30m` / `4h` / `2d`) — **⚠ needs the mentor's OK** (time tracking is out of scope) | 3, 4 |
| Board for daily work, List for finding tickets (both kept) | 5 |
| Settings fields: name, description, add-member email, delete confirmation — nothing extra | 6 |
| My Work as swimlanes (rows = projects, columns = statuses) | 7 |

## Files

- `assets/hero-day-desk.webp` — the landing page photo (1774×887, 162 KB).
