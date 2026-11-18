# Wireframe 04 — Ticket page

**Status:** ✅ Approved by the owner · 2026-11-18 (the Estimate field still needs the mentor's OK)
**Theme:** light — white main color, dark text, navy accent (see wireframe 01).
**Owner's brief:** show the **description**, **who created the ticket**, and **who it's assigned to**.
**Requirements:** TKT-2 (own URL), TKT-3 (edit), TKT-4 (delete), TKT-5 (assign), CMT-1/2 (comments), ACT-1 (activity), CON-1 (edit conflict).
**URL:** `/projects/WEB/tickets/WEB-12` — opens when you click a card on the board or a row in the list.

---

## A. Ticket page — desktop (view mode)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ▣ Mini-Jira    [ WEB · Website Redesign ▾ ]    My Work          ( DL ▾ ) │
├──────────────────────────────────────────────────────────────────────────┤
│ ← Back to board   WEB / WEB-12              🔗 Copy link  [Edit] [Delete]│ ← Delete: only the
│                                                                          │   creator or owner
│ 🐞 Bug · WEB-12                                                          │
│ Fix login redirect after the session expires                             │ ← title (big)
│                                                                          │
│ ┌──────────────────────────────────────────────┐ ┌─────────────────────┐ │
│ │ Description                                  │ │ Status              │ │
│ │                                              │ │ [● In Progress ▾]   │ │ ← one-click status
│ │ When the session expires and the user clicks │ │                     │ │
│ │ a link, they land on an empty page instead   │ │ Assigned to         │ │ ← who it's
│ │ of the login popup.                          │ │ (DL) Dana Levi      │ │   assigned to
│ │                                              │ │                     │ │
│ │ Steps:                                       │ │ Created by          │ │ ← who made it
│ │ 1. Log in                                    │ │ (AB) Avi Ben        │ │
│ │ 2. Wait 7 days                               │ │                     │ │
│ │ 3. Click any project                         │ │ Priority            │ │
│ │                                              │ │ ▲ High              │ │
│ └──────────────────────────────────────────────┘ │                     │ │
│                                                  │ Type                │ │
│  Comments (2)    Activity                        │ 🐞 Bug              │ │
│  ‾‾‾‾‾‾‾‾‾‾‾‾                                    │                     │ │
│  (AB) Avi Ben · 2 hours ago                      │ Due date            │ │
│  I can reproduce it on Chrome.                   │ 📅 Nov 30, 2026     │ │
│                                                  │                     │ │
│  (DL) Dana Levi · 5 minutes ago (edited)         │ Estimate            │ │ ← how long it
│  Fixed on my branch, ready for review.           │ ⏱ 4h                │ │   should take
│                                  Edit · Delete   │                     │ │ ← Edit/Delete only
│                                                  │ Created  Nov 10     │ │   on my comments
│                                                  │ Updated  5 min ago  │ │
│                                                  └─────────────────────┘ │
│  ┌────────────────────────────────────────────┐                          │
│  │ Write a comment…                           │                          │
│  └────────────────────────────────────────────┘                          │
│                                     ( Comment )                          │
└──────────────────────────────────────────────────────────────────────────┘
```

- **Left:** title, **description** (keeps line breaks), then **Comments / Activity** tabs.
- **Right ("details"):** Status, **Assigned to**, **Created by**, Priority, Type, Due date, Created / Updated.
  - **Status is a dropdown even in view mode**: one click changes it, no Edit needed. It works like moving the card on the board: the ticket goes to the bottom of the new column, there's no conflict check ("last move wins"), and the change is recorded in Activity. A short message confirms it: "Status changed to In Review". If the server rejects it, the dropdown goes back and shows an error.
  - "Assigned to" shows `◌ Unassigned` when nobody has it, plus an **Assign to me** link (TKT-5).
  - Due date is **red** when overdue (past due and not Done).
  - **Estimate** = how long the ticket should take, e.g. `30m`, `4h`, `2d` (1d = 8 working hours). Optional; shows "—" when empty. It's only a guess made up front; time actually spent is not tracked.
- **Edit** opens edit mode (B). **Delete** is only shown to the **creator** of the ticket or the **project owner** (TKT-4).
- **🔗 Copy link** copies the ticket's URL so you can share it (TKT-2).

## B. Edit mode (TKT-3)

```
│ ┌──────────────────────────────────────────────┐ ┌─────────────────────┐ │
│ │ Title                                        │ │ Status              │ │
│ │ [ Fix login redirect after the session exp ] │ │ [ ● In Progress ▾ ] │ │
│ │ 45 / 120                                     │ │                     │ │
│ │                                              │ │ Assigned to         │ │
│ │ Description                                  │ │ [ (DL) Dana Levi ▾ ]│ │ ← project members
│ │ [ When the session expires and the user    ] │ │ Assign to me        │ │   only
│ │ [ clicks a link, they land on an empty     ] │ │                     │ │
│ │ [ page instead of the login popup.         ] │ │ Priority            │ │
│ │ [                                          ] │ │ [ ▲ High ▾ ]        │ │
│ │                                              │ │                     │ │
│ │                                              │ │ Type                │ │
│ │                                              │ │ [ 🐞 Bug ▾ ]        │ │
│ │                                              │ │                     │ │
│ │                                              │ │ Due date            │ │
│ │                                              │ │ [ 📅 Nov 30, 2026 ] │ │
│ │                                              │ │                     │ │
│ │                                              │ │ Estimate            │ │
│ │                                              │ │ [ 4h      ]         │ │ ← e.g. 30m, 4h, 2d
│ └──────────────────────────────────────────────┘ └─────────────────────┘ │
│                                         [Cancel]  ( Save changes )       │ ← navy, disabled
│                                                                          │   while saving
```

- Errors appear **under the field** (e.g. "Title is required", "Title can be at most 120 characters").
- "Created by" can't be changed (it's set automatically).
- Estimate accepts `30m`, `4h`, `2d`, or combinations like `1d 4h`; anything else shows "Use a format like 30m, 4h or 2d". Empty = no estimate.
- If saving fails, nothing you typed is lost.

## C. Someone else changed the ticket (CON-1)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ⚠ This ticket was updated by someone else while you were editing.        │
│   Your changes have NOT been saved. They're still in the form below.     │
│                                                    ( Reload ticket )     │
└──────────────────────────────────────────────────────────────────────────┘
```

- Shown at the top of edit mode after **Save** returns `409`.
- **Reload ticket** loads the newest version (your unsaved changes are dropped, so you can copy them first).

## D. Delete (TKT-4)

```
                  ┌────────────────────────────────────┐
                  │ Delete WEB-12?                     │
                  │                                    │
                  │ This also deletes its comments and │
                  │ history. This can't be undone.     │
                  │                                    │
                  │            [Cancel]  ( Delete )    │ ← red button
                  └────────────────────────────────────┘
```

- After deleting → back to the board, with a short message "WEB-12 deleted".

## E. Comments (CMT-1, CMT-2)

- Oldest at the top, **newest last**; time shown as "5 minutes ago" (hover shows the exact date).
- **Edit · Delete** only on **your own** comments. An edited comment shows **(edited)**.
- Editing a comment turns it into a text box with **Save / Cancel**; deleting asks "Delete this comment?".
- Empty: "No comments yet. Be the first to comment."

## F. Activity tab (ACT-1)

```
  Comments (2)    Activity
                  ‾‾‾‾‾‾‾‾
  (DL) Dana Levi changed Status:    To Do → In Progress       · 1 hour ago
  (AB) Avi Ben   changed Assignee:  Unassigned → Dana Levi    · 2 hours ago
  (AB) Avi Ben   changed Priority:  Medium → High             · 2 hours ago
  (AB) Avi Ben   created the ticket                           · Nov 10
```

- Shows **who**, **what changed (old → new)**, and **when**.
- Status, assignee, and priority changes come from the activity log; the last line ("created the ticket") comes from the ticket's creator and creation date.

## G. Loading and not found

```
 Loading: grey placeholder blocks for the title, description, and details.

 Not found (wrong key, deleted, or you're not a member):
┌──────────────────────────────────────────────────────────────────────────┐
│                         Ticket not found                                  │
│        It may have been deleted, or you don't have access to it.         │
│                         ← Back to My Projects                            │
└──────────────────────────────────────────────────────────────────────────┘
```

## H. Phone width

```
┌──────────────────────┐
│ ▣ [WEB ▾]         ☰  │
├──────────────────────┤
│ ← Board    🔗  ⋯     │ ← ⋯ = Edit / Delete
│ 🐞 Bug · WEB-12      │
│ Fix login redirect   │
│ after the session    │
│ expires              │
│ ──────────────────── │
│ Status   In Progress │ ← details first,
│ Assigned (DL) Dana   │   in a short list
│ Created  (AB) Avi    │
│ Priority ▲ High      │
│ Due      📅 Nov 30   │
│ ──────────────────── │
│ Description          │
│ When the session...  │
│ ──────────────────── │
│ Comments(2) Activity │
│ ...                  │
└──────────────────────┘
```

## Decisions

- Labels use plain words: **"Created by"** (the requirements call it *Reporter*) and **"Assigned to"** (*Assignee*). Proposed in this draft.
- **Quick status dropdown in view mode** (one click, no Edit), using the same move as the board. Decided 2026-11-18.
- **Comments and Activity stay as two tabs.** Decided 2026-11-18.

- **Optional Estimate field** in hours/days (`30m`, `4h`, `2d`; 1d = 8h), shown on the ticket page and the board card. Only a guess, no logging of time spent. Decided 2026-11-18 — **⚠ to confirm with the mentor** at the week-1 review, because "time tracking" is out of scope in the requirements (§6).

## Open questions

None (the Estimate field waits for the mentor's OK).
