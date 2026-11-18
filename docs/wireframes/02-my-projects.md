# Wireframe 02 — My Projects page + project dropdown

**Status:** ✅ Approved by the owner · 2026-11-18
**Theme:** light — white main color, dark text, navy accent (see wireframe 01).
**Requirements:** PRJ-1 (create project), PRJ-2 (my projects list), AUTH-2 (login lands on My Projects), AUTH-3 (log out in the navigation).

Two parts that work together:
- **My Projects page** — the home screen after login; required by AUTH-2 and PRJ-2.
- **Project dropdown** in the top bar — quick switching between projects from any screen (extra, owner's choice).

---

## A. Top bar (on every screen after login)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ▣ Mini-Jira    [ Projects ▾ ]    My Work                        ( DL ▾ ) │
└──────────────────────────────────────────────────────────────────────────┘
   logo → My Projects   project dropdown (E)   link      user menu (F) ┘
```

- Inside a project, the dropdown shows the current project: `[ WEB · Website Redesign ▾ ]`.
- White bar, dark text, thin grey line under it.

## B. My Projects page — desktop

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ▣ Mini-Jira    [ Projects ▾ ]    My Work                        ( DL ▾ ) │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  My Projects                                       ( + Create project )  │ ← navy button
│                                                                          │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌────────────────┐  │
│  │ [WEB]                │  │ [MOB]                │  │ [API]          │  │ ← key badge
│  │ Website Redesign     │  │ Mobile App           │  │ Backend API    │  │ ← name
│  │                      │  │                      │  │                │  │
│  │ Owner     12 open    │  │ Member     4 open    │  │ Member  0 open │  │ ← my role +
│  └──────────────────────┘  └──────────────────────┘  └────────────────┘  │   open tickets
│  ┌──────────────────────┐  ┌──────────────────────┐                      │
│  │ [DOC]                │  │ [OPS]                │                      │
│  │ Documentation        │  │ Operations           │                      │
│  │                      │  │                      │                      │
│  │ Member     7 open    │  │ Owner      1 open    │                      │
│  └──────────────────────┘  └──────────────────────┘                      │
│                                                                          │
│                            ( Show more )                                 │ ← only if > 20 projects
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

- **Click a card** → opens that project's **board**.
- Cards in a grid: 3 per row on desktop, 2 on tablet, 1 on phone.
- **Owner** and **Member** look different (e.g. Owner in navy text, Member in grey) so you can tell them apart at a glance.
- "Open" = tickets that are not Done.
- The list is paginated (20 per page): **Show more** loads the next 20.

## C. Empty state (new user, no projects)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ▣ Mini-Jira    [ Projects ▾ ]    My Work                        ( DL ▾ ) │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  My Projects                                                             │
│                                                                          │
│                         ┌──────────────┐                                 │
│                         │   (simple    │                                 │
│                         │    icon)     │                                 │
│                         └──────────────┘                                 │
│                       No projects yet                                    │
│          Create a project to start tracking your team's work,            │
│          or ask a project owner to add you by email.                     │
│                                                                          │
│                       ( + Create project )                               │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

## D. Create project popup

```
                  ┌────────────────────────────────────┐
                  │ Create project                  [✕]│
                  │                                    │
                  │ Name                               │
                  │ [ Website Redesign_______________] │
                  │                                    │
                  │ Key                                │
                  │ [ WEB____ ]                        │ ← letters only, turns UPPERCASE
                  │ 2–6 letters. Used in ticket keys   │   as you type
                  │ like WEB-12. Can't be changed later│ ← hint (key is permanent)
                  │ ⚠ This key is already taken        │ ← error under the field
                  │                                    │
                  │ Description (optional)             │
                  │ [________________________________] │
                  │ [________________________________] │
                  │                                    │
                  │            [Cancel] ( Create )     │ ← navy, disabled while sending
                  └────────────────────────────────────┘
```

- After **Create** → go straight to the new project's **board**.
- **The key is suggested from the name** while you type the name, and the user can still change it:
  - 2+ words → first letter of each word, up to 6: "Website Redesign" → `WR`, "Mobile App Backend" → `MAB`
  - 1 word → first 3 letters: "Documentation" → `DOC`
  - Only letters A–Z are used; once the user edits the key by hand, it stops following the name.

## E. Project dropdown (top bar)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ▣ Mini-Jira    [ WEB · Website Redesign ▾ ]    My Work          ( DL ▾ ) │
└───────────────┬─────────────────────────────────┬────────────────────────┘
                │ 🔍 Search projects               │ ← filters as you type
                │ ─────────────────────────────────│
                │ ✓ [WEB] Website Redesign   Owner │ ← ✓ = the project you're in
                │   [MOB] Mobile App        Member │
                │   [API] Backend API       Member │
                │   [DOC] Documentation     Member │
                │   [OPS] Operations         Owner │
                │ ─────────────────────────────────│
                │ View all projects →              │ ← opens My Projects page
                │ + Create project                 │ ← opens the popup (D)
                └──────────────────────────────────┘
```

- Click a project → opens its board (stays on the same tab: Board or List).
- Shows up to 8 projects; search finds the rest.
- Keyboard: ↑ ↓ to move, **Enter** to open, **Esc** to close.
- No projects yet → the dropdown shows only "+ Create project".

## F. User menu (top right)

```
                                                    ┌──────────────────────┐
                                                    │ Dana Levi            │
                                                    │ dana@example.com     │
                                                    │ ──────────────────── │
                                                    │ Log out              │ ← AUTH-3
                                                    └──────────────────────┘
```

## G. Loading and error states

```
 Loading (grey placeholder cards):      Error:
 ┌──────────────┐ ┌──────────────┐      ┌──────────────────────────────────┐
 │ ▒▒▒▒         │ │ ▒▒▒▒         │      │ ⚠ Couldn't load your projects.   │
 │ ▒▒▒▒▒▒▒▒▒▒   │ │ ▒▒▒▒▒▒▒▒▒▒   │      │              ( Try again )       │
 │ ▒▒▒   ▒▒▒▒   │ │ ▒▒▒   ▒▒▒▒   │      └──────────────────────────────────┘
 └──────────────┘ └──────────────┘
```

## H. Phone width

```
┌──────────────────────┐        ┌──────────────────────┐
│ ▣  [Projects ▾]   ☰  │        │ ▣  [Projects ▾]   ✕  │
├──────────────────────┤        ├──────────────────────┤
│ My Projects      (+) │        │ My Work              │ ← ☰ opens a menu with
│ ┌──────────────────┐ │        │ ──────────────────── │   My Work and the
│ │ [WEB]            │ │        │ Dana Levi            │   user menu
│ │ Website Redesign │ │        │ dana@example.com     │
│ │ Owner    12 open │ │        │ Log out              │
│ └──────────────────┘ │        │                      │
│ ┌──────────────────┐ │        │                      │
│ │ [MOB]            │ │        │                      │
│ │ Mobile App       │ │        │                      │
│ │ Member    4 open │ │        │                      │
│ └──────────────────┘ │        │                      │
└──────────────────────┘        └──────────────────────┘
 Phone: one card per row; "+ Create project" becomes a small (+) button.
```

## Decisions

- **Both a My Projects page and a project dropdown.** The page is the landing spot after login (AUTH-2) and holds the empty state (PRJ-2); the dropdown is for fast switching. Decided 2026-11-18.
- **Cards** (not a table) for the projects list. Decided 2026-11-18.
- **Key suggested from the name** (rules in D), editable by the user. Decided 2026-11-18.

## Open questions

None.
