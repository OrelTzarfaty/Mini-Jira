# Wireframe 06 — Project settings (owner only)

**Status:** ✅ Approved by the owner · 2026-11-18 (fields: name, description, add-member email, delete confirmation — no extra settings)
**Theme:** light — white main color, dark text, navy accent; **red** only for destructive actions.
**Who sees it:** only the **project owner** (decided in wireframe 03).
**Requirements:** PRJ-3 (add member by email), PRJ-4 (remove member), PRJ-5 (edit / delete project).
**URL:** `/projects/WEB/settings`

---

## A. Settings — desktop

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ▣ Mini-Jira    [ WEB · Website Redesign ▾ ]    My Work          ( DL ▾ ) │
├──────────────────────────────────────────────────────────────────────────┤
│ [WEB] Website Redesign                                                   │
│  Board   List   Settings                                                 │
│                 ‾‾‾‾‾‾‾‾                                                 │
│                                                                          │
│  Project details                                                         │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ Name                                                               │  │
│  │ [ Website Redesign____________________________ ]                   │  │
│  │                                                                    │  │
│  │ Key                                                                │  │
│  │ WEB  🔒 Can't be changed — it's part of every ticket key (WEB-12)   │  │ ← read-only
│  │                                                                    │  │
│  │ Description                                                        │  │
│  │ [ New company website, launch in Q1___________ ]                   │  │
│  │ [ ____________________________________________ ]                   │  │
│  │                                                 ( Save changes )   │  │ ← disabled until
│  └────────────────────────────────────────────────────────────────────┘  │   something changes
│                                                                          │
│  Members (3)                                                             │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ Add a member by email                                              │  │
│  │ [ name@example.com_____________________ ]  ( Add )                 │  │
│  │ ⚠ No Mini-Jira user with this email. They need to register first.  │  │ ← error under
│  │ ────────────────────────────────────────────────────────────────── │  │   the field
│  │ (DL) Dana Levi      dana@example.com      Owner                    │  │ ← no Remove
│  │ (AB) Avi Ben        avi@example.com       Member         Remove    │  │   for the owner
│  │ (NK) Noa Katz       noa@example.com       Member         Remove    │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  Danger zone                                                             │
│  ┌────────────────────────────────────────────────────────────────────┐  │ ← red border
│  │ Delete this project                                                │  │
│  │ Deletes the project with all its tickets, comments, and history.   │  │
│  │ This can't be undone.                          ( Delete project )  │  │ ← red button
│  └────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

## B. Project details (PRJ-5)

- **Name** and **Description** can be edited. **Key** is shown but locked (decided: keys never change).
- **Save changes** is disabled until something changes; while saving it shows a spinner.
- Errors under the field (e.g. "Name is required"). After saving: a short message "Project updated".

## C. Members (PRJ-3, PRJ-4)

**Add a member**
- Type an email → **Add**. On success: the person appears in the list + message "Avi Ben added".
- Errors (under the field, input kept):
  - "No Mini-Jira user with this email. They need to register first." (`404 USER_NOT_FOUND`)
  - "Avi Ben is already a member." (`409 ALREADY_MEMBER`)
  - "Enter a valid email." (bad format)

**Remove a member**

```
                  ┌────────────────────────────────────┐
                  │ Remove Avi Ben from WEB?           │
                  │                                    │
                  │ Tickets assigned to Avi will       │
                  │ become unassigned. Avi will lose   │
                  │ access to this project.            │
                  │                                    │
                  │            [Cancel]  ( Remove )    │ ← red button
                  └────────────────────────────────────┘
```

- The **owner** row has no Remove button (the owner can't remove themselves).
- After removing: the row disappears + message "Avi Ben removed".

## D. Delete project (PRJ-5)

```
                  ┌────────────────────────────────────────┐
                  │ Delete project WEB?                    │
                  │                                        │
                  │ This permanently deletes the project,  │
                  │ its 48 tickets, and all comments and   │
                  │ history. This can't be undone.         │
                  │                                        │
                  │ Type WEB to confirm                    │
                  │ [ ______ ]                             │ ← must match the key
                  │                                        │
                  │            [Cancel]  ( Delete project )│ ← red, disabled until
                  └────────────────────────────────────────┘   "WEB" is typed
```

- Typing the key is an extra safety step for the most destructive action in the app.
- After deleting → go to **My Projects** + message "Project WEB deleted".

## E. A member opens the settings URL

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [WEB] Website Redesign                                                   │
│  Board   List                                                            │ ← no Settings tab
│                                                                          │
│              Only the project owner can open settings.                   │
│                          ← Back to the board                             │
└──────────────────────────────────────────────────────────────────────────┘
```

## F. Loading and error

```
 Loading: grey placeholder blocks for each section.
 Error:   ⚠ Couldn't load the project settings.  ( Try again )
```

## G. Phone width

```
┌──────────────────────┐
│ ▣ [WEB ▾]         ☰  │
├──────────────────────┤
│ Board  List  Settings│
│                      │
│ Project details      │
│ Name                 │
│ [Website Redesign  ] │
│ Key  WEB 🔒          │
│ Description          │
│ [New company web…  ] │
│ ( Save changes )     │
│ ──────────────────── │
│ Members (3)          │
│ [email…    ] (Add)   │
│ (DL) Dana Levi       │
│      Owner           │
│ (AB) Avi Ben         │
│      Member   Remove │
│ ──────────────────── │
│ Danger zone          │
│ ( Delete project )   │
└──────────────────────┘
```

## Decisions

- **Typing the project key to confirm deletion.** Proposed in this draft.
- **Project ticket count** shown in the delete dialog ("its 48 tickets") so the owner knows what will be lost. Proposed in this draft.

## Open questions

None.
