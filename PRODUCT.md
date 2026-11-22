# Product

<!-- impeccable:product-schema 1 -->

> Written by `/impeccable init` on 2026-11-19 (SETUP-6) while the owner was away. Every fact
> below is taken from a document the owner wrote or approved, named in brackets after it. Nothing
> was invented. The owner confirms or corrects this file when reviewing SETUP-6.

## Platform

web

## Users

- **Small teams** that need a simple way to track work: create tasks, assign them, move them
  across a board, and discuss them. [requirements §1]
- **Project owners** create a project and have full control over it, including members and
  deletion. **Project members** are added by the owner and work with the tickets inside it. One
  person can own some projects and be a member of others. [requirements §3]
- **Visitors** aren't logged in and can only register or log in. [requirements §3]
- The everyday job is moving tickets forward on the board; the list view is for finding tickets.
  [wireframe 05, decision "Board for daily work, List for finding tickets"]

## Product Purpose

Mini-Jira is a lightweight team task board: projects, members, tickets (Task, Bug, Story), a
drag-and-drop board with four statuses (To Do, In Progress, In Review, Done), comments, and
activity history. [requirements §1, design doc §1]

It is also a junior full-stack learning project (about 8 weeks). Success is a working, deployed
demo that the owner can explain and defend in a 10-minute walkthrough with a mentor, judged on
planning, design, backend, frontend, quality, and communication. [CLAUDE.md, requirements §7,
§10, §11]

## Positioning

"Projects, tickets and a drag-and-drop board. Simple enough for small teams." Mini-Jira is
deliberately smaller than the tools it is named after: no sprints, custom workflows, or time
tracking. [wireframe 01 landing copy, requirements §6]

## Operating Context

- Used in a web browser on a laptop or at phone width; the board may scroll sideways on a phone.
  [requirements §5 UI/UX]
- Users see only the projects they belong to. Each project has one owner and its members.
  [requirements §3, PRJ-6]
- Every ticket has a key such as `WEB-12` and its own shareable URL. List filters live in the URL
  so a view can be shared or bookmarked. [TKT-2, LST-3]
- Two people can edit the same ticket at once; the second save is stopped with a clear message
  instead of overwriting the first. [CON-1]
- The demo runs on seeded demo accounts with 1,000+ tickets. [requirements §5, §10]

## Capabilities and Constraints

- In scope: register, log in and out (AUTH-1..4); projects and members (PRJ-1..6); tickets
  (TKT-1..5); the board with drag and drop and filters (BRD-1..4); comments and activity
  (CMT-1..2, ACT-1); the list with search, sort, and pages of 20 (LST-1..4); My Work (MY-1);
  edit conflicts (CON-1). [requirements §4]
- Out of scope: email, password reset, attachments, OAuth, sprints, time tracking, custom
  workflows or statuses. [requirements §6, CLAUDE.md]
- The UI uses plain words: "Created by" (the requirements' Reporter), "Assigned to" (Assignee),
  "Estimate". [wireframes README]
- Every data view has loading, empty, and error states. Destructive actions ask for
  confirmation; deleting a project also asks the user to type its key. Forms validate inline,
  disable submit while saving, and never lose input on an error. [requirements §5, wireframes
  README]
- Undecided: the optional ticket **Estimate** (`30m` / `4h` / `2d`) waits for the mentor's OK,
  because time tracking is out of scope. [CLAUDE.md, wireframe 04]
- Undecided: the deployment target (chosen in week 8). [CLAUDE.md]

## Brand Commitments

- The name is **Mini-Jira**, written with a logo mark: "▣ Mini-Jira". [wireframes 01, 02]
- A **light theme: white is the main color of the whole app**, with dark text. [wireframe 01,
  decided 2026-11-18]
- A **navy accent taken from the hoodie in the hero photo**, for primary buttons, active items
  and filters, and "Owner" labels. [wireframes 01, 02, 03, README]
- **Red only** for destructive actions and overdue dates. [wireframes README, 06, 07]
- **Never color alone:** priority, status, and overdue always add an icon and a word.
  [wireframes README, 03, 07]
- The hero photo appears **only on the landing page**, on one screen with no extra sections.
  [wireframe 01, decided 2026-11-18]

## Evidence on Hand

- `docs/wireframes/assets/hero-day-desk.webp`: the landing page photo (1774×887), AI-generated
  with ChatGPT by the owner; the README credits it as "Hero image generated with ChatGPT".
  [wireframe 01]
- Approved wireframes for all seven screens in `docs/wireframes/`. [wireframes README]
- There are no real customers, testimonials, usage numbers, or press. Don't invent any. The only
  data is the seed script's demo data. [requirements §5, §10]

## Product Principles

1. **Simple enough for small teams.** Add nothing the requirements don't ask for; plain words
   over tracker jargon. [wireframe 01, requirements §6, wireframes README]
2. **Never lose someone's work.** Forms keep input on errors, and an edit conflict is reported,
   never silently overwritten. [requirements §5, CON-1]
3. **Show people only what they may do.** Non-members never see a project; Delete and Settings
   appear only for those allowed. [PRJ-6, TKT-4, wireframe 03]
4. **Feedback first, honest rollback.** A board move shows at once; if the server rejects it, the
   card goes back with a clear message. [BRD-2]
5. **Every state is designed.** Loading, empty, and error states exist for every data view.
   [requirements §5]

## Accessibility & Inclusion

- WCAG 2.2 AA: keyboard use with a visible focus, labels on every input, 4.5:1 text contrast and
  3:1 for controls, targets of at least 24×24 px, and respect for reduced motion.
  [docs/engineering-standards.md §9]
- Every drag has a click or tap alternative: the card's `⋯` menu with Move to, Move up, and Move
  down (WCAG 2.5.7). [wireframe 03, CLAUDE.md]
