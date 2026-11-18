# Wireframe 03 — Board

**Status:** ✅ Approved by the owner · 2026-11-18
**Theme:** light — white main color, dark text, navy accent (see wireframe 01).
**Requirements:** BRD-1 (columns + cards), BRD-2 (drag between columns), BRD-3 (reorder), BRD-4 (quick filters), TKT-1 (create ticket), TKT-5 (assign).

---

## A. Board — desktop

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ▣ Mini-Jira    [ WEB · Website Redesign ▾ ]    My Work          ( DL ▾ ) │ ← top bar (wireframe 02)
├──────────────────────────────────────────────────────────────────────────┤
│ [WEB] Website Redesign                                                   │ ← project header
│  Board   List   Settings                             ( + Create ticket ) │ ← tabs · navy button
│  ‾‾‾‾‾                                                                   │   (Settings: owner only)
│ [☐ Only my tickets]  [Type ▾]  [Priority ▾]   Clear filters              │ ← quick filters (BRD-4)
├─────────────────┬─────────────────┬─────────────────┬────────────────────┤
│ To Do        12 │ In Progress   4 │ In Review     2 │ Done            30 │ ← column + count
│ ┌─────────────┐ │ ┌─────────────┐ │ ┌─────────────┐ │ ┌────────────────┐ │
│ │ 🐞 WEB-12   │ │ │ 📘 WEB-7    │ │ │ ☑ WEB-5     │ │ │ ☑ WEB-2        │ │
│ │ Fix login   │ │ │ Add search  │ │ │ New logo on │ │ │ Set up repo    │ │
│ │ redirect    │ │ │ to the list │ │ │ the header  │ │ │                │ │
│ │ ▲ High      │ │ │ ● Medium    │ │ │ ▼ Low       │ │ │ ● Medium       │ │
│ │ 📅 Nov 30 DL│ │ │         AB  │ │ │ 📅 Dec 2  DL│ │ │            AB  │ │
│ └─────────────┘ │ └─────────────┘ │ └─────────────┘ │ └────────────────┘ │
│ ┌─────────────┐ │ ┌─────────────┐ │ ┌─────────────┐ │ ┌────────────────┐ │
│ │ ☑ WEB-14    │ │ │ 🐞 WEB-9    │ │ │ 📘 WEB-3    │ │ │ 📘 WEB-1       │ │
│ │ Update docs │ │ │ Crash on    │ │ │ Onboarding  │ │ │ Landing page   │ │
│ │             │ │ │ save        │ │ │ flow        │ │ │                │ │
│ │ ⏫ Critical │ │ │ ▲ High      │ │ │ ● Medium    │ │ │ ▼ Low          │ │
│ │          ◌  │ │ │ 📅 Nov 20 DL│ │ │         AB  │ │ │            DL  │ │
│ └─────────────┘ │ └─────────────┘ │ └─────────────┘ │ └────────────────┘ │
│       ⋮         │                 │                 │        ⋮           │
│ ( Load more )   │                 │                 │ ( Load more )      │ ← only if > 50 cards
└─────────────────┴─────────────────┴─────────────────┴────────────────────┘
```

- **Column header:** status name + **total** number of tickets in that column (with filters on: the filtered number).
- **Click a card** → opens the ticket page `/projects/WEB/tickets/WEB-12` (wireframe 04).
- Columns scroll on their own (vertically) when they have many cards; the header stays visible.
- Each column shows up to **50 cards**; **Load more** loads the next 50 (architecture §9).

## B. Card — close up

```
┌──────────────────────────┐
│ 🐞 WEB-12            ⋯   │ ← type icon · key · menu (D)
│ Fix login redirect after │ ← title, max 2 lines, then "…"
│ the session expires      │
│                          │
│ ▲ High          ⏱ 4h     │ ← priority · estimate
│ 📅 Nov 30            DL  │ ← due date · assignee initials
└──────────────────────────┘
```

| Part | Values |
|---|---|
| Type icon | ☑ Task · 🐞 Bug · 📘 Story |
| Priority | ⏫ Critical · ▲ High · ● Medium · ▼ Low (icon + word, not color only) |
| Due date | 📅 date · **red when overdue** (past due and not Done) · hidden if none |
| Assignee | initials in a circle (`DL`) · `◌` empty dashed circle = unassigned |
| Estimate | ⏱ `30m` / `4h` / `2d` · hidden if none (⚠ waits for the mentor's OK — see wireframe 04) |

## C. Drag and drop (BRD-2, BRD-3)

```
 While dragging:                          Server rejected the move:
┌─────────────────┬─────────────────┐    ┌──────────────────────────────────────┐
│ To Do        11 │ In Progress   5 │    │ ⚠ Couldn't move WEB-12 — it was       │
│                 │ ┌─────────────┐ │    │   deleted by someone else.        [✕] │ ← error message
│ ┌ ─ ─ ─ ─ ─ ─ ┐ │ │ 📘 WEB-7    │ │    └──────────────────────────────────────┘   (bottom corner)
│   (empty slot)  │ └─────────────┘ │      + the card jumps back to its
│ └ ─ ─ ─ ─ ─ ─ ┘ │ ┌═════════════┐ │        original column and position
│                 │ ║ 🐞 WEB-12   ║ │ ← card being dragged
│                 │ ║ Fix login   ║ │   (lifted, with a shadow)
│                 │ └═════════════┘ │
│                 │ ┌ ─ ─ ─ ─ ─ ─ ┐ │ ← where it will land
│                 │ └ ─ ─ ─ ─ ─ ─ ┘ │
└─────────────────┴─────────────────┘
```

- On drop the card moves **immediately** (counts update too); the server is told in the background.
- If the server says no → the card returns to where it was + the error message above.
- Reorder inside a column works the same way; the order is the same for everyone and after refresh.

## D. Card menu ⋯ (move without dragging)

```
┌──────────────────────────┐
│ 🐞 WEB-12            ⋯   │
└──────────────────┬───────┴────────────┐
                   │ Open               │
                   │ Move to          ▸ │──┬───────────────┐
                   │ Move up            │  │ To Do       ✓ │
                   │ Move down          │  │ In Progress   │
                   │ Assign to me       │  │ In Review     │
                   └────────────────────┘  │ Done          │
                                           └───────────────┘
```

- Lets you change status **and reorder cards** with a simple click or tap, with the **keyboard**, or on a **phone**, where dragging is awkward (WCAG 2.5.7).
- **Move up / Move down** move the card one place inside its column. Move up is disabled on the first card, Move down on the last.
- Keyboard drag also works: focus a card → **Space** to pick up → **← → ↑ ↓** to move → **Space** to drop, **Esc** to cancel.

## E. Create ticket popup (TKT-1, TKT-5)

```
                  ┌────────────────────────────────────────┐
                  │ Create ticket in WEB                [✕]│
                  │                                        │
                  │ Title                                  │
                  │ [____________________________________] │
                  │ 0 / 120                                │ ← character counter
                  │                                        │
                  │ Description (optional)                 │
                  │ [____________________________________] │
                  │ [____________________________________] │
                  │                                        │
                  │ Type            Priority               │
                  │ [ ☑ Task ▾ ]    [ ● Medium ▾ ]         │ ← defaults
                  │                                        │
                  │ Assignee        Due date (optional)    │
                  │ [ ◌ Unassigned ▾ ]  [ 📅 Pick date ]   │
                  │ Assign to me                           │ ← shortcut (TKT-5)
                  │                                        │
                  │ Estimate (optional)                    │
                  │ [ e.g. 4h ]   30m · 4h · 2d            │
                  │                                        │
                  │                [Cancel] ( Create )     │ ← navy, disabled while sending
                  └────────────────────────────────────────┘
```

- New tickets start in **To Do**, at the bottom of the column.
- After **Create** → the popup closes, the card appears in To Do, and a short message shows: "**WEB-13** created".

## F. Filters on (BRD-4)

```
│ [☑ Only my tickets]  [Type: Bug ▾]  [Priority ▾]   Clear filters        │
├─────────────────┬─────────────────┬─────────────────┬───────────────────┤
│ To Do         2 │ In Progress   1 │ In Review     0 │ Done            5 │
```

- Active filters are highlighted (navy outline). **Clear filters** shows everything again.
- An empty column with filters on says: "No tickets match the filters".

## G. Empty board, loading, error

```
 Empty board (new project):
┌─────────────────┬─────────────────┬─────────────────┬───────────────────┐
│ To Do         0 │ In Progress   0 │ In Review     0 │ Done            0 │
│                 │                 │                 │                   │
│ No tickets yet. │                 │                 │                   │
│ ( + Create the  │                 │                 │                   │
│   first ticket )│                 │                 │                   │
└─────────────────┴─────────────────┴─────────────────┴───────────────────┘

 Loading: 4 columns with 2–3 grey placeholder cards each.
 Error:   ⚠ Couldn't load the board.  ( Try again )
```

## H. Phone width

```
┌──────────────────────┐
│ ▣ [WEB ▾]         ☰  │
├──────────────────────┤
│ Board  List  Settings│
│ [Filters (1)]    (+) │ ← filters open in a panel · (+) = create ticket
├──────────────────────┤
│ To Do  12 │ In Pro…  │ ← swipe left/right between columns;
│ ┌───────┐ │ ┌──────  │   the next column "peeks" in
│ │🐞WEB-12│ │ │📘WEB-  │
│ │Fix     │ │ │Add     │
│ │login   │ │ │search  │
│ │▲ High  │ │ │● Med   │
│ └───────┘ │ └──────  │
└──────────────────────┘
 Phone: moving a card = the ⋯ menu → "Move to" (drag also works, but is harder).
```

## Decisions

- **Card ⋯ menu with "Move to", "Move up", and "Move down"** as the non-drag way to change status and order (click, tap, and keyboard). Decided 2026-11-18.
- **Settings tab: owner only.** Members don't see it. If a member opens `/projects/WEB/settings` directly, they see "Only the project owner can open settings" with a link back to the board (the API also returns 403 for owner actions). Decided 2026-11-18.

- **Filtered column count shows only the shown number ("2")**; the highlighted filter buttons already show that a filter is on. Decided 2026-11-18.

## Open questions

None.
