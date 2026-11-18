# Wireframe 07 — My Work (swimlanes)

**Status:** ✅ Approved by the owner · 2026-11-18 (swimlane version, picked out of 3 options)
**Theme:** light — white main color, dark text, navy accent; **red** for overdue.
**Purpose:** one place to see **every ticket assigned to me**, across **all my projects**, and where each one stands.
**Requirements:** MY-1 — "grouped by project, overdue tickets highlighted".
**URL:** `/my-work` — the **My Work** link in the top bar.

**Swimlanes** = a mini board per project: **rows are projects** (the grouping MY-1 asks for), **columns are statuses**.

---

## A. My Work — desktop

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ▣ Mini-Jira    [ Projects ▾ ]    My Work                        ( DL ▾ ) │
│                                  ‾‾‾‾‾‾‾                                 │ ← active link
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  My Work                                          [☐ Show done tickets]  │
│  7 tickets assigned to you · 2 overdue                                   │ ← summary
│                                                                          │
│                 │ To Do             │ In Progress       │ In Review      │ ← status columns
│ ────────────────┼───────────────────┼───────────────────┼────────────────┤
│ ▾ [WEB] Website │ ┌───────────────┐ │ ┏━━━━━━━━━━━━━━━┓ │ ┌────────────┐ │
│   Redesign      │ │ ☑ WEB-14      │ │ ┃ 🐞 WEB-9      ┃ │ │ 📘 WEB-3   │ │
│   4 tickets     │ │ Update docs   │ │ ┃ Crash on save ┃ │ │ Onboarding │ │
│                 │ │ ⏫ Crit.   —   │ │ ┃ ▲ High        ┃ │ │ ● Medium   │ │
│                 │ └───────────────┘ │ ┃ ⚠ Nov 15      ┃ │ │ 📅 Dec 2   │ │ ← overdue card:
│                 │                   │ ┗━━━━━━━━━━━━━━━┛ │ └────────────┘ │   thick red border,
│                 │                   │ ┌───────────────┐ │                │   ⚠ + red date
│                 │                   │ │ 🐞 WEB-12     │ │                │
│                 │                   │ │ Fix login red…│ │                │
│                 │                   │ │ ▲ High        │ │                │
│                 │                   │ │ 📅 Nov 30     │ │                │
│                 │                   │ └───────────────┘ │                │
│ ────────────────┼───────────────────┼───────────────────┼────────────────┤
│ ▾ [MOB] Mobile  │ ┏━━━━━━━━━━━━━━━┓ │                   │                │
│   App           │ ┃ 📘 MOB-4      ┃ │                   │                │
│   2 tickets     │ ┃ Push notific… ┃ │                   │                │
│                 │ ┃ ▲ High        ┃ │                   │                │
│                 │ ┃ ⚠ Nov 17      ┃ │                   │                │
│                 │ ┗━━━━━━━━━━━━━━━┛ │                   │                │
│                 │ ┌───────────────┐ │                   │                │
│                 │ │ ☑ MOB-11      │ │                   │                │
│                 │ │ App store sh… │ │                   │                │
│                 │ │ ▼ Low         │ │                   │                │
│                 │ │ 📅 Dec 10     │ │                   │                │
│                 │ └───────────────┘ │                   │                │
│ ────────────────┼───────────────────┼───────────────────┼────────────────┤
│ ▸ [API] Backend │  (folded — click ▸ to open)                            │ ← a folded lane
│   API · 1       │                                                        │
│ ────────────────┴───────────────────┴───────────────────┴────────────────┤
│                            ( Show more )                                 │ ← only if more
└──────────────────────────────────────────────────────────────────────────┘   than 20 tickets
```

- **One row ("lane") per project** that has tickets assigned to me. The lane header shows the key, name, and how many of my tickets it has.
- **Columns:** To Do · In Progress · In Review. **Done** appears as a 4th column only when "Show done tickets" is ticked.
- **Inside a cell:** cards sorted by **due date**, soonest first; no due date last.
- **Fold a lane** with ▾ / ▸ (e.g. a project you don't care about today). Folded lanes still show their count.
- **Click a card** → opens the ticket page (wireframe 04). Projects with none of my tickets don't appear.
- **Show more** loads the next 20 tickets (the list is paginated); new cards slot into their lanes.

## B. Mini card

```
┌───────────────┐      ┏━━━━━━━━━━━━━━━┓
│ 🐞 WEB-12     │      ┃ 🐞 WEB-9      ┃ ← overdue
│ Fix login red…│      ┃ Crash on save ┃
│ ▲ High        │      ┃ ▲ High        ┃
│ 📅 Nov 30     │      ┃ ⚠ Nov 15      ┃ ← red date + ⚠
└───────────────┘      ┗━━━━━━━━━━━━━━━┛
```

- Type icon · key · title (1 line, then "…") · priority · due date.
- No assignee initials — every card here is mine.

## C. Overdue (MY-1)

- **Overdue** = the due date has passed **and** the ticket isn't Done.
- Shown with **3 signals**: thick **red border**, **⚠** icon, **red date** — clear even without seeing colors.
- The summary at the top counts them: "· 2 overdue".

## D. Done tickets

- By default only tickets **still to do** are shown (To Do, In Progress, In Review).
- **☐ Show done tickets** adds a **Done** column; Done cards are **faded**.

## E. Empty, loading, error

```
 Nothing assigned to me:
┌────────────────────────────────────────────────────────────────────┐
│                     Nothing assigned to you                        │
│      Tickets assigned to you in any project will show up here.     │
│                     ( Go to My Projects )                          │
└────────────────────────────────────────────────────────────────────┘

 Loading: the column headers + 2 lanes with grey placeholder cards.
 Error:   ⚠ Couldn't load your tickets.  ( Try again )
```

## F. Phone width

Swimlanes are too wide for a phone, so each lane becomes a **section**, and its statuses are stacked:

```
┌──────────────────────┐
│ ▣  [Projects ▾]   ☰  │
├──────────────────────┤
│ My Work              │
│ 7 tickets · 2 overdue│
│ [☐ Show done]        │
│                      │
│ ▾ [WEB] Website Re… 4│ ← project lane
│   To Do              │ ← status as a small heading
│   ┌────────────────┐ │
│   │ ☑ WEB-14  —    │ │
│   │ Update docs    │ │
│   └────────────────┘ │
│   In Progress        │
│   ┏━━━━━━━━━━━━━━━━┓ │
│   ┃ 🐞 WEB-9 ⚠Nov15┃ │
│   ┃ Crash on save  ┃ │
│   ┗━━━━━━━━━━━━━━━━┛ │
│   ┌────────────────┐ │
│   │ 🐞 WEB-12 Nov30│ │
│   │ Fix login red… │ │
│   └────────────────┘ │
│   In Review          │
│   ...                │
│ ▸ [MOB] Mobile App 2 │
└──────────────────────┘
```

## Decisions

- **Swimlanes:** rows = projects, columns = statuses. Picked by the owner out of 3 versions (project columns, swimlanes, overdue box). Decided 2026-11-18.
- **Overdue shown three ways** (red border, ⚠, red date). Proposed in this draft.
- **Done hidden by default**, shown as a 4th column with "Show done tickets". Proposed in this draft.
- **No drag and drop here** — My Work is for seeing; status is changed on the board or with the ticket page's status dropdown. Proposed in this draft.

## Open questions

None.
