# Wireframe 05 — List view

**Status:** ✅ Approved by the owner · 2026-11-18
**Theme:** light — white main color, dark text, navy accent (see wireframe 01).
**Purpose:** the **Board** is for daily work; the **List** is for **finding** tickets — search, sort, filter, and pages.
**Requirements:** LST-1 (table), LST-2 (sort on the server), LST-3 (search + filters in the URL), LST-4 (pages of 20, works with 1,000+ tickets).
**URL:** `/projects/WEB/list` — the same tab bar as the board.

---

## A. List view — desktop

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ▣ Mini-Jira    [ WEB · Website Redesign ▾ ]    My Work          ( DL ▾ ) │
├──────────────────────────────────────────────────────────────────────────┤
│ [WEB] Website Redesign                                                   │
│  Board   List   Settings                             ( + Create ticket ) │
│          ‾‾‾‾                                                            │
│ 🔍 [ Search by title or key…  ]  [Status ▾] [Type ▾] [Priority ▾]        │
│                                  [Assignee ▾]   Clear filters            │
├────────┬───────────────────────────┬──────┬─────────────┬──────────┬─────┬────────────┤
│ Key    │ Title                     │ Type │ Status      │ Priority │ To  │ Updated ▼  │ ← click a title
├────────┼───────────────────────────┼──────┼─────────────┼──────────┼─────┼────────────┤   to sort
│ WEB-12 │ Fix login redirect after… │ 🐞   │ In Progress │ ▲ High   │ DL  │ 5 min ago  │
│ WEB-41 │ Add dark mode toggle      │ 📘   │ To Do       │ ▼ Low    │ ◌   │ 1 hour ago │
│ WEB-7  │ Add search to the list    │ 📘   │ In Review   │ ● Medium │ AB  │ 3 hours ago│
│ WEB-31 │ Login button too big on…  │ 🐞   │ To Do       │ ⏫ Crit. │ DL  │ Yesterday  │
│ WEB-2  │ Set up repo               │ ☑    │ Done        │ ● Medium │ AB  │ Nov 10     │
│  …     │ …                         │      │             │          │     │            │
├────────┴───────────────────────────┴──────┴─────────────┴──────────┴─────┴────────────┤
│ Showing 1–20 of 1,042                    ‹ Prev   1  2  3  …  53   Next ›            │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

- **Columns** (LST-1): Key · Title · Type · Status · Priority · Assigned to ("To") · Updated.
- **Click a row** → opens the ticket page (wireframe 04).
- **Default order:** most recently updated first (`Updated ▼`).

## B. Sorting (LST-2)

```
│ Key    │ Title ▲                   │ Type │ Status      │ ...
          ‾‾‾‾‾‾‾
  1st click = A → Z (▲)    2nd click = Z → A (▼)    one column at a time
```

- Sorting is done **on the server**, so it's correct across all pages (not just the 20 you see).
- The sorted column shows ▲ or ▼; screen readers hear "sorted ascending/descending".

## C. Search and filters (LST-3)

```
│ 🔍 [ login            ✕ ]  [Status: 2 ▾]  [Type: Bug ▾]  [Priority ▾]     │
│                           [Assignee: Me ▾]   Clear filters               │
                                 │
                   ┌─────────────┴────────┐
                   │ ☑ To Do              │ ← tick one or more
                   │ ☑ In Progress        │
                   │ ☐ In Review          │
                   │ ☐ Done               │
                   └──────────────────────┘
```

- **Search** looks in the **title** and the **key** (typing `WEB-12` finds that ticket). It waits until you stop typing for a moment.
- **Filters:** Status, Type, Priority, Assigned to (`Me`, `Unassigned`, or any member). Each filter can have **one or more** values ticked.
- Active filters show their value on the button and get a navy outline. **Clear filters** resets everything.
- Changing search, a filter, or the sort goes back to **page 1**.

### Filters live in the URL

```
/projects/WEB/list?q=login&status=TODO,IN_PROGRESS&type=BUG&assignee=me&sort=updated&order=desc&page=2
```

- Copy the link → a teammate sees **exactly the same** list. Bookmark it, refresh it — nothing is lost.
- Browser **Back** undoes the last filter change.

## D. Pages (LST-4)

```
│ Showing 21–40 of 1,042                ‹ Prev   1  [2]  3  …  53   Next ›   │
```

- **20 tickets per page.** The current page is highlighted; `…` skips the middle pages.
- "Showing 21–40 of 1,042" tells you where you are and how many tickets match.
- Moving to another page scrolls back to the top of the table.

## E. Empty, no results, loading, error

```
 New project, no tickets at all:            Filters/search match nothing:
┌────────────────────────────────────┐     ┌────────────────────────────────────┐
│ No tickets yet.                    │     │ No tickets match your search or    │
│ ( + Create the first ticket )      │     │ filters.        ( Clear filters )  │
└────────────────────────────────────┘     └────────────────────────────────────┘

 Loading: the table header + 8 grey placeholder rows.
 Error:   ⚠ Couldn't load the tickets.  ( Try again )
```

## F. Phone width

```
┌──────────────────────┐
│ ▣ [WEB ▾]         ☰  │
├──────────────────────┤
│ Board  List  Settings│
│ 🔍 [Search…       ]  │
│ [Filters (2)] [Sort ▾]│ ← filters open in a panel;
├──────────────────────┤   sort is a dropdown
│ WEB-12  🐞  ▲ High   │
│ Fix login redirect   │ ← each row becomes
│ In Progress   DL · 5m│   a small block
├──────────────────────┤
│ WEB-41  📘  ▼ Low    │
│ Add dark mode toggle │
│ To Do          ◌ · 1h│
├──────────────────────┤
│ 1–20 of 1,042        │
│ ‹ Prev       Next ›  │
└──────────────────────┘
```

## Decisions

- **Board for daily work, List for finding tickets** — both kept (LST-1…4 are required). Decided 2026-11-18.
- **Default sort:** most recently updated first. Proposed in this draft.
- **Multi-choice filters** (e.g. Status = To Do **and** In Progress). Proposed in this draft.

## Open questions

None.
